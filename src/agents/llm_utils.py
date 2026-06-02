"""
src/agents/llm_utils.py

Shared LLM factory and timeout wrapper.

Every agent creates ChatOllama instances, this module centralises
model config and adds timeout protection so a stuck Ollama call
doesn't block the graph indefinitely.
"""

from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError

from langchain_ollama import ChatOllama

MODEL_NAME = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
LLM_TIMEOUT = int(os.getenv("LLM_TIMEOUT", "120"))


def create_llm(temperature: float = 0.3, format: str | None = None) -> ChatOllama:
    """Create a ChatOllama with consistent project-wide settings."""
    kwargs = dict(
        model=MODEL_NAME,
        base_url=OLLAMA_BASE_URL,
        temperature=temperature,
    )
    if format:
        kwargs["format"] = format
    return ChatOllama(**kwargs)


def invoke_llm(llm: ChatOllama, messages: list, timeout: int | None = None) -> object:
    """Invoke an LLM with timeout protection. Raises TimeoutError on timeout."""
    t = timeout if timeout is not None else LLM_TIMEOUT
    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(llm.invoke, messages)
        try:
            return future.result(timeout=t)
        except FutureTimeoutError:
            raise TimeoutError(f"LLM call timed out after {t}s")