"""Query logging: one record per request, never raising."""

import logging

import pytest
from conftest import FAKE_DB, make_passages

from sourcebook.api import analytics
from sourcebook.api.analytics import MAX_QUESTION_LENGTH, log_query
from sourcebook.api.logutil import MAX_LOG_TOKEN_LENGTH, normalize_log_token
from sourcebook.rag.cache import question_hash


def _log(**overrides):
    fields = dict(
        session_id="s1",
        question="How much PTO do I get?",
        condensed_question="How much PTO do I get?",
        passages=make_passages(0.80, 0.60),
        refused=False,
        sources=["PTO Policy"],
        cache_hit=None,
        latency_ms=120,
    )
    fields.update(overrides)
    log_query(**fields)


def test_records_scores_and_outcome():
    _log()
    record = FAKE_DB["query_logs"].find_one({})
    assert record["best_score"] == 0.80
    assert record["mean_score"] == 0.70
    assert record["passage_count"] == 2
    assert record["refused"] is False
    assert record["sources"] == ["PTO Policy"]
    assert record["latency_ms"] == 120
    assert record["question_hash"] == question_hash("how much  pto do i get?")


def test_cache_hits_have_no_scores():
    _log(passages=[], cache_hit="answer")
    record = FAKE_DB["query_logs"].find_one({})
    assert record["best_score"] is None and record["mean_score"] is None
    assert record["cache_hit"] == "answer"


def test_questions_are_truncated():
    _log(question="x" * 1000, condensed_question="y" * 1000)
    record = FAKE_DB["query_logs"].find_one({})
    assert len(record["question_raw"]) == MAX_QUESTION_LENGTH
    assert len(record["question_condensed"]) == MAX_QUESTION_LENGTH


class _Broken:
    def insert_one(self, *_):
        raise ConnectionError("cluster unreachable")


def test_logging_failure_is_swallowed(monkeypatch, caplog):
    monkeypatch.setattr(analytics, "query_logs_col", _Broken())
    _log()  # must not raise
    assert "Failed to write query log" in caplog.text


class TestNormalizeLogToken:
    def test_none_becomes_dash(self):
        assert normalize_log_token(None) == "-"

    def test_empty_after_strip_becomes_dash(self):
        assert normalize_log_token("\n\r\x00") == "-"

    @pytest.mark.parametrize(
        ("raw", "expected"),
        [
            ("abc\nINFO forged", "abcINFO forged"),
            ("abc\rINFO forged", "abcINFO forged"),
            ("abc\r\nINFO forged", "abcINFO forged"),
            ("abc\x00INFO forged", "abcINFO forged"),
            ("abc\x1bINFO forged", "abcINFO forged"),
        ],
    )
    def test_controls_are_stripped_to_one_line(self, raw, expected):
        cleaned = normalize_log_token(raw)
        assert cleaned == expected
        assert "\n" not in cleaned and "\r" not in cleaned
        assert "\x00" not in cleaned and "\x1b" not in cleaned

    def test_is_length_bounded(self):
        cleaned = normalize_log_token("a" * (MAX_LOG_TOKEN_LENGTH + 10))
        assert cleaned == "a" * MAX_LOG_TOKEN_LENGTH


def test_log_query_failure_keeps_injected_session_on_one_line(monkeypatch, caplog):
    """Direct log_query path: dirty session_id must not split the exception line."""
    monkeypatch.setattr(analytics, "query_logs_col", _Broken())
    with caplog.at_level(logging.ERROR, logger="sourcebook.api.analytics"):
        _log(session_id="abc\r\nINFO forged\x00\x1b")

    records = [r for r in caplog.records if r.name == "sourcebook.api.analytics"]
    assert records
    for record in records:
        message = record.getMessage()
        assert "\n" not in message and "\r" not in message
        assert message.count("\n") == 0
        assert record.session_id == "abcINFO forged"
        assert "\n" not in record.session_id and "\r" not in record.session_id


def test_log_query_stores_sanitized_session_id():
    _log(session_id="s1\nINFO forged")
    record = FAKE_DB["query_logs"].find_one({})
    assert record["session_id"] == "s1INFO forged"


def test_log_query_keeps_missing_session_as_none():
    _log(session_id=None)
    record = FAKE_DB["query_logs"].find_one({})
    assert record["session_id"] is None
