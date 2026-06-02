"""
src/a2a_services/quiz_service.py

The Quiz Generator exposed as a standalone A2A service.

This turns the quiz_generator agent logic into a network service
that any A2A-compatible agent can call, regardless of framework.

Architecture:
  - A2A server (Starlette/uvicorn) handles HTTP and protocol
  - QuizAgentExecutor contains the actual quiz logic
  - Agent Card describes capabilities to callers
  - InMemoryTaskStore tracks task state

Run standalone:
  python src/a2a_services/quiz_service.py

Then discover:
  curl http://localhost:9001/.well-known/agent-card.json

Submit a task:
  See src/a2a_services/a2a_client.py for the client.
"""

import asyncio
import json
import sys
from pathlib import Path

# Ensure src/ is on path when running as script
sys.path.insert(0, str(Path(__file__).parent.parent))

import uvicorn
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.apps import A2AStarletteApplication
from a2a.server.events import EventQueue
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import (
    AgentCapabilities,
    AgentCard,
    AgentSkill,
    Message,
    TextPart,
)

from agents.quiz_generator import generate_questions, grade_answer, grade_selected_options


# ─────────────────────────────────────────────────────────────────────────────
# Agent Card
#
# The Agent Card is the "business card" of this A2A service.
# It's served automatically at /.well-known/agent-card.json
# Any caller fetches this first to discover what the service can do.
# ─────────────────────────────────────────────────────────────────────────────

QUIZ_SKILL = AgentSkill(
    id="generate_and_grade_quiz",
    name="Generate and Grade Quiz",
    description=(
        "Given a topic and optional explanation text, generates quiz questions "
        "that test conceptual understanding. If answers are provided, grades "
        "each answer and returns scores with identified weak areas."
    ),
    tags=["quiz", "assessment", "education", "grading"],
    examples=[
        "Generate a quiz on Python closures",
        "Grade these answers for a decorators quiz: ...",
    ],
)

QUIZ_AGENT_CARD = AgentCard(
    name="Quiz Generator Service",
    description=(
        "A specialised quiz generation and grading service built with LangGraph. "
        "Generates questions that test genuine understanding, grades answers "
        "using LLM-as-judge, and identifies weak areas for further study. "
        "Framework-agnostic: works with any A2A-compatible agent."
    ),
    url="http://localhost:9001/",
    version="1.0.0",
    default_input_modes=["text"],
    default_output_modes=["text"],
    capabilities=AgentCapabilities(streaming=False),
    skills=[QUIZ_SKILL],
)


# ─────────────────────────────────────────────────────────────────────────────
# Agent Executor
#
# The AgentExecutor is where the actual work happens.
# The A2A framework calls execute() for every incoming task.
# We parse the request, run quiz logic, and emit the result.
# ─────────────────────────────────────────────────────────────────────────────

class QuizAgentExecutor(AgentExecutor):
    """
    Handles incoming A2A quiz tasks.

    Request format (JSON in the text part):
    {
        "topic":       "Python Closures",
        "explanation": "A closure is...",   (optional)
        "answers":     [["A"], ["B", "D"]]  (optional, omit to just get questions)
    }

    Response format (JSON in the text part):
    {
        "status":   "questions_ready" | "graded" | "error",
        "topic":    "Python Closures" | string,
        "questions": [...],            (always present on non-error)
        "score":    0.75,              (only when answers provided)
        "graded_questions": [...],     (only when answers provided)
        "weak_areas": [...]            (only when answers provided)
        "error":    "..."             (only when status == error)
    }
    """

    async def execute(
        self,
        context: RequestContext,
        event_queue: EventQueue,
    ) -> None:
        """Process an incoming A2A quiz task."""

        try:
            # ── Parse request ─────────────────────────────────────────────
            request_text = ""
            # A2A RequestContext contains the incoming request envelope.
            # We read the text parts from the message payload.
            msg = getattr(context, "current_request", None) or getattr(context, "request", None) or getattr(context, "incoming_request", None)
            parts = []
            try:
                parts = msg.params.message.parts  # type: ignore[attr-defined]
            except Exception:
                parts = []

            for part in parts:
                if isinstance(part, TextPart):
                    request_text += part.text


            try:
                request_data = json.loads(request_text)
            except json.JSONDecodeError:
                # If it's not JSON, treat the whole thing as a topic
                request_data = {"topic": request_text, "explanation": ""}

            topic = request_data.get("topic", "General Knowledge")
            explanation = request_data.get("explanation", "")
            provided_answers = request_data.get("answers", [])

            if not isinstance(provided_answers, list):
                provided_answers = []

            print(
                f"[Quiz A2A] Task received: topic='{topic}', "
                f"answers_provided={len(provided_answers)}"
            )

            # ── Generate questions ────────────────────────────────────────
            questions_data = await asyncio.to_thread(
                generate_questions, topic, explanation
            )

            if not provided_answers:
                # No answers provided, return questions only
                result = {
                    "status": "questions_ready",
                    "topic": topic,
                    "questions": questions_data,
                    "message": (
                        "Questions generated. Submit again with 'answers' key to grade."
                    ),
                }
            else:
                # Grade the provided answers
                graded = []
                total_score = 0.0
                weak_areas = []

                # Grade only up to the number of provided answers
                for i, answer in enumerate(provided_answers):
                    if i >= len(questions_data):
                        break
                    q_data = questions_data[i] or {}
                    question_text = q_data.get("question", "")
                    expected_answer = q_data.get("expected_answer", "")
                    options = q_data.get("options", [])
                    correct_option_ids = q_data.get("correct_option_ids", [])

                    if options and correct_option_ids and isinstance(answer, list):
                        grade = grade_selected_options(
                            question_text,
                            expected_answer,
                            options,
                            correct_option_ids,
                            answer,
                        )
                    else:
                        grade = await asyncio.to_thread(
                            grade_answer,
                            question_text,
                            expected_answer,
                            str(answer),
                        )
                    score = float(grade.get("score", 0.0))
                    total_score += score
                    missing = grade.get("missing_concept", "")
                    if missing:
                        weak_areas.append(missing)

                    graded.append({
                        "question": question_text,
                        "answer": answer,
                        "selected_option_ids": answer if isinstance(answer, list) else [],
                        "expected_answer": expected_answer,
                        "score": score,
                        "correct": bool(grade.get("correct", False)),
                        "feedback": grade.get("feedback", ""),
                    })

                avg_score = total_score / len(questions_data) if questions_data else 0.0

                result = {
                    "status": "graded",
                    "topic": topic,
                    "score": avg_score,
                    "questions": questions_data,
                    "graded_questions": graded,
                    "weak_areas": list(set(weak_areas)),
                }

            print(f"[Quiz A2A] Task complete: status={result['status']}")

            # ── Emit result ───────────────────────────────────────────────
            # Some A2A framework versions require message_id.
            # Provide it defensively.
            await event_queue.enqueue_event(
                Message(
                    role="agent",
                    parts=[TextPart(text=json.dumps(result, indent=2))],
                    message_id=getattr(context, "message_id", None) or None,
                )
            )

        except Exception as e:
            # Prevent framework-level 500s: always emit an error result.
            err_msg = f"{type(e).__name__}: {e}"
            print(f"[Quiz A2A] Task failed: {err_msg}")

            result = {
                "status": "error",
                "topic": "General Knowledge",
                "questions": [],
                "error": err_msg,
            }

            await event_queue.enqueue_event(
                Message(
                    role="agent",
                    parts=[TextPart(text=json.dumps(result, indent=2))],
                    message_id=getattr(context, "message_id", None) or None,
                )
            )


    async def cancel(
        self,
        context: RequestContext,
        event_queue: EventQueue,
    ) -> None:
        """Handle task cancellation, not needed for synchronous quiz tasks."""
        pass


# ─────────────────────────────────────────────────────────────────────────────
# Server setup
# ─────────────────────────────────────────────────────────────────────────────

def create_quiz_server():
    """Build the A2A Starlette application."""
    request_handler = DefaultRequestHandler(
        agent_executor=QuizAgentExecutor(),
        task_store=InMemoryTaskStore(),
    )
    app = A2AStarletteApplication(
        agent_card=QUIZ_AGENT_CARD,
        http_handler=request_handler,
    )
    return app.build()


if __name__ == "__main__":
    print("[Quiz A2A Service] Starting on http://localhost:9001")
    print("[Quiz A2A Service] Agent Card: "
          "http://localhost:9001/.well-known/agent-card.json")
    print("[Quiz A2A Service] Press Ctrl+C to stop\n")
    uvicorn.run(create_quiz_server(), host="0.0.0.0", port=9001, log_level="warning")
