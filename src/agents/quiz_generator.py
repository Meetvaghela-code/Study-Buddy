"""
src/agents/quiz_generator.py

The Quiz Generator agent.

Responsibilities:
  1. Generate quiz questions based on the explained topic
  2. Present questions to the user interactively via input()
  3. Grade each answer using the LLM as judge
  4. Return a QuizResult with score and identified weak areas

The same generate_questions and grade_answer functions are also reused
by the A2A service wrapper in src/a2a_services/quiz_service.py. The core
logic is identical in both modes; only the input/output mechanism changes
(terminal vs HTTP).

Architecture pattern:
  Two separate LLM calls with different purposes:
    - Generation call: creative, higher temperature, produces questions
    - Grading call: analytical, very low temperature, produces scores
  Separating these prevents the grader from being influenced by
  the generator's style or vice versa.
"""

import json
import os
import re
from datetime import datetime, timezone

from langchain_core.messages import HumanMessage, SystemMessage

from agents.llm_utils import create_llm, invoke_llm
from graph.state import QuizQuestion, QuizResult, get_current_topic


# ─────────────────────────────────────────────────────────────────────────────
# Question generation
# ─────────────────────────────────────────────────────────────────────────────

GENERATION_PROMPT = """You are a quiz designer for a student learning.

Given a topic and explanation, generate {n} quiz questions that test
genuine understanding, not just the ability to repeat memorized phrases.

Good questions are specific to THIS topic and explanation. They may require
the student to:
  - Apply a concept to a new situation
  - Explain WHY something works, not just WHAT it does
  - Identify edge cases or common mistakes
  - Compare related concepts
  - Predict code output when the topic includes programming syntax
  - Choose the safest or most accurate design/usage decision

Return ONLY valid JSON with no prose or markdown:
{{
  "questions": [
    {{
      "question": "Clear, specific choose-the-best-answer question text ending with ?",
      "options": [
        {{"id": "A", "text": "First option"}},
        {{"id": "B", "text": "Second option"}},
        {{"id": "C", "text": "Third option"}},
        {{"id": "D", "text": "Fourth option"}}
      ],
      "correct_option_ids": ["A"],
      "expected_answer": "Explain why the correct option or options are best in 1-3 sentences",
      "difficulty": "easy|medium|hard"
    }}
  ]
}}

Rules:
  - Do NOT ask generic questions like "What is the main idea/concept of this topic?"
  - Do NOT reuse the same question template for every topic
  - Make every question name a concrete detail from the explanation
  - Mix question styles when possible: theory, scenario, debugging, code/output, best practice
  - Include at least one question about a common mistake or gotcha when the explanation mentions one
  - Each question must have exactly 4 options with ids A, B, C, D
  - One or more options may be correct
  - correct_option_ids must contain every correct option id
  - expected_answer should be concise but complete
  - Base questions on the explanation provided
  - Avoid yes/no questions
"""

GRADING_PROMPT = """You are a fair teacher grading a student's answer.

Question: {question}
Model answer: {expected_answer}
Student's answer: {student_answer}

Grade the student's answer honestly. Be generous with partial credit:
  - Fundamentally correct with minor gaps: 0.7-0.9
  - Correct concept but imprecise: 0.5-0.7
  - Partially correct: 0.3-0.5
  - Fundamentally wrong: 0.0-0.2

Return ONLY valid JSON with no prose or markdown:
{{
  "correct": true,
  "score": 0.85,
  "feedback": "One specific sentence of feedback",
  "missing_concept": "Key concept missed, or empty string if answer is correct"
}}
"""

OPTION_IDS = ["A", "B", "C", "D"]
GENERIC_QUESTION_MARKERS = [
    "main idea",
    "main concept",
    "core concept",
    "best captures",
    "what is the topic",
]


def compact_text(text: str, limit: int = 180) -> str:
    """Collapse markdown-ish text into a short UI-safe sentence."""
    cleaned_lines = []
    in_code = False
    for raw_line in str(text).splitlines():
        line = raw_line.strip()
        if line.startswith("```"):
            in_code = not in_code
            continue
        if in_code or not line:
            continue
        line = line.lstrip("#- ").strip()
        if line:
            cleaned_lines.append(line)
    cleaned = " ".join(cleaned_lines) or str(text).strip()
    first_sentence = cleaned.split(". ")[0].strip()
    if first_sentence and len(first_sentence) < limit:
        cleaned = first_sentence + ("" if first_sentence.endswith(".") else ".")
    if len(cleaned) > limit:
        cleaned = cleaned[: limit - 3].rstrip() + "..."
    return cleaned


def extract_key_terms(topic: str, explanation: str) -> list[str]:
    """Pull likely assessable terms from markdown headings, bold labels, and code."""
    candidates: list[str] = []
    candidates.extend(re.findall(r"\*\*([^*]{3,60})\*\*", explanation))
    candidates.extend(re.findall(r"^#{2,4}\s+(.{3,60})$", explanation, flags=re.MULTILINE))
    candidates.extend(re.findall(r"`([A-Za-z_][A-Za-z0-9_\[\].()]{2,40})`", explanation))

    for phrase in [
        "JVM", "Java Virtual Machine", "platform-independent",
        "garbage collection", "thread safety", "bytecode",
        "encapsulation", "inheritance", "polymorphism",
    ]:
        if phrase.lower() in explanation.lower():
            candidates.append(phrase)

    seen = set()
    terms = []
    for raw in [topic, *candidates]:
        term = compact_text(raw, limit=60).strip(" .:")
        key = term.lower()
        if len(term) >= 3 and key not in seen:
            seen.add(key)
            terms.append(term)
    return terms[:6]


def choose_question_count(topic: str, explanation: str = "") -> int:
    """Pick a small adaptive quiz size from topic/explanation complexity."""
    combined = f"{topic} {explanation}".lower()
    word_count = len(combined.split())
    has_code = "```" in explanation or any(token in combined for token in [
        "class ", "def ", "function", "public static", "return ", "import ",
    ])
    has_many_sections = explanation.count("###") >= 3 or explanation.count("- **") >= 4
    has_mistakes = any(token in combined for token in ["mistake", "gotcha", "pitfall", "watch out", "error"])

    if has_code or has_many_sections or word_count > 450:
        return 4
    if has_mistakes or word_count > 180:
        return 3
    return 2


def fallback_questions(topic: str, explanation: str = "", n: int | None = None) -> list[dict]:
    """Return varied, topic-specific multiple-choice questions if the LLM fails."""
    answer = compact_text(
        explanation or f"{topic} is explained in this lesson.",
        limit=260,
    )
    count = max(2, min(4, n or choose_question_count(topic, explanation)))
    has_code = "```" in explanation or any(token in explanation.lower() for token in ["class ", "def ", "function", "return ", "public static"])
    terms = extract_key_terms(topic, explanation)
    primary = terms[1] if len(terms) > 1 else topic
    secondary = terms[2] if len(terms) > 2 else topic
    pool = [
        {
            "question": f"In {topic}, why does {primary} matter?",
            "options": [
                {"id": "A", "text": f"It changes how you should understand or apply {topic} in practice."},
                {"id": "B", "text": "It only changes the spelling of the topic title."},
                {"id": "C", "text": "It is unrelated to the lesson explanation."},
                {"id": "D", "text": "It matters only because it appears first alphabetically."},
            ],
            "correct_option_ids": ["A"],
            "expected_answer": f"{primary} matters because it is part of how {topic} works in the lesson. {answer}",
            "difficulty": "medium",
        },
        {
            "question": f"Which statement about {secondary} in {topic} is the safest interpretation?",
            "options": [
                {"id": "A", "text": f"It should be interpreted using the explanation's example and constraints."},
                {"id": "B", "text": "It can be ignored because details never affect quiz answers."},
                {"id": "C", "text": "It means the same thing in every possible technical context."},
                {"id": "D", "text": "It is correct only when it is the longest answer choice."},
            ],
            "correct_option_ids": ["A"],
            "expected_answer": f"The safest answer uses how {secondary} is explained in this lesson, not a vague memorized phrase.",
            "difficulty": "medium",
        },
        {
            "question": f"In a practical use of {topic}, which answer pattern is strongest?",
            "options": [
                {"id": "A", "text": "It connects the definition, a concrete example, and the reason the choice works."},
                {"id": "B", "text": "It gives a memorized phrase with no example."},
                {"id": "C", "text": "It ignores constraints from the scenario."},
                {"id": "D", "text": "It chooses the longest option automatically."},
            ],
            "correct_option_ids": ["A"],
            "expected_answer": f"Strong answers about {topic} connect the concept to a specific scenario and explain why it works.",
            "difficulty": "hard",
        },
        {
            "question": f"If a code example for {topic} behaves unexpectedly, what should you inspect first?",
            "options": [
                {"id": "A", "text": "The syntax, execution flow, and assumptions shown in the lesson example."},
                {"id": "B", "text": "Only the file name."},
                {"id": "C", "text": "Whether the answer choice is option A."},
                {"id": "D", "text": "The visual style of the code block."},
            ],
            "correct_option_ids": ["A"],
            "expected_answer": f"For code-related {topic} questions, inspect how the example executes and which assumptions control the result.",
            "difficulty": "hard",
        },
    ]
    if not has_code:
        pool[-1] = {
            "question": f"Which scenario would best test whether someone can use {topic}, not just define it?",
            "options": [
                {"id": "A", "text": "A scenario that asks them to choose the right action and justify it from the lesson."},
                {"id": "B", "text": "A prompt that only asks them to repeat the topic title."},
                {"id": "C", "text": "A question with no connection to the explanation."},
                {"id": "D", "text": "A choice based only on which answer is longest."},
            ],
            "correct_option_ids": ["A"],
            "expected_answer": f"Application questions for {topic} should require a decision and a reason grounded in the lesson.",
            "difficulty": "hard",
        }
    return pool[:count]


def fallback_question(topic: str, expected_answer: str = "") -> dict:
    """Backward-compatible single-question fallback."""
    return fallback_questions(topic, expected_answer, n=2)[0]


def normalize_question(raw: dict, topic: str) -> dict | None:
    """Coerce LLM quiz JSON into the stable multiple-choice shape."""
    if not isinstance(raw, dict):
        return None

    question = str(raw.get("question", "")).strip()
    expected = str(raw.get("expected_answer", "")).strip()
    if not question or not expected:
        return None
    if any(marker in question.lower() for marker in GENERIC_QUESTION_MARKERS):
        return None

    raw_options = raw.get("options", [])
    options: list[dict[str, str]] = []
    if isinstance(raw_options, list):
        for idx, option in enumerate(raw_options[:4]):
            if isinstance(option, dict):
                text = compact_text(str(option.get("text", "")).strip(), limit=180)
                option_id = str(option.get("id", OPTION_IDS[idx] if idx < 4 else "")).strip().upper()
            else:
                text = compact_text(str(option).strip(), limit=180)
                option_id = OPTION_IDS[idx] if idx < 4 else ""
            if text and option_id in OPTION_IDS:
                options.append({"id": option_id, "text": text})

    # Backward-compatible upgrade for old essay-style generated questions.
    if len(options) < 4:
        return fallback_question(topic, expected)

    correct_ids = raw.get("correct_option_ids", [])
    if isinstance(correct_ids, str):
        correct_ids = [correct_ids]
    correct_option_ids = [
        str(option_id).strip().upper()
        for option_id in correct_ids
        if str(option_id).strip().upper() in OPTION_IDS
    ]
    if not correct_option_ids:
        correct_option_ids = [options[0]["id"]]

    return {
        "question": question,
        "options": options[:4],
        "correct_option_ids": sorted(set(correct_option_ids), key=OPTION_IDS.index),
        "expected_answer": compact_text(expected, limit=320),
        "difficulty": raw.get("difficulty", "medium") if raw.get("difficulty") in ("easy", "medium", "hard") else "medium",
    }


def grade_selected_options(
    question: str,
    expected: str,
    options: list[dict],
    correct_option_ids: list[str],
    selected_option_ids: list[str],
) -> dict:
    """Grade a multiple-select answer deterministically."""
    correct = {str(option_id).upper() for option_id in correct_option_ids}
    selected = {str(option_id).upper() for option_id in selected_option_ids}
    option_labels = {str(o.get("id", "")).upper(): str(o.get("text", "")) for o in options}

    if not selected:
        score = 0.0
    elif selected == correct:
        score = 1.0
    else:
        true_positive = len(selected & correct)
        false_positive = len(selected - correct)
        false_negative = len(correct - selected)
        score = max(0.0, (true_positive - 0.5 * false_positive) / max(1, true_positive + false_negative))

    selected_text = ", ".join(sorted(selected)) or "no option selected"
    correct_text = ", ".join(sorted(correct))
    missing = ""
    if score < 1.0:
        missing = f"Correct option(s): {', '.join(sorted(correct))}"

    return {
        "correct": score == 1.0,
        "score": round(score, 2),
        "feedback": f"You selected {selected_text}. Correct option(s): {correct_text}. Review the expected answer below.",
        "missing_concept": missing,
    }


def generate_questions(topic: str, explanation: str, n: int | None = None) -> list[dict]:
    """
    Call the LLM to generate n quiz questions about a topic.

    Args:
        topic:       The topic title being quizzed.
        explanation: The explanation the Explainer produced (context).
        n:           Number of questions to generate. If None, chosen adaptively.

    Returns:
        List of question dicts with keys: question, options,
        correct_option_ids, expected_answer, difficulty.
        Falls back to one generic question if LLM output can't be parsed.
    """
    n = n or choose_question_count(topic, explanation)
    llm = create_llm(temperature=0.4, format="json")

    prompt = GENERATION_PROMPT.format(n=n)
    try:
        response = invoke_llm(llm, [
            SystemMessage(content=prompt),
            HumanMessage(content=f"Topic: {topic}\n\nExplanation:\n{explanation}"),
        ])
    except Exception as e:
        print(f"[Quiz Generator] LLM call failed during question generation: {e}")
        return fallback_questions(topic, explanation, n)
    
    try:
        data = json.loads(response.content)
        questions = [
            q for q in (
                normalize_question(item, topic)
                for item in data.get("questions", [])
            )
            if q is not None
        ]
        if questions and isinstance(questions, list):
            return questions[:n]
    except (json.JSONDecodeError, KeyError):
        pass

    # Fallback: varied deterministic questions if parsing fails
    print("[Quiz Generator] Warning: could not parse questions, using fallback")
    return fallback_questions(topic, explanation, n)


def grade_answer(question: str, expected: str, student_answer: str) -> dict:
    """
    Use the LLM to grade a student's answer against the expected answer.

    Args:
        question:       The question that was asked.
        expected:       The model answer.
        student_answer: What the student wrote.

    Returns:
        Dict with keys: correct (bool), score (float), feedback (str),
        missing_concept (str).
        Returns a safe default if LLM output can't be parsed.
    """
    # Very low temperature, grading should be consistent and analytical
    llm = create_llm(temperature=0.1, format="json")

    prompt = GRADING_PROMPT.format(
        question=question,
        expected_answer=expected,
        student_answer=student_answer,
    )

    try:
        response = invoke_llm(llm, [HumanMessage(content=prompt)])
    except Exception as e:
        print(f"[Quiz Generator] LLM call failed during grading: {e}")
        # Return partial credit so the session can continue
        return {
            "correct": False,
            "score": 0.5,
            "feedback": "Could not grade answer due to a connection error.",
            "missing_concept": "",
        }
    
    try:
        return json.loads(response.content)
    except json.JSONDecodeError:
        # Safe default if grading fails
        return {
            "correct": False,
            "score": 0.0,
            "feedback": "Could not grade automatically, please review manually.",
            "missing_concept": "",
        }


# ─────────────────────────────────────────────────────────────────────────────
# Interactive quiz runner
# ─────────────────────────────────────────────────────────────────────────────

def run_quiz(topic: str, explanation: str) -> QuizResult:
    """
    Run a complete interactive quiz on a topic.

    Generates questions, collects answers via input(), grades each,
    and returns a QuizResult.

    The same generate_questions and grade_answer functions back the A2A
    service wrapper in src/a2a_services/quiz_service.py. The quiz logic
    is identical; only how answers are collected changes.

    Args:
        topic:       The topic being quizzed.
        explanation: The Explainer's output (context for question generation).

    Returns:
        QuizResult with questions, scores, and identified weak areas.
    """
    print(f"\n{'='*60}")
    print(f"Quiz: {topic}")
    print(f"{'='*60}")
    print("Answer each question in your own words. Press Enter to submit.\n")

    questions_data = generate_questions(topic, explanation)
    graded_questions = []
    total_score = 0.0
    weak_areas = []

    for i, q_data in enumerate(questions_data, 1):
        question_text = q_data["question"]
        expected = q_data["expected_answer"]
        options = q_data.get("options", [])
        correct_option_ids = q_data.get("correct_option_ids", [])
        difficulty = q_data.get("difficulty", "medium")

        print(f"Question {i} [{difficulty}]: {question_text}")
        if options:
            for option in options:
                print(f"  {option.get('id')}. {option.get('text')}")
            user_answer = input("Choose option id(s), comma-separated: ").strip()
            selected_option_ids = [
                part.strip().upper()
                for part in user_answer.replace(";", ",").split(",")
                if part.strip()
            ]
        else:
            user_answer = input("Your answer: ").strip()
            selected_option_ids = []

        # Handle empty answers
        if not user_answer:
            user_answer = "(no answer provided)"

        print("Grading...")
        if options and correct_option_ids:
            grade = grade_selected_options(
                question_text,
                expected,
                options,
                correct_option_ids,
                selected_option_ids,
            )
        else:
            grade = grade_answer(question_text, expected, user_answer)

        score = float(grade.get("score", 0.0))
        correct = bool(grade.get("correct", False))
        feedback = grade.get("feedback", "")
        missing = grade.get("missing_concept", "")

        total_score += score

        # Show result
        status = "[OK]" if correct else "[X]"
        print(f"{status} Score: {score:.0%}, {feedback}\n")

        if missing:
            weak_areas.append(missing)

        graded_questions.append(QuizQuestion(
            question=question_text,
            expected_answer=expected,
            options=options,
            correct_option_ids=correct_option_ids,
            user_answer=user_answer,
            selected_option_ids=selected_option_ids,
            correct=correct,
            feedback=feedback,
            score=score,
        ))

    # Calculate overall score
    avg_score = total_score / len(questions_data) if questions_data else 0.0
    correct_count = sum(1 for q in graded_questions if q.correct)

    print(f"{'='*60}")
    print(f"Quiz complete! Score: {avg_score:.0%} "
          f"({correct_count}/{len(graded_questions)} correct)")
    if weak_areas:
        print(f"Areas to review: {', '.join(set(weak_areas))}")
    print(f"{'='*60}\n")

    return QuizResult(
        topic=topic,
        questions=graded_questions,
        score=avg_score,
        weak_areas=list(set(weak_areas)),
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


# ─────────────────────────────────────────────────────────────────────────────
# The LangGraph node
# ─────────────────────────────────────────────────────────────────────────────

def quiz_generator_node(state: dict) -> dict:
    """
    LangGraph node: Quiz Generator

    Reads:
        state["roadmap"]             : to get the current topic
        state["current_topic_index"]: which topic we're on
        state["messages"]            : to extract the explanation

    Writes:
        state["quiz_results"]        : appends the new QuizResult
        state["weak_areas"]          : accumulated weak areas (deduplicated)
        state["error"]               : error string on failure
    """
    topic = get_current_topic(state)
    if topic is None:
        return {"error": "No current topic, Curriculum Planner must run first"}

    # Extract the most recent explanation from messages
    # The Explainer's final response is the last AIMessage with no tool calls
    from langchain_core.messages import AIMessage
    messages = state.get("messages", [])
    explanation = ""
    for msg in reversed(messages):
        if isinstance(msg, AIMessage) and msg.content and not getattr(msg, "tool_calls", None):
            explanation = msg.content
            break

    if not explanation:
        print("[Quiz Generator] Warning: no explanation found, generating generic quiz")
        explanation = f"Topic: {topic.title}. {topic.description}"

    print(f"\n[Quiz Generator] Generating quiz for: '{topic.title}'")
    quiz_result = run_quiz(topic.title, explanation)

    # Accumulate results
    existing_results = state.get("quiz_results", [])
    all_weak_areas = list(set(
        state.get("weak_areas", []) + quiz_result.weak_areas
    ))

    return {
        "quiz_results": existing_results + [quiz_result],
        "weak_areas": all_weak_areas,
        "error": None,
        # Pass core state through explicitly, LangGraph 1.1.0 state propagation workaround
        "roadmap": state.get("roadmap"),
        "current_topic_index": state.get("current_topic_index", 0),
        "session_id": state.get("session_id", ""),
    }
