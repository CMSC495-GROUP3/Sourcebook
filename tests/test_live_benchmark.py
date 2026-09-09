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


class FakeServer:
    """Answers each step the way the deployed API would, from a scripted cache state."""

    def __init__(self, warm=(), fail=(), rate_limit=()):
        self.warm = set(warm)
        self.fail = set(fail)
        self.rate_limit = set(rate_limit)
        self.seen: list[bench.Step] = []
        self.history: set[str] = set()

    async def __call__(self, step: bench.Step) -> bench.Record:
        self.seen.append(step)
        record = bench.Record(step=step.name, expected=step.expected, session_id=step.session_id)
        if step.question in self.rate_limit:
            record.http_status, record.error = 429, "HTTP 429"
        elif step.question in self.fail:
            record.http_status, record.error = 200, "An error occurred"
        elif step.question == bench.REFUSAL_QUESTION:
            record.http_status, record.ttft_s, record.total_s = 200, 0.5, 0.6
            record.observed = bench.PATH_REFUSED
            return record
        elif step.question in self.warm and step.session_id not in self.history:
            record.http_status, record.ttft_s, record.total_s = 200, 0.2, 0.3
            record.observed = bench.PATH_CACHED
            return record
        else:
            record.http_status, record.ttft_s, record.total_s = 200, 2.0, 8.0
            record.observed = bench.PATH_GENERATED
            self.history.add(step.session_id)
            self.warm.add(step.question)
            return record
        record.observed = bench.classify(None, record.http_status, record.error)
        return record


def _run(server, **kwargs):
    defaults = {"burst": 2, "max_requests": 10, "max_errors": 2}
    return asyncio.run(bench.run_plan(server, "abc", **(defaults | kwargs)))


def test_plan_orders_cache_and_follow_up_after_the_first_ask():
    server = FakeServer()

    records = _run(server)

    names = [r.step for r in records]
    assert names == [
        "uncached answer",
        "cached repeat",
        "follow-up",
        "refusal",
        "burst 1",
        "burst 2",
    ]
    first, repeat, follow_up = server.seen[0], server.seen[1], server.seen[2]
    # The repeat sends identical text in a fresh session; the follow-up reuses
    # the first session so it has history.
    assert repeat.question == first.question
    assert repeat.session_id != first.session_id
    assert follow_up.session_id == first.session_id
    assert [r.observed for r in records] == [
        bench.PATH_GENERATED,
        bench.PATH_CACHED,
        bench.PATH_GENERATED,
        bench.PATH_REFUSED,
        bench.PATH_GENERATED,
        bench.PATH_GENERATED,
    ]
    assert all(r.matched for r in records)
    # The burst never reuses the question the first step spent.
    burst_questions = {s.question for s in server.seen[4:]}
    assert first.question not in burst_questions
    assert len(burst_questions) == 2


def test_plan_probes_past_warm_questions_without_changing_their_text():
    warm = bench.QUESTION_POOL[:2]
    server = FakeServer(warm=warm)

    records = _run(server, burst=0)

    assert [r.step for r in records] == [
        "cache probe",
        "cache probe",
        "uncached answer",
        "cached repeat",
        "follow-up",
        "refusal",
    ]
    assert [s.question for s in server.seen[:3]] == bench.QUESTION_POOL[:3]
    # Probes are recorded as what they were, not as failed generations.
    assert records[0].observed == bench.PATH_CACHED
    assert records[0].matched
    assert server.seen[3].question == bench.QUESTION_POOL[2]
    assert server.seen[4].session_id == server.seen[2].session_id


def test_plan_respects_the_request_cap_even_while_probing():
    server = FakeServer(warm=bench.QUESTION_POOL)

    records = _run(server, burst=5, max_requests=3)

    assert len(records) == 3
    assert {r.step for r in records} == {"cache probe"}


def test_plan_skips_the_repeat_and_follow_up_when_nothing_generated():
    server = FakeServer(warm=bench.QUESTION_POOL)

    records = _run(server, burst=1, max_requests=20)

    names = [r.step for r in records]
    assert names.count("cache probe") == len(bench.QUESTION_POOL)
    assert "cached repeat" not in names
    assert "follow-up" not in names
    assert names[-1] == "refusal"


def test_plan_stops_on_the_error_limit_and_skips_the_burst():
    server = FakeServer(fail={bench.QUESTION_POOL[0], bench.FOLLOW_UP_QUESTION})

    records = _run(server, burst=3, max_errors=2)

    # First ask fails (1), nothing generated so no repeat or follow-up, refusal
    # succeeds; with max_errors=2 the burst still runs on one error.
    assert [r.step for r in records][:2] == ["uncached answer", "refusal"]
    assert len([r for r in records if r.step.startswith("burst")]) == 3

    server = FakeServer(fail=set(bench.QUESTION_POOL[:1]))
    records = _run(server, burst=3, max_errors=1)
    assert [r.step for r in records] == ["uncached answer"]


def test_plan_burst_size_is_limited_by_the_remaining_budget():
    server = FakeServer()
    records = _run(server, burst=5, max_requests=6)
    assert len(records) == 6
    assert len([r for r in records if r.step.startswith("burst")]) == 2


def test_planned_requests_matches_the_cap_or_the_pool():
    assert bench.planned_requests(burst=3, max_requests=8) == 8
    assert bench.planned_requests(burst=0, max_requests=100) == len(bench.QUESTION_POOL) + 3


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


def test_main_treats_a_closed_stdin_as_a_decline(monkeypatch, capsys):
    monkeypatch.setenv("BENCH_PASSWORD", "x")

    def closed(prompt):
        raise EOFError

    monkeypatch.setattr("builtins.input", closed)
    assert bench.main([]) == 1
    monkeypatch.delenv("BENCH_PASSWORD")
    monkeypatch.setattr(bench.getpass, "getpass", closed)
    assert bench.main(["--yes"]) == 2


def test_main_reports_a_failed_login_without_a_traceback(monkeypatch, capsys):
    monkeypatch.setenv("BENCH_PASSWORD", "wrong")

    def refuse(url, password):
        raise bench.httpx.HTTPStatusError(
            "401", request=bench.httpx.Request("POST", url), response=bench.httpx.Response(401)
        )

    monkeypatch.setattr(bench, "fetch_token", refuse)
    assert bench.main(["--yes", "--url", "https://example.invalid"]) == 2
    err = capsys.readouterr().err
    assert "login or connection failed" in err
    assert "wrong" not in err
