"""Offline checks for scripts/loadtest/pilot_load.py.

The script loads the deployed pilot with the real model, so every request can
cost money and these tests never open a connection. They cover what bounds
the run and what the report says: the cap check, the per-level plan, the
level summary, the error stop, and the table pasted into the results page.
"""

import asyncio

import pytest

from scripts.loadtest import live_benchmark as bench
from scripts.loadtest import pilot_load as load


def _record(observed, ttft=None, total=None, error=None, status=200):
    return bench.Record(
        step=observed,
        expected=bench.PATH_GENERATED,
        observed=observed,
        ttft_s=ttft,
        total_s=total,
        error=error,
        http_status=status,
    )


def _args(*argv):
    return load.parse_args(list(argv))


class TestValidate:
    def test_accepts_the_default_plan(self):
        assert load.validate(_args()) is None
        assert load.planned_requests(load.DEFAULT_LEVELS) <= load.DEFAULT_MAX_REQUESTS

    def test_refuses_levels_over_the_cap(self):
        problem = load.validate(_args("--levels", "40", "80", "--max-requests", "100"))
        assert problem is not None
        assert "120" in problem

    def test_refuses_a_zero_level(self):
        assert load.validate(_args("--levels", "5", "0")) is not None

    def test_refuses_a_malformed_setting(self):
        assert load.validate(_args("--setting", "CACHE_ENABLED")) is not None

    def test_main_stops_before_asking_for_a_password(self, monkeypatch, capsys):
        monkeypatch.setattr(load.getpass, "getpass", lambda prompt: pytest.fail("prompted"))
        assert load.main(["--levels", "50", "50", "--max-requests", "80"]) == 2
        assert "over --max-requests" in capsys.readouterr().err


def test_parse_settings_keeps_values_with_equals_signs():
    assert load.parse_settings(["CHAT_RATE_LIMIT=600/minute", "X=a=b"]) == {
        "CHAT_RATE_LIMIT": "600/minute",
        "X": "a=b",
    }


def test_level_steps_use_answerable_questions_in_separate_sessions():
    steps = load.level_steps("run1", 10)
    assert len(steps) == 10
    assert len({s.session_id for s in steps}) == 10
    assert all(s.question in bench.QUESTION_POOL for s in steps)
    assert all(s.expected == bench.PATH_GENERATED for s in steps)


class TestSummarizeLevel:
    def test_latency_counts_generated_answers_only(self):
        records = [
            _record(bench.PATH_GENERATED, ttft=1.0, total=3.0),
            _record(bench.PATH_GENERATED, ttft=2.0, total=4.0),
            _record(bench.PATH_CACHED, ttft=0.05, total=0.1),
            _record(bench.PATH_REFUSED, total=0.2),
        ]
        summary = load.summarize_level(4, records, wall_s=2.0)
        assert summary["generated_ttft_s"]["n"] == 2
        assert summary["generated_ttft_s"]["p50"] == 1.0
        assert summary["generated_total_s"]["max"] == 4.0
        assert summary["completed"] == 4
        assert summary["throughput_rps"] == 2.0

    def test_rate_limits_are_counted_apart_from_errors(self):
        records = [
            _record(bench.PATH_GENERATED, ttft=1.0, total=3.0),
            _record(bench.PATH_RATE_LIMITED, error="HTTP 429", status=429),
            _record(bench.PATH_ERROR, error="provider busy"),
        ]
        summary = load.summarize_level(3, records, wall_s=1.0)
        assert summary["rate_limited"] == 1
        assert summary["errors"] == 1
        assert summary["error_rate"] == 0.5
        assert summary["completed"] == 1
        assert summary["error_kinds"] == {"provider busy": 1}


class TestRunLevels:
    def test_runs_each_level_at_its_concurrency(self):
        seen = []

        async def send(step):
            seen.append(step)
            return _record(bench.PATH_GENERATED, ttft=1.0, total=2.0)

        levels, records = asyncio.run(load.run_levels(send, "r", [2, 3], max_errors=1, settle_s=0))
        assert [level["concurrency"] for level in levels] == [2, 3]
        assert len(records) == len(seen) == 5

    def test_a_failing_level_ends_the_run(self):
        async def send(step):
            return _record(bench.PATH_ERROR, error="boom")

        levels, records = asyncio.run(
            load.run_levels(send, "r", [2, 5, 10], max_errors=2, settle_s=0)
        )
        assert len(levels) == 1
        assert len(records) == 2


def test_render_markdown_has_a_row_per_level_and_the_cost():
    levels = [
        load.summarize_level(2, [_record(bench.PATH_GENERATED, 1.0, 3.0)] * 2, wall_s=3.0),
        load.summarize_level(
            3,
            [_record(bench.PATH_GENERATED, 2.0, 5.0), _record(bench.PATH_ERROR, error="boom")],
            wall_s=5.0,
        ),
    ]
    table = load.render_markdown(levels, cost_per_generation=0.01)
    rows = [line for line in table.splitlines() if line.startswith("| ") and line[2].isdigit()]
    assert len(rows) == 2
    assert "Estimated cost: $0.03." in table
    assert "1 x boom" in table
