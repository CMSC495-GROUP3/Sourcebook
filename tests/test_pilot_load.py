"""Offline checks for scripts/loadtest/pilot_load.py.

The script loads the deployed pilot with the real model, so every request can
cost money and these tests never open a connection. They cover what bounds
the run and what the report says: the cap check, the per-level plan, the
level summary, the error stop, and the table pasted into the results page.
"""

import asyncio
import json

import httpx
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

    def test_refuses_an_out_path_it_cannot_write(self, tmp_path):
        problem = load.validate(_args("--out", str(tmp_path / "missing" / "report.json")))
        assert problem is not None
        assert "cannot write" in problem

    def test_the_plan_sends_exactly_what_the_cap_checks(self):
        levels = [5, 10, 20, 40]
        sent = sum(len(load.level_steps("r", c)) for c in levels)
        assert sent == load.planned_requests(levels) == 75

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
        summary = load.summarize_level(4, records, to_last_done_s=2.0)
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
        summary = load.summarize_level(3, records, to_last_done_s=1.0)
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

    def test_rate_limiting_does_not_end_the_run(self):
        async def send(step):
            return _record(bench.PATH_RATE_LIMITED, error="HTTP 429", status=429)

        levels, _ = asyncio.run(load.run_levels(send, "r", [2, 3], max_errors=1, settle_s=0))
        assert len(levels) == 2

    def test_a_level_just_under_the_error_limit_continues(self):
        async def send(step):
            if step.name.endswith("#1"):
                return _record(bench.PATH_ERROR, error="boom")
            return _record(bench.PATH_GENERATED, ttft=1.0, total=2.0)

        levels, _ = asyncio.run(load.run_levels(send, "r", [3, 3], max_errors=2, settle_s=0))
        assert len(levels) == 2

    def test_throughput_runs_to_the_last_done_not_the_follow_ups(self):
        async def send(step):
            # The stream stays open after `done` for the follow-ups.
            await asyncio.sleep(0.2)
            return _record(bench.PATH_GENERATED, ttft=0.01, total=0.05)

        levels, _ = asyncio.run(load.run_levels(send, "r", [4], max_errors=1, settle_s=0))
        level = levels[0]
        assert level["to_last_done_s"] < 0.1
        assert level["wall_incl_follow_ups_s"] >= 0.2
        assert level["throughput_rps"] == pytest.approx(4 / level["to_last_done_s"])

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
        load.summarize_level(2, [_record(bench.PATH_GENERATED, 1.0, 3.0)] * 2, 3.0),
        load.summarize_level(
            3,
            [_record(bench.PATH_GENERATED, 2.0, 5.0), _record(bench.PATH_ERROR, error="boom")],
            5.0,
        ),
    ]
    table = load.render_markdown(levels, cost_per_generation=0.01)
    rows = [line for line in table.splitlines() if line.startswith("| ") and line[2].isdigit()]
    assert len(rows) == 2
    assert "Estimated cost: $0.03." in table
    assert "1 x boom" in table


def test_delete_conversations_counts_each_outcome():
    seen = []

    def handler(request):
        seen.append(
            (request.method, request.url.raw_path.decode(), request.headers["authorization"])
        )
        status = {"a": 200, "b": 404}.get(request.url.path.rsplit("/", 1)[-1], 500)
        return httpx.Response(status, json={})

    async def go():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            return await load.delete_conversations(
                client, "https://pilot.test", "tok", ["a", "b", "c/d"]
            )

    counts = asyncio.run(go())
    assert counts == {"deleted": 1, "not_found": 1, "failed": 1}
    assert seen[0] == ("DELETE", "/api/conversations/a", "Bearer tok")
    # A session id is one path segment, whatever it contains.
    assert seen[2][1] == "/api/conversations/c%2Fd"


class TestMain:
    """main() end to end with the network replaced."""

    def _fake(self, monkeypatch, fail_on=None):
        deleted = []
        monkeypatch.setenv("BENCH_PASSWORD", "pw-secret")
        monkeypatch.setattr(load, "fetch_token", lambda url, password: "tok-secret")

        async def run_step(client, url, token, step):
            if fail_on and fail_on in step.name:
                raise RuntimeError("client died")
            record = _record(bench.PATH_GENERATED, ttft=0.1, total=0.5)
            record.session_id = step.session_id
            record.answer = "SECRET ANSWER"
            return record

        async def delete_conversations(client, base_url, token, session_ids):
            deleted.extend(session_ids)
            return {"deleted": len(session_ids), "not_found": 0, "failed": 0}

        monkeypatch.setattr(load, "run_step", run_step)
        monkeypatch.setattr(load, "delete_conversations", delete_conversations)
        return deleted

    def test_report_holds_no_answer_password_or_token(self, monkeypatch, tmp_path):
        deleted = self._fake(monkeypatch)
        out = tmp_path / "report.json"
        code = load.main(["--levels", "2", "3", "--settle", "0", "--yes", "--out", str(out)])
        assert code == 0
        text = out.read_text()
        for secret in ("SECRET ANSWER", "pw-secret", "tok-secret"):
            assert secret not in text
        report = json.loads(text)
        assert report["complete"] is True
        assert len(report["records"]) == 5
        assert report["cleanup"]["deleted"] == 5
        assert sorted(deleted) == sorted(r["session_id"] for r in report["records"])

    def test_declining_the_prompt_sends_nothing(self, monkeypatch):
        monkeypatch.setenv("BENCH_PASSWORD", "pw")
        monkeypatch.setattr(load, "fetch_token", lambda *a: pytest.fail("logged in"))
        monkeypatch.setattr("builtins.input", lambda prompt: "n")
        assert load.main(["--levels", "2"]) == 1

    def test_an_interrupted_run_keeps_its_evidence_and_cleans_up(self, monkeypatch, tmp_path):
        deleted = self._fake(monkeypatch, fail_on="c3 ")
        out = tmp_path / "report.json"
        with pytest.raises(RuntimeError):
            load.main(["--levels", "2", "3", "--settle", "0", "--yes", "--out", str(out)])
        report = json.loads(out.read_text())
        assert report["complete"] is False
        assert [level["concurrency"] for level in report["levels"]] == [2]
        # Every session that was sent is cleaned up, including the failed level's.
        assert len(deleted) == 5
        assert report["cleanup"]["deleted"] == 5

    def test_keep_conversations_skips_the_cleanup(self, monkeypatch, tmp_path):
        deleted = self._fake(monkeypatch)
        out = tmp_path / "report.json"
        load.main(["--levels", "2", "--yes", "--keep-conversations", "--out", str(out)])
        assert deleted == []
        assert json.loads(out.read_text())["cleanup"] is None
