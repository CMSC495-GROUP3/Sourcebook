"""Provider saturation is a retryable 503, not a generic generation failure.

The capacity semaphore in the OpenAI provider is the only place the busy error
is raised. These tests raise it from each point a chat turn can reach the
provider: the follow-up rewrite, the embeddings inside retrieval, the answer
stream as it opens, the answer stream after a token, and the non-streaming
completion. Shape of the route tests follows Chris's draft in #225.
"""

import json
import logging
import threading

import pytest
from conftest import FAKE_DB, sse_events

from sourcebook.api.routes.chat import RETRY_AFTER_SECONDS
from sourcebook.rag import llm, rag_chain
from sourcebook.rag.config import PROVIDER_BUSY_MESSAGE

GENERIC_STREAM_ERROR = "An error occurred while generating the response."
GENERIC_CHAT_ERROR = "Sorry, I encountered an error generating a response."
BUSY_BODY = {"error": PROVIDER_BUSY_MESSAGE, "retryable": True}


def _messages(session_id: str) -> list[dict]:
    doc = FAKE_DB["conversations"].find_one({"session_id": session_id})
    return [] if doc is None else doc["messages"]


def _busy(*_args, **_kwargs):
    raise llm.ProviderBusyError("OpenAI provider is at its configured concurrency limit")


def _assert_busy_503(response, session_id):
    assert response.status_code == 503
    assert response.headers["retry-after"] == str(RETRY_AFTER_SECONDS)
    assert response.headers["content-type"].startswith("application/json")
    assert response.json() == BUSY_BODY
    # The turn did not happen: nothing stored, nothing logged, nothing cached.
    assert _messages(session_id) == []
    assert FAKE_DB["query_logs"].count_documents({}) == 0
    assert FAKE_DB["answer_cache"].count_documents({}) == 0


def test_busy_error_is_typed_and_not_a_runtime_error():
    assert issubclass(llm.ProviderBusyError, Exception)
    assert not issubclass(llm.ProviderBusyError, RuntimeError)


def test_held_semaphore_raises_busy_error(monkeypatch):
    provider = llm.OpenAIProvider.__new__(llm.OpenAIProvider)
    provider._capacity = threading.BoundedSemaphore(1)
    provider._capacity.acquire()
    monkeypatch.setattr(llm, "OPENAI_CAPACITY_WAIT_SECONDS", 0)

    with pytest.raises(llm.ProviderBusyError, match="concurrency limit"), provider._request_slot():
        pytest.fail("capacity-limited request unexpectedly acquired a slot")


class TestNonStreaming:
    def test_busy_at_generation_is_503(self, client, auth, retrieval, conversation, monkeypatch):
        monkeypatch.setattr(llm.get_provider(), "complete", _busy)
        response = client.post(
            "/api/chat",
            json={"question": "How much PTO?", "session_id": conversation},
            headers=auth,
        )
        _assert_busy_503(response, conversation)
        assert GENERIC_CHAT_ERROR not in response.text

    def test_busy_at_retrieval_is_503(self, client, auth, conversation, monkeypatch):
        """Embedding the question is the first provider call a turn makes, so
        it is the likelier one to lose the slot."""
        monkeypatch.setattr(rag_chain, "retrieve_passages", _busy)
        response = client.post(
            "/api/chat",
            json={"question": "How much PTO?", "session_id": conversation},
            headers=auth,
        )
        _assert_busy_503(response, conversation)

    def test_busy_at_the_follow_up_rewrite_is_503(
        self, client, auth, retrieval, conversation, monkeypatch
    ):
        """The rewrite swallows ordinary provider errors and retrieves on the
        raw question. Saturation is not one of those: the embeddings next in
        line would hit the same limit, so it surfaces as the 503."""
        opener = client.post(
            "/api/chat",
            json={"question": "How much PTO?", "session_id": conversation},
            headers=auth,
        )
        assert opener.json()["refused"] is False
        FAKE_DB["query_logs"]._docs.clear()
        provider = llm.get_provider()
        original = provider.complete

        def complete(messages, *, role="utility", **kwargs):
            content = messages[0]["content"] if messages else ""
            if role == "utility" and "Rewrite the follow-up question" in content:
                raise llm.ProviderBusyError("slot")
            return original(messages, role=role, **kwargs)

        monkeypatch.setattr(provider, "complete", complete)
        calls_before = len(retrieval.calls)
        response = client.post(
            "/api/chat",
            json={"question": "and part-time?", "session_id": conversation},
            headers=auth,
        )
        assert response.status_code == 503 and response.json() == BUSY_BODY
        assert len(retrieval.calls) == calls_before  # no retrieval on a saturated provider
        assert len(_messages(conversation)) == 2  # only the opener is stored
        assert FAKE_DB["query_logs"].count_documents({}) == 0

    def test_unexpected_error_stays_generic(
        self, client, auth, retrieval, conversation, monkeypatch
    ):
        def broken(*_args, **_kwargs):
            raise RuntimeError("provider down")

        monkeypatch.setattr(llm.get_provider(), "complete", broken)
        response = client.post(
            "/api/chat", json={"question": "q", "session_id": conversation}, headers=auth
        )
        assert response.status_code == 200
        assert response.json()["answer"] == GENERIC_CHAT_ERROR
        assert "retryable" not in response.json()
        assert _messages(conversation) == []


class TestStreaming:
    def test_busy_at_retrieval_is_503(self, client, auth, conversation, monkeypatch):
        monkeypatch.setattr(rag_chain, "retrieve_passages", _busy)
        response = client.post(
            "/api/chat/stream",
            json={"question": "How much PTO?", "session_id": conversation},
            headers=auth,
        )
        _assert_busy_503(response, conversation)

    def test_busy_when_the_answer_stream_opens_is_503(
        self, client, auth, retrieval, conversation, monkeypatch
    ):
        """The provider takes its slot as the stream opens, before any token,
        so the error surfaces inside the first next() and is still an HTTP status."""

        def busy_stream(*_args, **_kwargs):
            raise llm.ProviderBusyError("slot")
            yield  # a generator, like the real provider's stream()

        monkeypatch.setattr(llm.get_provider(), "stream", busy_stream)
        response = client.post(
            "/api/chat/stream",
            json={"question": "How much PTO?", "session_id": conversation},
            headers=auth,
        )
        _assert_busy_503(response, conversation)
        assert GENERIC_STREAM_ERROR not in response.text

    def test_busy_after_a_token_is_a_retryable_error_event(
        self, client, auth, retrieval, conversation, monkeypatch
    ):
        """Headers are out once a token has streamed, so the same message
        travels as an event. No done event, nothing stored (see #84)."""

        def busy_mid_stream(*_args, **_kwargs):
            yield "partial"
            raise llm.ProviderBusyError("slot lost")

        monkeypatch.setattr(llm.get_provider(), "stream", busy_mid_stream)
        response = client.post(
            "/api/chat/stream",
            json={"question": "How much PTO?", "session_id": conversation},
            headers=auth,
        )
        assert response.status_code == 200
        events = sse_events(response.text)
        assert events[0] == {"chunk": "partial"}
        assert events[-1] == BUSY_BODY
        assert not any(e.get("done") for e in events)
        assert _messages(conversation) == []
        assert FAKE_DB["answer_cache"].count_documents({}) == 0
        assert FAKE_DB["query_logs"].count_documents({}) == 0

    def test_unexpected_error_stays_generic(
        self, client, auth, retrieval, conversation, monkeypatch
    ):
        def broken(*_args, **_kwargs):
            yield "partial"
            raise RuntimeError("provider down")

        monkeypatch.setattr(llm.get_provider(), "stream", broken)
        response = client.post(
            "/api/chat/stream", json={"question": "q", "session_id": conversation}, headers=auth
        )
        assert response.status_code == 200
        events = sse_events(response.text)
        assert events[-1] == {"error": GENERIC_STREAM_ERROR}
        assert not any(e.get("retryable") for e in events)
        assert _messages(conversation) == []

    def test_a_normal_stream_still_streams_after_the_first_event_hand_off(
        self, client, auth, retrieval, conversation
    ):
        """Guards the hand-off's plumbing, not its purpose: the first event is
        consumed in the endpoint and re-yielded, and the rest of the stream,
        the done event, and persistence are as they were."""
        response = client.post(
            "/api/chat/stream",
            json={"question": "How much PTO?", "session_id": conversation},
            headers=auth,
        )
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")
        events = sse_events(response.text)
        assert events[0]["chunk"] == llm.FakeProvider.ANSWER.split(" ")[0]
        assert any(e.get("done") for e in events)
        assert len(_messages(conversation)) == 2


def test_busy_follow_up_suggestions_are_dropped_with_a_warning(
    client, auth, retrieval, conversation, monkeypatch, caplog
):
    """Suggestions are optional. Saturation there must not fail an answer that
    has already been produced, and must not be silent."""
    provider = llm.get_provider()
    original = provider.complete

    def complete(messages, *, role="utility", **kwargs):
        content = messages[0]["content"] if messages else ""
        if role == "utility" and "Suggest 3 short follow-up questions" in content:
            raise llm.ProviderBusyError("slot")
        return original(messages, role=role, **kwargs)

    monkeypatch.setattr(provider, "complete", complete)
    with caplog.at_level(logging.WARNING, logger="sourcebook.rag.rag_chain"):
        body = client.post(
            "/api/chat",
            json={"question": "How much PTO?", "session_id": conversation},
            headers=auth,
        ).json()
    assert body["refused"] is False and body["follow_ups"] == []
    assert any("Follow-up suggestions failed" in r.getMessage() for r in caplog.records)


def test_busy_follow_up_suggestions_are_dropped_on_the_stream_too(
    client, auth, retrieval, conversation, monkeypatch
):
    provider = llm.get_provider()
    original = provider.complete

    def complete(messages, *, role="utility", **kwargs):
        content = messages[0]["content"] if messages else ""
        if role == "utility" and "Suggest 3 short follow-up questions" in content:
            raise llm.ProviderBusyError("slot")
        return original(messages, role=role, **kwargs)

    monkeypatch.setattr(provider, "complete", complete)
    response = client.post(
        "/api/chat/stream",
        json={"question": "How much PTO?", "session_id": conversation},
        headers=auth,
    )
    events = sse_events(response.text)
    assert any(e.get("done") for e in events)
    assert not any("error" in e for e in events)
    # The suggestions event still arrives, empty, the way any failed
    # suggestion call ends; nothing about it says the provider was busy.
    assert events[-1] == {"follow_ups": []}
    assert _messages(conversation)[-1]["follow_ups"] == []


def test_a_503_still_counts_against_the_chat_rate_limit(client, auth, conversation, monkeypatch):
    """Deliberate: the limit protects the server, and a client that retries
    every second through a saturated stretch is exactly the client it exists
    for. A 429 carries its own message, so the two conditions stay distinct."""
    from sourcebook.api.limiter import limiter
    from sourcebook.rag.config import CHAT_RATE_LIMIT

    monkeypatch.setattr(rag_chain, "retrieve_passages", _busy)
    limit = int(CHAT_RATE_LIMIT.split("/")[0])
    limiter.enabled = True
    limiter.reset()
    try:
        statuses = [
            client.post(
                "/api/chat", json={"question": "q", "session_id": conversation}, headers=auth
            ).status_code
            for _ in range(limit + 1)
        ]
    finally:
        limiter.enabled = False
        limiter.reset()
    assert statuses[:limit] == [503] * limit
    assert statuses[-1] == 429


def test_openapi_declares_the_503_on_both_chat_routes():
    from pathlib import Path

    spec = json.loads(Path("docs/openapi.json").read_text(encoding="utf-8"))
    for path in ("/api/chat", "/api/chat/stream"):
        responses = spec["paths"][path]["post"]["responses"]
        assert "503" in responses, path
        schema_ref = responses["503"]["content"]["application/json"]["schema"]["$ref"]
        assert schema_ref.endswith("/RetryableError")
    retryable = spec["components"]["schemas"]["RetryableError"]["properties"]["retryable"]
    assert retryable.get("const") is True or retryable.get("enum") == [True]
