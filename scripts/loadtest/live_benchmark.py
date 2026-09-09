"""Bounded real-service benchmark for the deployed pilot.

    BENCH_PASSWORD=... ./.venv/bin/python scripts/loadtest/live_benchmark.py \\
        --url https://sourcebook.duckdns.org --yes

This is the counterpart to run.py for the deployed stack: Caddy -> web (Nginx)
-> API with real OpenAI and Atlas, rate limits on, provider bounds on. Every
request costs money, so the run is small by design and capped twice: a hard
request cap and an error-count stop condition. run.py measures what the
thread pool can sustain with the model faked; this script measures what a user
of the pilot experiences, on a sample far too small for percentiles. Read
docs/alpha/live-benchmark.md for the protocol, the agreed targets, and the
results.

Each request records the path the server reports in its `done` event
(generated, cached, refused) next to the path the step expected, plus time to
first token, completion time, and any error. Rate limiting (HTTP 429) is
counted on its own, never as a failed answer. Answer text is not stored unless
--keep-answers is given, so the JSON file is safe to commit.
"""

from __future__ import annotations

import argparse
import asyncio
import getpass
import json
import os
import platform
import sys
import time
import uuid
from collections.abc import AsyncIterator, Iterable
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from urllib.parse import urlsplit, urlunsplit

import httpx

# Fictional Meridian Systems questions the sample corpus answers. The nonce
# appended at run time keeps the first ask out of the answer cache; the
# cached-repeat step sends the identical text so it hits.
FIRST_QUESTIONS = [
    "How many PTO days do I get in my first year?",
    "How much parental leave do I get?",
    "What is the 401(k) company match?",
    "What is the meal limit when travelling?",
]
FOLLOW_UP_QUESTION = "Does that change after five years of service?"
# Nothing in the sample corpus covers this, so the grounding gate should decline
# without a model call.
REFUSAL_QUESTION = "What is the boiling point of mercury at sea level?"

PATH_GENERATED = "generated"
PATH_CACHED = "cached"
PATH_REFUSED = "refused"
PATH_RATE_LIMITED = "rate-limited"
PATH_ERROR = "error"

# Proposed alpha targets. docs/alpha/live-benchmark.md says which of these the
# team agreed before the run; change them there and here together.
TARGETS = {
    "generated_ttft_p50_s": 4.0,
    "generated_total_max_s": 30.0,
    "cached_ttft_max_s": 1.5,
    "refused_total_max_s": 3.0,
    "error_rate_max": 0.0,
}

DEFAULT_COST_PER_GENERATION_USD = 0.01
STREAM_TIMEOUT_S = 120.0
LOGIN_TIMEOUT_S = 30.0


@dataclass
class Step:
    name: str
    question: str
    session_id: str
    expected: str


@dataclass
class Record:
    step: str
    expected: str
    observed: str = PATH_ERROR
    session_id: str = ""
    http_status: int | None = None
    ttft_s: float | None = None
    total_s: float | None = None
    follow_ups_s: float | None = None
    chunks: int = 0
    sources: int = 0
    confidence: int | None = None
    error: str | None = None
    answer: str | None = None
    started_at: str = ""

    @property
    def matched(self) -> bool:
        return self.observed == self.expected


def _login_url(base_url: str) -> str:
    parts = urlsplit(base_url)
    return urlunsplit((parts.scheme, parts.netloc, "/api/auth/login", "", ""))


def _stream_url(base_url: str) -> str:
    parts = urlsplit(base_url)
    return urlunsplit((parts.scheme, parts.netloc, "/api/chat/stream", "", ""))


def fetch_token(base_url: str, password: str) -> str:
    """One login before the timed work; the token carries the claims require_auth needs."""
    response = httpx.post(
        _login_url(base_url), json={"password": password}, timeout=LOGIN_TIMEOUT_S
    )
    response.raise_for_status()
    return response.json()["access_token"]


def build_plan(run_id: str, burst: int, max_requests: int) -> list[Step]:
    """The scripted workload, trimmed to the request cap.

    Order matters: the cached repeat must follow the first ask of the same
    text, and the follow-up must reuse the first ask's session so it has
    history and therefore skips the cache.
    """
    first = f"{FIRST_QUESTIONS[0]} [bench {run_id}]"
    first_session = f"bench-{run_id}-first"
    steps = [
        Step("uncached answer", first, first_session, PATH_GENERATED),
        Step("cached repeat", first, f"bench-{run_id}-repeat", PATH_CACHED),
        Step("follow-up", FOLLOW_UP_QUESTION, first_session, PATH_GENERATED),
        Step("refusal", REFUSAL_QUESTION, f"bench-{run_id}-refusal", PATH_REFUSED),
    ]
    for i in range(burst):
        question = f"{FIRST_QUESTIONS[(i + 1) % len(FIRST_QUESTIONS)]} [bench {run_id}-{i}]"
        steps.append(Step(f"burst {i + 1}", question, f"bench-{run_id}-burst-{i}", PATH_GENERATED))
    return steps[:max_requests]


def classify(payload_done: dict | None, http_status: int | None, error: str | None) -> str:
    """Name the path a request took from what the server sent back."""
    if http_status == 429:
        return PATH_RATE_LIMITED
    if error or payload_done is None:
        return PATH_ERROR
    if payload_done.get("refused"):
        return PATH_REFUSED
    if payload_done.get("cached"):
        return PATH_CACHED
    return PATH_GENERATED


async def consume_stream(lines: AsyncIterator[str], started: float, record: Record) -> dict | None:
    """Read one SSE stream to its end, filling in timings on the record.

    Returns the `done` payload, or None if the stream ended without one. The
    connection is held open through the follow-up event so the server's
    bookkeeping sees an ordinary client, not a hang-up.
    """
    done: dict | None = None
    answer_parts: list[str] = []
    async for line in lines:
        if not line.startswith("data: "):
            continue
        payload = json.loads(line[6:])
        if "chunk" in payload:
            record.chunks += 1
            answer_parts.append(payload["chunk"])
            if record.ttft_s is None:
                record.ttft_s = time.perf_counter() - started
        elif "error" in payload:
            record.error = payload["error"]
            record.total_s = time.perf_counter() - started
            return None
        elif payload.get("done"):
            done = payload
            record.total_s = time.perf_counter() - started
            record.sources = len(payload.get("sources") or [])
            record.confidence = payload.get("confidence")
        elif "follow_ups" in payload:
            record.follow_ups_s = time.perf_counter() - started
    if record.total_s is None:
        record.total_s = time.perf_counter() - started
    if done is None and record.error is None:
        record.error = "stream ended without a done event"
    record.answer = "".join(answer_parts)
    return done


async def run_step(client: httpx.AsyncClient, url: str, token: str, step: Step) -> Record:
    record = Record(
        step=step.name,
        expected=step.expected,
        session_id=step.session_id,
        started_at=datetime.now(UTC).isoformat(timespec="seconds"),
    )
    started = time.perf_counter()
    done: dict | None = None
    try:
        async with client.stream(
            "POST",
            url,
            headers={"Authorization": f"Bearer {token}"},
            json={"question": step.question, "session_id": step.session_id},
            timeout=httpx.Timeout(STREAM_TIMEOUT_S),
        ) as response:
            record.http_status = response.status_code
            if response.status_code == 200:
                done = await consume_stream(response.aiter_lines(), started, record)
            else:
                record.total_s = time.perf_counter() - started
                record.error = f"HTTP {response.status_code}"
    except Exception as exc:
        record.total_s = time.perf_counter() - started
        record.error = f"{type(exc).__name__}: {exc}"
    record.observed = classify(done, record.http_status, record.error)
    return record


def pct(values: Iterable[float], p: float) -> float | None:
    ordered = sorted(values)
    if not ordered:
        return None
    index = min(round(p / 100 * (len(ordered) - 1)), len(ordered) - 1)
    return ordered[index]


def summarize(records: list[Record], cost_per_generation: float) -> dict:
    """Counts, small-sample latency summaries, and target comparisons.

    Error rate excludes rate limiting: a 429 is the limiter doing its job and
    is reported on its own line, as the issue asks.
    """
    by_path: dict[str, int] = {}
    for r in records:
        by_path[r.observed] = by_path.get(r.observed, 0) + 1

    def timings(path: str, attr: str) -> list[float]:
        return [
            getattr(r, attr) for r in records if r.observed == path and getattr(r, attr) is not None
        ]

    generated_ttft = timings(PATH_GENERATED, "ttft_s")
    generated_total = timings(PATH_GENERATED, "total_s")
    cached_ttft = timings(PATH_CACHED, "ttft_s")
    refused_total = timings(PATH_REFUSED, "total_s")
    answered = [r for r in records if r.observed != PATH_RATE_LIMITED]
    errors = sum(1 for r in answered if r.observed == PATH_ERROR)
    error_rate = errors / len(answered) if answered else 0.0
    mismatches = [r.step for r in records if not r.matched]

    observed = {
        "generated_ttft_p50_s": pct(generated_ttft, 50),
        "generated_total_max_s": max(generated_total, default=None),
        "cached_ttft_max_s": max(cached_ttft, default=None),
        "refused_total_max_s": max(refused_total, default=None),
        "error_rate_max": error_rate,
    }
    checks = {
        key: None if observed[key] is None else observed[key] <= limit
        for key, limit in TARGETS.items()
    }
    return {
        "requests": len(records),
        "by_path": by_path,
        "rate_limited": by_path.get(PATH_RATE_LIMITED, 0),
        "errors": errors,
        "error_rate": error_rate,
        "path_mismatches": mismatches,
        "generated_ttft_s": {
            "n": len(generated_ttft),
            "p50": pct(generated_ttft, 50),
            "max": max(generated_ttft, default=None),
        },
        "generated_total_s": {
            "n": len(generated_total),
            "p50": pct(generated_total, 50),
            "max": max(generated_total, default=None),
        },
        "cached_ttft_s": {"n": len(cached_ttft), "max": max(cached_ttft, default=None)},
        "refused_total_s": {"n": len(refused_total), "max": max(refused_total, default=None)},
        "estimated_cost_usd": round(by_path.get(PATH_GENERATED, 0) * cost_per_generation, 4),
        "targets": TARGETS,
        "observed": observed,
        "checks": checks,
    }


def _fmt(value: float | None, unit: str = "s") -> str:
    return "n/a" if value is None else f"{value:.2f}{unit}"


def render_markdown(records: list[Record], summary: dict) -> str:
    """Tables ready to paste into docs/alpha/live-benchmark.md."""
    lines = [
        "| Step | Expected | Observed | HTTP | TTFT | Complete | Follow-ups | Sources | Confidence | Error |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for r in records:
        lines.append(
            f"| {r.step} | {r.expected} | {r.observed}{'' if r.matched else ' (mismatch)'} "
            f"| {r.http_status or ''} | {_fmt(r.ttft_s)} | {_fmt(r.total_s)} "
            f"| {_fmt(r.follow_ups_s)} | {r.sources} | {r.confidence if r.confidence is not None else ''} "
            f"| {r.error or ''} |"
        )
    lines += [
        "",
        "| Target | Limit | Observed | Result |",
        "| --- | --- | --- | --- |",
    ]
    for key, limit in summary["targets"].items():
        observed = summary["observed"][key]
        check = summary["checks"][key]
        result = "not measured" if check is None else ("pass" if check else "FAIL")
        unit = "" if key == "error_rate_max" else "s"
        lines.append(f"| {key} | {limit}{unit} | {_fmt(observed, unit)} | {result} |")
    lines += [
        "",
        f"Requests: {summary['requests']}. Rate limited: {summary['rate_limited']}. "
        f"Errors (excluding rate limits): {summary['errors']}. "
        f"Estimated cost: ${summary['estimated_cost_usd']:.2f}.",
    ]
    if summary["path_mismatches"]:
        lines.append(f"Path mismatches: {', '.join(summary['path_mismatches'])}.")
    return "\n".join(lines)


async def run(args: argparse.Namespace, password: str) -> dict:
    run_id = uuid.uuid4().hex[:8]
    plan = build_plan(run_id, args.burst, args.max_requests)
    token = fetch_token(args.url, password)
    url = _stream_url(args.url)
    records: list[Record] = []
    print(f"\n  live benchmark -> {args.url}  (run id {run_id}, {len(plan)} requests)\n")

    sequential = [s for s in plan if not s.name.startswith("burst")]
    burst = [s for s in plan if s.name.startswith("burst")]
    async with httpx.AsyncClient() as client:
        for step in sequential:
            record = await run_step(client, url, token, step)
            records.append(record)
            print(
                f"  {step.name:<16} {record.observed:<13} ttft {_fmt(record.ttft_s):>8} "
                f"total {_fmt(record.total_s):>8} {record.error or ''}"
            )
            errors = sum(1 for r in records if r.observed == PATH_ERROR)
            if errors >= args.max_errors:
                print(f"\n  stopping: {errors} errors reached --max-errors {args.max_errors}")
                burst = []
                break
            await asyncio.sleep(args.pause)
        if burst:
            print(f"\n  burst of {len(burst)} concurrent uncached questions")
            burst_records = await asyncio.gather(
                *[run_step(client, url, token, step) for step in burst]
            )
            for record in burst_records:
                records.append(record)
                print(
                    f"  {record.step:<16} {record.observed:<13} ttft {_fmt(record.ttft_s):>8} "
                    f"total {_fmt(record.total_s):>8} {record.error or ''}"
                )

    if not args.keep_answers:
        for record in records:
            record.answer = None

    summary = summarize(records, args.cost_per_generation)
    report = {
        "run_id": run_id,
        "date": datetime.now(UTC).isoformat(timespec="seconds"),
        "url": args.url,
        "label": args.label,
        # The build exposes no version route; the operator records the SHA by hand.
        "deployed_sha": args.deployed_sha or None,
        "client": {
            "platform": platform.platform(),
            "python": platform.python_version(),
            "location": args.client_location,
        },
        "plan": {
            "burst": args.burst,
            "max_requests": args.max_requests,
            "max_errors": args.max_errors,
            "pause_s": args.pause,
        },
        "records": [asdict(r) | {"matched": r.matched} for r in records],
        "summary": summary,
    }
    print("\n" + render_markdown(records, summary) + "\n")
    return report


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--url", default="https://sourcebook.duckdns.org")
    parser.add_argument(
        "--burst",
        type=int,
        default=3,
        help="Concurrent uncached questions after the sequential steps (0 disables).",
    )
    parser.add_argument(
        "--max-requests",
        type=int,
        default=8,
        help="Hard cap on chat requests for the run; the plan is trimmed to fit.",
    )
    parser.add_argument(
        "--max-errors",
        type=int,
        default=2,
        help="Stop the sequential steps and skip the burst once this many errors occur.",
    )
    parser.add_argument(
        "--pause",
        type=float,
        default=2.0,
        help="Seconds between sequential requests; keeps one client under CHAT_RATE_LIMIT.",
    )
    parser.add_argument(
        "--cost-per-generation", type=float, default=DEFAULT_COST_PER_GENERATION_USD
    )
    parser.add_argument("--deployed-sha", default="", help="Full SHA the pilot is running.")
    parser.add_argument(
        "--client-location", default="", help="Where the client ran, e.g. 'home, Maryland'."
    )
    parser.add_argument("--label", default="")
    parser.add_argument(
        "--keep-answers", action="store_true", help="Store answer text in the JSON."
    )
    parser.add_argument("--out", default="", help="Write the JSON report here.")
    parser.add_argument("--yes", action="store_true", help="Skip the paid-run confirmation.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if args.max_requests < 1:
        print("--max-requests must be at least 1", file=sys.stderr)
        return 2
    password = os.environ.get("BENCH_PASSWORD") or getpass.getpass("Pilot password: ")
    if not password:
        print("a password is required (BENCH_PASSWORD or the prompt)", file=sys.stderr)
        return 2
    planned = len(build_plan("preview", args.burst, args.max_requests))
    if not args.yes:
        answer = input(
            f"This sends up to {planned} paid chat requests to {args.url}. Continue? [y/N] "
        )
        if answer.strip().lower() not in ("y", "yes"):
            print("aborted")
            return 1
    report = asyncio.run(run(args, password))
    if args.out:
        with open(args.out, "w", encoding="utf-8") as handle:
            json.dump(report, handle, indent=2)
        print(f"  wrote {args.out}")
    return 0 if not report["summary"]["errors"] else 1


if __name__ == "__main__":
    sys.exit(main())
