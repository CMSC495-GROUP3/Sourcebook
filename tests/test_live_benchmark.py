"""Offline checks for scripts/loadtest/live_benchmark.py.

The script talks to the deployed pilot and every request costs money, so
these tests never open a connection. They cover the parts that decide what
the report says: the plan and its cap, path classification, stream parsing,
the small-sample summary, and the markdown the operator pastes into the
results page.
"""

import asyncio

import pytest

from scripts.loadtest import live_benchmark as bench


def _record(observed, ttft=None, total=None, expected=None, error=None, status=200):
    return bench.Record(
        step=observed,
        expected=expected or observed,
        observed=observed,
        ttft_s=ttft,
        total_s=total,
        error=error,
        http_status=status,
    )


def test_plan_orders_cache_and_follow_up_after_the_first_ask():
    plan = bench.build_plan("abc", burst=2, max_requests=10)

    names = [s.name for s in plan]
    assert names == [
        "uncached answer",
        "cached repeat",
        "follow-up",
        "refusal",
        "burst 1",
        "burst 2",
    ]
    # The repeat must send identical text in a fresh session, and the follow-up
    # must reuse the first session so it has history.
    assert plan[1].question == plan[0].question
    assert plan[1].session_id != plan[0].session_id
    assert plan[2].session_id == plan[0].session_id
    assert plan[3].expected == bench.PATH_REFUSED


def test_plan_respects_the_request_cap():
    assert len(bench.build_plan("abc", burst=5, max_requests=3)) == 3
    assert len(bench.build_plan("abc", burst=0, max_requests=8)) == 4


def test_plan_nonce_keeps_first_asks_distinct_between_runs():
    a = bench.build_plan("run1", burst=1, max_requests=8)
    b = bench.build_plan("run2", burst=1, max_requests=8)
    assert a[0].question != b[0].question
    assert a[4].question != b[4].question
    # The refusal question is fixed text; a cached refusal is still a refusal.
    assert a[3].question == b[3].question


@pytest.mark.parametrize(
    ("done", "status", "error", "expected"),
    [
        ({"done": True, "refused": False}, 200, None, bench.PATH_GENERATED),
        ({"done": True, "refused": False, "cached": True}, 200, None, bench.PATH_CACHED),
        ({"done": True, "refused": True}, 200, None, bench.PATH_REFUSED),
        ({"done": True, "refused": True, "cached": True}, 200, None, bench.PATH_REFUSED),
        (None, 429, "HTTP 429", bench.PATH_RATE_LIMITED),
        (None, 200, "provider failed", bench.PATH_ERROR),
        (None, 200, None, bench.PATH_ERROR),
    ],
)
def test_classify_names_the_path_the_server_reported(done, status, error, expected):
    assert bench.classify(done, status, error) == expected


async def _lines(items):
    for item in items:
        yield item


def test_consume_stream_records_timings_sources_and_follow_ups():
    record = bench.Record(step="x", expected=bench.PATH_GENERATED)
    stream = _lines(
        [
            ": keepalive",
            'data: {"chunk": "Ten "}',
            'data: {"chunk": "days."}',
            'data: {"done": true, "sources": ["PTO Policy"], "confidence": 81, "refused": false}',
            'data: {"follow_ups": ["Does it roll over?"]}',
        ]
    )

    done = asyncio.run(bench.consume_stream(stream, bench.time.perf_counter(), record))

    assert done["sources"] == ["PTO Policy"]
    assert record.chunks == 2
    assert record.sources == 1
    assert record.confidence == 81
    assert record.answer == "Ten days."
    assert record.ttft_s is not None
    assert record.total_s is not None
    assert record.follow_ups_s is not None
    assert record.follow_ups_s >= record.total_s
    assert record.error is None


def test_consume_stream_reports_server_error_event():
    record = bench.Record(step="x", expected=bench.PATH_GENERATED)
    stream = _lines(['data: {"chunk": "partial"}', 'data: {"error": "An error occurred"}'])

    done = asyncio.run(bench.consume_stream(stream, bench.time.perf_counter(), record))

    assert done is None
    assert record.error == "An error occurred"
    assert bench.classify(done, 200, record.error) == bench.PATH_ERROR


def test_consume_stream_flags_a_stream_that_ends_without_done():
    record = bench.Record(step="x", expected=bench.PATH_GENERATED)
    done = asyncio.run(
        bench.consume_stream(_lines(['data: {"chunk": "a"}']), bench.time.perf_counter(), record)
    )
    assert done is None
    assert "without a done event" in record.error


def test_summary_counts_rate_limits_separately_from_errors():
    records = [
        _record(bench.PATH_GENERATED, ttft=2.0, total=9.0),
        _record(bench.PATH_GENERATED, ttft=3.0, total=11.0),
        _record(bench.PATH_CACHED, ttft=0.3, total=0.5),
        _record(bench.PATH_REFUSED, ttft=0.8, total=0.9),
        _record(
            bench.PATH_RATE_LIMITED, error="HTTP 429", status=429, expected=bench.PATH_GENERATED
        ),
        _record(bench.PATH_ERROR, error="boom", expected=bench.PATH_GENERATED),
    ]

    summary = bench.summarize(records, cost_per_generation=0.01)

    assert summary["requests"] == 6
    assert summary["rate_limited"] == 1
    assert summary["errors"] == 1
    # Five answered requests (the 429 is excluded), one of them an error.
    assert summary["error_rate"] == pytest.approx(0.2)
    assert summary["path_mismatches"] == [bench.PATH_RATE_LIMITED, bench.PATH_ERROR]
    assert summary["generated_ttft_s"] == {"n": 2, "p50": 2.0, "max": 3.0}
    assert summary["cached_ttft_s"]["max"] == 0.3
    assert summary["refused_total_s"]["max"] == 0.9
    assert summary["estimated_cost_usd"] == pytest.approx(0.02)
    assert summary["checks"]["error_rate_max"] is False
    assert summary["checks"]["generated_ttft_p50_s"] is True


def test_summary_marks_unmeasured_targets_instead_of_passing_them():
    summary = bench.summarize([_record(bench.PATH_REFUSED, ttft=0.5, total=0.6)], 0.01)
    assert summary["checks"]["generated_ttft_p50_s"] is None
    assert summary["checks"]["cached_ttft_max_s"] is None
    assert summary["checks"]["refused_total_max_s"] is True
    assert summary["estimated_cost_usd"] == 0


def test_markdown_flags_mismatches_and_unmeasured_targets():
    records = [
        _record(bench.PATH_GENERATED, ttft=2.0, total=9.0),
        _record(bench.PATH_GENERATED, ttft=0.4, total=0.5, expected=bench.PATH_CACHED),
    ]
    summary = bench.summarize(records, 0.01)

    text = bench.render_markdown(records, summary)

    assert "generated (mismatch)" in text
    assert "| cached_ttft_max_s | 1.5s | n/a | not measured |" in text
    assert "| generated_ttft_p50_s | 4.0s | 0.40s | pass |" in text
    assert "Requests: 2. Rate limited: 0. Errors (excluding rate limits): 0." in text


def test_pct_handles_small_samples():
    assert bench.pct([], 50) is None
    assert bench.pct([4.0], 95) == 4.0
    assert bench.pct([1.0, 2.0, 3.0], 50) == 2.0


def test_parse_args_defaults_stay_small():
    args = bench.parse_args([])
    assert args.max_requests == 8
    assert args.burst == 3
    assert args.max_errors == 2
    assert args.pause == 2.0
    assert args.yes is False


def test_main_refuses_without_a_password(monkeypatch, capsys):
    monkeypatch.delenv("BENCH_PASSWORD", raising=False)
    monkeypatch.setattr(bench.getpass, "getpass", lambda prompt: "")
    assert bench.main(["--yes"]) == 2
    assert "password is required" in capsys.readouterr().err


def test_main_aborts_when_operator_declines(monkeypatch, capsys):
    monkeypatch.setenv("BENCH_PASSWORD", "x")
    monkeypatch.setattr("builtins.input", lambda prompt: "n")
    assert bench.main([]) == 1
    assert "aborted" in capsys.readouterr().out
