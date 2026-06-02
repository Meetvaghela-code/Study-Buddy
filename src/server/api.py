"""
HTTP API for the Learning Accelerator.

Provides lightweight endpoints that mirror the Streamlit UI flow so a
frontend app can start sessions, approve roadmaps, generate and grade
quizzes, and advance the LangGraph session state.

Run with:
  uvicorn src.server.api:app --reload --port 8000
"""

from __future__ import annotations

import sys
import asyncio
import uuid
from pathlib import Path
from typing import Any

for stream in (sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8", errors="backslashreplace")

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from langgraph.types import Command

# Ensure src/ is on sys.path so imports like `from graph.workflow import ...`
# work when running via uvicorn from project root.
sys.path.insert(0, str(Path(__file__).parent.parent))

# Ensure src package imports use local modules
from graph.workflow import build_graph
from graph.state import initial_state, StudyRoadmap, QuizResult
from observability.langfuse_setup import get_langfuse_config, flush_langfuse
from agents.quiz_generator import (
    choose_question_count,
    fallback_questions,
    generate_questions,
    grade_answer,
    grade_selected_options,
)
from agents.progress_coach import progress_coach_node
from agents.explainer import explainer_node


app = FastAPI(title="Learning Accelerator API")

# ── CORS: custom middleware ensures headers are present on ALL responses ──
import os
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

class ForceCORSMiddleware(BaseHTTPMiddleware):
    """Guarantee CORS headers on every response — even unhandled exceptions."""

    async def dispatch(self, request: Request, call_next):
        # Handle preflight
        if request.method == "OPTIONS":
            headers = {
                "Access-Control-Allow-Origin": FRONTEND_ORIGIN,
                "Access-Control-Allow-Methods": "DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT",
                "Access-Control-Allow-Headers": request.headers.get(
                    "Access-Control-Request-Headers", "*"
                ),
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Max-Age": "600",
            }
            return Response(status_code=200, headers=headers)

        try:
            response = await call_next(request)
        except Exception:
            # If the inner stack blows up, return a 500 with CORS headers
            import traceback
            return Response(
                content=traceback.format_exc(),
                status_code=500,
                headers={
                    "Access-Control-Allow-Origin": FRONTEND_ORIGIN,
                    "Access-Control-Allow-Credentials": "true",
                    "Content-Type": "text/plain",
                },
            )

        response.headers["Access-Control-Allow-Origin"] = FRONTEND_ORIGIN
        response.headers["Access-Control-Allow-Credentials"] = "true"
        return response

app.add_middleware(ForceCORSMiddleware)


# Build a dedicated graph for API use (separate checkpoint DB)
# Interrupt before quiz_generator so the UI can integrate at approval time
api_graph = build_graph(db_path="data/checkpoints_api.db", interrupt_before=["quiz_generator"])


async def _generate_questions_safe(topic: str, explanation: str, n: int | None = None) -> list[dict[str, Any]]:
    """Generate quiz questions with a timeout and deterministic fallback."""
    count = n or choose_question_count(topic, explanation)
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(generate_questions, topic, explanation, count),
            timeout=30,
        )
    except TimeoutError:
        print(f"[API] Quiz generation timed out for topic '{topic}', using fallback questions")
    except Exception as e:
        print(f"[API] Quiz generation failed for topic '{topic}': {e}")

    return fallback_questions(topic or "General Knowledge", explanation or "", count)


class StartSessionReq(BaseModel):
    goal: str


class ApproveReq(BaseModel):
    session_id: str
    decision: str  # expected 'yes' or 'no'


class GenerateQuizReq(BaseModel):
    topic: str
    explanation: str | None = ""
    n: int | None = None


class GradeReq(BaseModel):
    question: str
    expected_answer: str
    student_answer: str = ""
    options: list[dict[str, Any]] = []
    correct_option_ids: list[str] = []
    selected_option_ids: list[str] = []


class AdvanceReq(BaseModel):
    session_id: str
    quiz_result: dict[str, Any]


def _to_plain_quiz_results(results: list[Any]) -> list[dict[str, Any]]:
    """Return quiz results as plain dicts for JSON responses."""
    plain: list[dict[str, Any]] = []
    for r in results:
        if isinstance(r, dict):
            plain.append(r)
        elif hasattr(r, "to_dict"):
            plain.append(r.to_dict())
        else:
            plain.append(
                {
                    "topic": getattr(r, "topic", ""),
                    "score": float(getattr(r, "score", 0.0)),
                    "weak_areas": list(getattr(r, "weak_areas", [])),
                    "timestamp": getattr(r, "timestamp", ""),
                    "questions": list(getattr(r, "questions", [])),
                }
            )
    return plain


@app.post("/api/session/start")
async def start_session(req: StartSessionReq):
    session_id = str(uuid.uuid4())[:8]
    config = get_langfuse_config(session_id)

    # initial state for a new session
    state = initial_state(req.goal, session_id)

    # Run the graph in a thread to avoid blocking the event loop
    result = await asyncio.to_thread(api_graph.invoke, state, config)

    # Handle interrupt (human approval)
    if "__interrupt__" in result:
        payload = result["__interrupt__"][0].value
        return {"session_id": session_id, "interrupt": True, "payload": payload}

    if result.get("error"):
        raise HTTPException(status_code=500, detail=result.get("error"))

    # No interrupt — return summary
    return {"session_id": session_id, "interrupt": False, "result": result}


@app.post("/api/session/approve")
async def approve_roadmap(req: ApproveReq):
    """
    Approve or reject the roadmap by resuming the graph.

    When approved: the graph runs explainer (MCP-grounded explanation) then
    stops before quiz_generator (interrupt_before prevents input() call).
    When rejected: the graph loops back to curriculum_planner which generates
    a new roadmap and interrupts again for approval.
    """
    config = get_langfuse_config(req.session_id)
    decision = "yes" if req.decision.lower().strip() in ("yes", "y", "ok", "approve") else "no"

    # Resume the graph from the human_approval interrupt point.
    # This runs the explainer (approved) or regenerates the roadmap (rejected).
    try:
        result = await asyncio.to_thread(api_graph.invoke, Command(resume=decision), config)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Graph execution failed: {str(e)}")

    # Handle re-interrupt (user rejected, curriculum planner regenerated roadmap)
    if "__interrupt__" in result:
        payload = result["__interrupt__"][0].value
        return {"interrupt": True, "payload": payload}

    if result.get("error"):
        raise HTTPException(status_code=500, detail=result.get("error"))

    # Extract explanation from messages (written by the explainer node)
    from langchain_core.messages import AIMessage

    explanation = ""
    for msg in reversed(result.get("messages", [])):
        if isinstance(msg, AIMessage) and msg.content and not getattr(msg, "tool_calls", None):
            explanation = msg.content
            break

    roadmap = result.get("roadmap") or None
    idx = result.get("current_topic_index", 0)

    # Determine topic title for quiz generation
    title = ""
    desc = ""
    if roadmap:
        roadmap_obj = StudyRoadmap.from_dict(roadmap) if isinstance(roadmap, dict) else roadmap
        if idx < len(roadmap_obj.topics):
            topic = roadmap_obj.topics[idx]
            title = topic.title if hasattr(topic, "title") else topic.get("title", "")
            desc = topic.description if hasattr(topic, "description") else topic.get("description", "")

    # Generate quiz questions for the first topic with timeout protection.
    questions = await _generate_questions_safe(title, explanation or desc)

    return {
        "interrupt": False,
        "roadmap": roadmap,
        "current_topic_index": idx,
        "topic_title": title,
        "topic_description": desc,
        "explanation": explanation,
        "quiz_questions": questions,
    }


@app.post("/api/quiz/generate")
async def api_generate_quiz(req: GenerateQuizReq):
    questions = await _generate_questions_safe(req.topic, req.explanation or "", req.n)
    return {"questions": questions}


@app.post("/api/quiz/grade")
async def api_grade(req: GradeReq):
    if req.options and req.correct_option_ids:
        return grade_selected_options(
            req.question,
            req.expected_answer,
            req.options,
            req.correct_option_ids,
            req.selected_option_ids,
        )
    result = await asyncio.to_thread(grade_answer, req.question, req.expected_answer, req.student_answer)
    return result


@app.post("/api/quiz/advance")
async def api_advance(req: AdvanceReq):
    session_id = req.session_id
    config = get_langfuse_config(session_id)

    # Read current checkpoint state for this session.
    snapshot = await asyncio.to_thread(api_graph.get_state, config)
    state = (snapshot.values if snapshot else None) or {}
    if not state:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")

    incoming = req.quiz_result or {}
    latest_result = {
        "topic": incoming.get("topic", ""),
        "score": float(incoming.get("score", 0.0)),
        "weak_areas": list(incoming.get("weak_areas", [])),
        "timestamp": incoming.get("timestamp", ""),
        "questions": list(incoming.get("questions", [])),
    }

    current_results = list(state.get("quiz_results", []))
    all_results = current_results + [latest_result]
    all_weak = list(set(state.get("weak_areas", []) + latest_result["weak_areas"]))

    # Run coach logic directly on merged state to guarantee one-step topic advance
    # without replaying prior graph nodes from interrupt checkpoints.
    merged_state = {
        **state,
        "quiz_results": all_results,
        "weak_areas": all_weak,
        "error": None,
    }
    coach_update = await asyncio.to_thread(progress_coach_node, merged_state)
    if coach_update.get("error"):
        raise HTTPException(status_code=500, detail=coach_update["error"])

    persisted_update = {
        "quiz_results": all_results,
        "weak_areas": all_weak,
        "roadmap": coach_update.get("roadmap", state.get("roadmap")),
        "current_topic_index": coach_update.get("current_topic_index", state.get("current_topic_index", 0)),
        "messages": coach_update.get("messages", []),
        "error": None,
    }

    try:
        await asyncio.to_thread(
            api_graph.update_state,
            config,
            persisted_update,
            as_node="progress_coach",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    roadmap = persisted_update["roadmap"]
    idx = int(persisted_update["current_topic_index"])
    topics = roadmap.get("topics", []) if isinstance(roadmap, dict) else roadmap.topics
    coaching = ""
    messages = persisted_update.get("messages", [])
    if messages:
        coaching = getattr(messages[-1], "content", "") or ""

    # Session complete
    if idx >= len(topics):
        return {
            "coaching_message": coaching,
            "quiz_results": _to_plain_quiz_results(all_results),
            "weak_areas": all_weak,
            "current_topic_index": idx,
            "roadmap": roadmap,
            "complete": True,
            "topic_title": "",
            "topic_description": "",
            "quiz_questions": [],
        }

    next_topic = topics[idx]
    next_title = next_topic.get("title", "") if isinstance(next_topic, dict) else next_topic.title
    next_desc = next_topic.get("description", "") if isinstance(next_topic, dict) else next_topic.description
    
    # Generate explanation for the next topic using the explainer
    explanation = ""
    try:
        explainer_state = {
            "roadmap": roadmap,
            "current_topic_index": idx,
            "session_id": session_id,
            "messages": [],
        }
        explainer_output = await asyncio.to_thread(explainer_node, explainer_state)
        
        # Extract explanation from messages (written by the explainer)
        if not explainer_output.get("error"):
            from langchain_core.messages import AIMessage
            for msg in reversed(explainer_output.get("messages", [])):
                if isinstance(msg, AIMessage) and msg.content and not getattr(msg, "tool_calls", None):
                    explanation = msg.content
                    break
    except Exception as e:
        print(f"[API] Warning: Failed to generate explanation for next topic: {e}")
        explanation = ""  # Fall back to empty explanation if explainer fails
    
    next_questions = await _generate_questions_safe(next_title, explanation or next_desc)

    return {
        "coaching_message": coaching,
        "quiz_results": _to_plain_quiz_results(all_results),
        "weak_areas": all_weak,
        "current_topic_index": idx,
        "roadmap": roadmap,
        "complete": False,
        "topic_title": next_title,
        "topic_description": next_desc,
        "explanation": explanation,
        "quiz_questions": next_questions,
    }


@app.on_event("shutdown")
def shutdown_event():
    # Flush traces on shutdown
    flush_langfuse()
