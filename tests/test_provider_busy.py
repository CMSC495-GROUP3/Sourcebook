"""Provider saturation is a typed, retryable 503 — not a generic generation failure."""

import json
import threading

import pytest
from conftest import FAKE_DB, sse_events

from sourcebook.api.routes.chat import ChatRequest, _stream
from sourcebook.rag import llm

GENERIC_STREAM_ERROR = "An error occurred while generating the response."
GENERIC_CHAT_ERROR = "Sorry, I encountered an error generating a response."


def _messages(session_id: str) -> list[dict]:
    doc = FAKE_DB["conversations"].find_one({"session_id": session_id})
    return [] if doc is None else doc["messages"]


def test_provider_busy_is_not_a_runtime_error():
    assert issubclass(llm.ProviderBusyError, Exception)
    assert not issubclass(llm.ProviderBusyError, RuntimeError)
    assert llm.ProviderBusyError.retryable is True


def test_held_semaphore_raises_provider_busy(monkeypatch):
    provider = llm.OpenAIProvider.__new__(llm.OpenAIProvider)
    provider._capacity = threading.BoundedSemaphore(1)
    provider._capacity.acquire()
    monkeypatch.setattr(llm, "OPENAI_CAPACITY_WAIT_SECONDS", 0)

    with pytest.raises(llm.ProviderBusyError, match="concurrency limit"), provider._request_slot():
        pytest.fail("capacity-limited request unexpectedly acquired a slot")


def test_non_stream_returns_503_when_provider_is_saturated(
    client, auth, retrieval, conversation, monkeypatch
):
    provider = llm.OpenAIProvider.__new__(llm.OpenAIProvider)
    provider._capacity = threading.BoundedSemaphore(1)
    provider._capacity.acquire()
    monkeypatch.setattr(llm, "OPENAI_CAPACITY_WAIT_SECONDS", 0)

    def busy_complete(*_args, **_kwargs):
        with provider._request_slot():
            pytest.fail("saturated complete() acquired a slot")

    monkeypatch.setattr(llm.get_provider(), "complete", busy_complete)

    response = client.post(
        "/api/chat",
        json={"question": "How much PTO?", "session_id": conversation},
        headers=auth,
    )
    assert response.status_code == 503
    assert response.headers.get("retry-after") == "1"
    assert response.json() == {
        "error": llm.ProviderBusyError.user_message,
        "retryable": True,
    }
    assert GENERIC_CHAT_ERROR not in response.text
    assert _messages(conversation) == []


def test_stream_returns_503_retryable_sse_when_provider_is_saturated(
    client, auth, retrieval, conversation, monkeypatch
):
    provider = llm.OpenAIProvider.__new__(llm.OpenAIProvider)
    provider._capacity = threading.BoundedSemaphore(1)
    provider._capacity.acquire()
    monkeypatch.setattr(llm, "OPENAI_CAPACITY_WAIT_SECONDS", 0)

    def busy_stream(*_args, **_kwargs):
        with provider._request_slot():
            yield "should not stream"

    monkeypatch.setattr(llm.get_provider(), "stream", busy_stream)

    response = client.post(
        "/api/chat/stream",
        json={"question": "How much PTO?", "session_id": conversation},
        headers=auth,
    )
    assert response.status_code == 503
    assert response.headers["content-type"].startswith("text/event-stream")
    assert response.headers.get("retry-after") == "1"
    assert sse_events(response.text) == [
        {"error": llm.ProviderBusyError.user_message, "retryable": True}
    ]
    assert GENERIC_STREAM_ERROR not in response.text
    assert _messages(conversation) == []


def test_stream_generator_emits_retryable_payload(retrieval, conversation, monkeypatch):
    def busy_stream(*_args, **_kwargs):
        raise llm.ProviderBusyError()

    monkeypatch.setattr(llm.get_provider(), "stream", busy_stream)
    events = list(_stream(ChatRequest(question="How much PTO?", session_id=conversation)))
    assert events == [f"data: {json.dumps(_provider_busy_event())}\n\n"]
    assert _messages(conversation) == []


def _provider_busy_event() -> dict:
    return {"error": llm.ProviderBusyError.user_message, "retryable": True}


def test_non_stream_unexpected_runtime_error_stays_generic(
    client, auth, retrieval, conversation, monkeypatch
):
    def broken(*_args, **_kwargs):
        raise RuntimeError("provider down")

    monkeypatch.setattr(llm.get_provider(), "complete", broken)
    response = client.post(
        "/api/chat",
        json={"question": "q", "session_id": conversation},
        headers=auth,
    )
    assert response.status_code == 200
    assert response.json()["answer"] == GENERIC_CHAT_ERROR
    assert response.json().get("retryable") is None
    assert _messages(conversation) == []


def test_stream_unexpected_runtime_error_stays_generic(
    client, auth, retrieval, conversation, monkeypatch
):
    def broken(*_args, **_kwargs):
        yield "partial"
        raise RuntimeError("provider down")

    monkeypatch.setattr(llm.get_provider(), "stream", broken)
    response = client.post(
        "/api/chat/stream",
        json={"question": "q", "session_id": conversation},
        headers=auth,
    )
    assert response.status_code == 200
    events = sse_events(response.text)
    assert events[-1] == {"error": GENERIC_STREAM_ERROR}
    assert not any(event.get("retryable") for event in events)
    assert _messages(conversation) == []
