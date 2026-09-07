"""Focused tests for offline query_logs report aggregation (issue #160).

Uses synthetic fixtures only. Does not open a real MongoDB connection or touch
production ``query_logs``.
"""

from __future__ import annotations

import copy
from datetime import UTC, datetime
from itertools import pairwise
from typing import Any

import pytest

from policy_assistant.rag import query_log_reports as reports

SINCE = datetime(2026, 8, 1, tzinfo=UTC)
UNTIL = datetime(2026, 9, 1, tzinfo=UTC)


def _doc(
    *,
    created_at: datetime,
    question_hash: str | None,
    refused: bool | None = False,
    best_score: float | None = 0.7,
    question_raw: str | None = "raw?",
    question_condensed: str | None = "condensed?",
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    row: dict[str, Any] = {"created_at": created_at}
    if question_hash is not None:
        row["question_hash"] = question_hash
    if refused is not None:
        row["refused"] = refused
    # Preserve explicit None (cache-hit / missing score) as a stored field.
    row["best_score"] = best_score
    if question_raw is not None:
        row["question_raw"] = question_raw
    if question_condensed is not None:
        row["question_condensed"] = question_condensed
    if extra:
        row.update(extra)
    return row


class SyntheticQueryLogs:
    """Minimal read-only collection that executes the report pipelines in memory.

    Write methods raise so the reporting path cannot silently depend on them.
    """

    def __init__(self, docs: list[dict[str, Any]]):
        self._docs = [copy.deepcopy(doc) for doc in docs]
        self.aggregate_calls: list[list[dict[str, Any]]] = []

    def insert_one(self, *_args, **_kwargs):
        raise AssertionError("query_log_reports must not write")

    def insert_many(self, *_args, **_kwargs):
        raise AssertionError("query_log_reports must not write")

    def update_one(self, *_args, **_kwargs):
        raise AssertionError("query_log_reports must not write")

    def update_many(self, *_args, **_kwargs):
        raise AssertionError("query_log_reports must not write")

    def delete_one(self, *_args, **_kwargs):
        raise AssertionError("query_log_reports must not write")

    def delete_many(self, *_args, **_kwargs):
        raise AssertionError("query_log_reports must not write")

    def bulk_write(self, *_args, **_kwargs):
        raise AssertionError("query_log_reports must not write")

    def find_one_and_update(self, *_args, **_kwargs):
        raise AssertionError("query_log_reports must not write")

    def aggregate(self, pipeline: list[dict[str, Any]]):
        self.aggregate_calls.append(pipeline)
        return list(self._run(pipeline, self._docs))

    def _run(
        self, pipeline: list[dict[str, Any]], docs: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        rows = [copy.deepcopy(doc) for doc in docs]
        for stage in pipeline:
            if len(stage) != 1:
                raise NotImplementedError(f"unsupported compound stage: {stage!r}")
            op, spec = next(iter(stage.items()))
            if op == "$match":
                rows = [row for row in rows if self._matches(row, spec)]
            elif op == "$group":
                rows = self._group(rows, spec)
            elif op == "$sort":
                rows = self._sort(rows, spec)
            elif op == "$limit":
                rows = rows[: int(spec)]
            elif op == "$facet":
                return [{name: self._run(branch, rows) for name, branch in spec.items()}]
            elif op == "$bucket":
                rows = self._bucket(rows, spec)
            else:
                raise NotImplementedError(f"unsupported stage {op}")
        return rows

    def _matches(self, doc: dict[str, Any], query: dict[str, Any]) -> bool:
        for field, condition in query.items():
            value = doc.get(field)
            if isinstance(condition, dict):
                for op, operand in condition.items():
                    if op == "$gte" and not (value is not None and value >= operand):
                        return False
                    if op == "$lt" and not (value is not None and value < operand):
                        return False
                    if op == "$ne" and value == operand:
                        return False
                    if op == "$eq" and value != operand:
                        return False
            elif value != condition:
                return False
        return True

    def _resolve(self, doc: dict[str, Any], expr: Any) -> Any:
        if isinstance(expr, str) and expr.startswith("$"):
            return doc.get(expr[1:])
        if isinstance(expr, dict):
            if "$eq" in expr:
                left, right = expr["$eq"]
                return self._resolve(doc, left) == self._resolve(doc, right)
            if "$cond" in expr:
                predicate, when_true, when_false = expr["$cond"]
                return when_true if self._resolve(doc, predicate) else when_false
        return expr

    def _accumulate(self, current: Any, spec: Any, doc: dict[str, Any], *, first: bool) -> Any:
        if isinstance(spec, dict):
            if "$sum" in spec:
                addend = self._resolve(doc, spec["$sum"])
                if addend is True:
                    addend = 1
                elif addend is False or addend is None:
                    addend = 0
                return (0 if current is None else current) + addend
            if "$first" in spec:
                if first:
                    return self._resolve(doc, spec["$first"])
                return current
            if "$min" in spec:
                value = self._resolve(doc, spec["$min"])
                if value is None:
                    return current
                if current is None:
                    return value
                return min(current, value)
            if "$max" in spec:
                value = self._resolve(doc, spec["$max"])
                if value is None:
                    return current
                if current is None:
                    return value
                return max(current, value)
            if "$avg" in spec:
                value = self._resolve(doc, spec["$avg"])
                total, count = (0.0, 0) if current is None else current
                if value is not None:
                    total += float(value)
                    count += 1
                return (total, count)
        raise NotImplementedError(f"unsupported accumulator {spec!r}")

    def _group(self, docs: list[dict[str, Any]], spec: dict[str, Any]) -> list[dict[str, Any]]:
        key_expr = spec["_id"]
        buckets: dict[Any, dict[str, Any]] = {}
        order: list[Any] = []
        for doc in docs:
            key = self._resolve(doc, key_expr)
            if key not in buckets:
                buckets[key] = {"_id": key}
                order.append(key)
                first = True
            else:
                first = False
            for field, accumulator in spec.items():
                if field == "_id":
                    continue
                buckets[key][field] = self._accumulate(
                    buckets[key].get(field),
                    accumulator,
                    doc,
                    first=first,
                )
        rows = []
        for key in order:
            row = buckets[key]
            for field, value in list(row.items()):
                if (
                    field != "_id"
                    and isinstance(value, tuple)
                    and len(value) == 2
                    and isinstance(spec.get(field), dict)
                    and "$avg" in spec[field]
                ):
                    total, count = value
                    row[field] = (total / count) if count else None
            rows.append(row)
        return rows

    def _sort(self, docs: list[dict[str, Any]], spec: dict[str, Any]) -> list[dict[str, Any]]:
        def sort_key(doc: dict[str, Any]) -> tuple:
            parts = []
            for field, direction in spec.items():
                value = doc.get(field)
                # Mirror Mongo's ascending nulls-first behaviour enough for ties.
                missing = value is None
                parts.append((missing, value if direction > 0 else _Invertible(value)))
            return tuple(parts)

        return sorted(docs, key=sort_key)

    def _bucket(self, docs: list[dict[str, Any]], spec: dict[str, Any]) -> list[dict[str, Any]]:
        boundaries = list(spec["boundaries"])
        default = spec.get("default", "out_of_range")
        counts: dict[Any, int] = {}
        for doc in docs:
            value = self._resolve(doc, spec["groupBy"])
            placed = False
            if value is not None:
                for left, right in pairwise(boundaries):
                    if left <= float(value) < right:
                        counts[left] = counts.get(left, 0) + 1
                        placed = True
                        break
            if not placed:
                counts[default] = counts.get(default, 0) + 1
        return [{"_id": key, "count": count} for key, count in counts.items()]


class _Invertible:
    """Negate comparable values for descending sorts while preserving None."""

    def __init__(self, value: Any):
        self.value = value

    def __lt__(self, other: _Invertible) -> bool:
        if self.value is None and other.value is None:
            return False
        if self.value is None:
            return True
        if other.value is None:
            return False
        return self.value > other.value


@pytest.fixture
def sample_docs() -> list[dict[str, Any]]:
    """Mixed refused / answered rows spanning the window and its edges."""
    return [
        # Inside window — refused content-gap cluster (hash a)
        _doc(
            created_at=datetime(2026, 8, 2, tzinfo=UTC),
            question_hash="hash-a",
            refused=True,
            best_score=0.41,
            question_raw="What is the dress code?",
            question_condensed="dress code",
        ),
        _doc(
            created_at=datetime(2026, 8, 3, tzinfo=UTC),
            question_hash="hash-a",
            refused=True,
            best_score=0.39,
            question_raw="Dress code details?",
            question_condensed="dress code",
        ),
        _doc(
            created_at=datetime(2026, 8, 4, tzinfo=UTC),
            question_hash="hash-a",
            refused=True,
            best_score=None,
            question_raw="Dress code again?",
            question_condensed="dress code",
        ),
        # FAQ candidate answered twice (hash b)
        _doc(
            created_at=datetime(2026, 8, 5, tzinfo=UTC),
            question_hash="hash-b",
            refused=False,
            best_score=0.81,
            question_raw="How much PTO?",
            question_condensed="pto accrual",
        ),
        _doc(
            created_at=datetime(2026, 8, 6, tzinfo=UTC),
            question_hash="hash-b",
            refused=False,
            best_score=0.88,
            question_raw="How much PTO do I get?",
            question_condensed="pto accrual",
        ),
        # Single answered row — excluded from FAQ by min_repeat
        _doc(
            created_at=datetime(2026, 8, 7, tzinfo=UTC),
            question_hash="hash-c",
            refused=False,
            best_score=0.95,
            question_raw="Remote work policy?",
            question_condensed="remote work",
        ),
        # Tie on count=2 with hash-d for stable _id sort
        _doc(
            created_at=datetime(2026, 8, 8, tzinfo=UTC),
            question_hash="hash-d",
            refused=True,
            best_score=0.22,
            question_raw="Secret sabbatical?",
            question_condensed="sabbatical",
        ),
        _doc(
            created_at=datetime(2026, 8, 9, tzinfo=UTC),
            question_hash="hash-d",
            refused=True,
            best_score=0.18,
            question_raw="Any sabbatical leave?",
            question_condensed="sabbatical",
        ),
        # Boundary: created_at == since → included
        _doc(
            created_at=SINCE,
            question_hash="hash-edge-start",
            refused=False,
            best_score=0.70,
            question_raw="edge start",
            question_condensed="edge start",
        ),
        # Boundary: created_at == until → excluded
        _doc(
            created_at=UNTIL,
            question_hash="hash-edge-end",
            refused=True,
            best_score=0.10,
            question_raw="edge end",
            question_condensed="edge end",
        ),
        # Outside window entirely
        _doc(
            created_at=datetime(2026, 7, 31, tzinfo=UTC),
            question_hash="hash-before",
            refused=True,
            best_score=0.05,
            question_raw="before window",
            question_condensed="before",
        ),
        # Malformed / sparse rows inside window
        _doc(
            created_at=datetime(2026, 8, 10, tzinfo=UTC),
            question_hash=None,
            refused=True,
            best_score=-0.5,
            question_raw=None,
            question_condensed="   ",
        ),
        _doc(
            created_at=datetime(2026, 8, 11, tzinfo=UTC),
            question_hash="hash-perfect",
            refused=False,
            best_score=1.0,
            question_raw="Perfect score",
            question_condensed="perfect",
        ),
        # Large-count hash for ranking pressure
        *[
            _doc(
                created_at=datetime(2026, 8, 12, i % 24, tzinfo=UTC),
                question_hash="hash-hot",
                refused=False,
                best_score=0.66,
                question_raw=f"hot question {i}",
                question_condensed="hot",
            )
            for i in range(25)
        ],
    ]


# ── Input validation ──────────────────────────────────────────────────────────


def test_parse_report_instant_date_and_zulu():
    assert reports.parse_report_instant("2026-08-01") == SINCE
    assert reports.parse_report_instant("2026-08-01T12:30:00Z") == datetime(
        2026, 8, 1, 12, 30, tzinfo=UTC
    )


def test_parse_report_instant_rejects_empty():
    with pytest.raises(reports.ReportInputError, match="Empty"):
        reports.parse_report_instant("  ")


def test_validate_window_and_bounds():
    with pytest.raises(reports.ReportInputError, match="strictly after"):
        reports.validate_window(SINCE, SINCE)
    with pytest.raises(reports.ReportInputError, match="between 1 and"):
        reports.validate_top(0)
    with pytest.raises(reports.ReportInputError, match="at least 2"):
        reports.validate_min_repeat(1)


def test_time_match_is_half_open():
    match = reports._time_match(SINCE, UNTIL)
    assert match == {"created_at": {"$gte": SINCE, "$lt": UNTIL}}


def test_pipelines_are_read_only_and_window_first():
    for pipeline in (
        reports.content_gap_pipeline(SINCE, UNTIL, 5),
        reports.faq_pipeline(SINCE, UNTIL, 5, 2),
        reports.score_distribution_pipeline(SINCE, UNTIL),
    ):
        assert list(pipeline[0]) == ["$match"]
        serialized = repr(pipeline)
        assert "$out" not in serialized
        assert "$merge" not in serialized


# ── Aggregation behaviour via synthetic collection ─────────────────────────────


def test_empty_dataset_is_deterministic():
    collection = SyntheticQueryLogs([])
    first = reports.run_report(since=SINCE, until=UNTIL, collection=collection)
    second = reports.run_report(since=SINCE, until=UNTIL, collection=collection)
    assert first == second
    assert "(none)" in first
    assert "count=0" in first
    assert "null_scores=0" in first
    assert len(collection.aggregate_calls) == 6  # three pipelines x two runs


def test_content_gaps_rank_refused_hashes_and_respect_window(sample_docs):
    collection = SyntheticQueryLogs(sample_docs)
    text = reports.run_report(since=SINCE, until=UNTIL, top=10, collection=collection)

    assert "hash-a" in text
    assert "hash-d" in text
    assert "hash-edge-end" not in text
    assert "hash-before" not in text
    # hash-a (3) before hash-d (2)
    assert text.index("hash-a") < text.index("hash-d")


def test_faq_min_repeat_and_stable_tie_break_via_id(sample_docs):
    # FAQ sees hash-hot=25, hash-a=3, hash-b=2, hash-d=2. Among count=2,
    # ascending _id puts hash-b before hash-d.
    collection = SyntheticQueryLogs(sample_docs)
    text = reports.run_report(since=SINCE, until=UNTIL, top=5, min_repeat=2, collection=collection)
    faq_section = text.split("2. FAQ candidates", 1)[1].split("3. Answered", 1)[0]

    assert "hash-hot" in faq_section
    assert "hash-c" not in faq_section  # count 1
    assert faq_section.index("hash-hot") < faq_section.index("hash-a")
    assert faq_section.index("hash-b") < faq_section.index("hash-d")
    assert "refused=" in faq_section


def test_score_distribution_nulls_bins_and_perfect_one(sample_docs):
    collection = SyntheticQueryLogs(sample_docs)
    text = reports.run_report(since=SINCE, until=UNTIL, collection=collection)

    assert "null_scores=" in text
    assert "[0.9, 1.0]" in text  # perfect 1.0 lands in final bin
    assert "out_of_range" in text  # negative best_score from sparse row
    assert "answered:" in text and "refused:" in text


def test_missing_sample_text_and_missing_hash_do_not_crash():
    docs = [
        _doc(
            created_at=datetime(2026, 8, 15, tzinfo=UTC),
            question_hash=None,
            refused=True,
            best_score=None,
            question_raw=None,
            question_condensed=None,
        ),
        _doc(
            created_at=datetime(2026, 8, 16, tzinfo=UTC),
            question_hash=None,
            refused=True,
            best_score=0.3,
            question_raw="  ",
            question_condensed="",
        ),
    ]
    text = reports.run_report(since=SINCE, until=UNTIL, collection=SyntheticQueryLogs(docs))
    assert "(missing hash)" in text
    assert "(no sample text logged)" in text


def test_large_counts_render_and_sort(sample_docs):
    collection = SyntheticQueryLogs(sample_docs)
    text = reports.run_report(since=SINCE, until=UNTIL, top=3, collection=collection)
    faq_section = text.split("2. FAQ candidates", 1)[1].split("3. Answered", 1)[0]
    assert "count=25" in faq_section
    assert faq_section.index("hash-hot") < faq_section.index("hash-a")


def test_report_path_only_calls_aggregate(sample_docs):
    collection = SyntheticQueryLogs(sample_docs)
    reports.run_report(since=SINCE, until=UNTIL, collection=collection)
    assert len(collection.aggregate_calls) == 3
    for pipeline in collection.aggregate_calls:
        assert pipeline[0]["$match"]["created_at"]["$gte"] == SINCE
        assert pipeline[0]["$match"]["created_at"]["$lt"] == UNTIL


def test_format_report_is_deterministic_for_same_inputs():
    gaps = [
        {"_id": "h2", "count": 2, "sample_raw": "b", "sample_condensed": "b"},
        {"_id": "h1", "count": 2, "sample_raw": "a", "sample_condensed": "a"},
    ]
    faq = [
        {
            "_id": "h2",
            "count": 4,
            "refused_count": 1,
            "sample_raw": "b",
            "sample_condensed": "b",
        }
    ]
    facet = {
        "answered_summary": [
            {
                "count": 3,
                "null_scores": 1,
                "min_score": 0.5,
                "max_score": 0.9,
                "avg_score": 0.7,
            }
        ],
        "refused_summary": [],
        "answered_bins": [{"_id": 0.5, "count": 2}, {"_id": 0.8, "count": 1}],
        "refused_bins": [],
    }
    kwargs = dict(
        since=SINCE,
        until=UNTIL,
        top=20,
        min_repeat=2,
        content_gaps=gaps,
        faq=faq,
        score_facet=facet,
    )
    assert reports.format_report(**kwargs) == reports.format_report(**kwargs)


def test_cli_rejects_bad_window(capsys):
    code = reports.main(["--since", "2026-09-01", "--until", "2026-08-01"])
    captured = capsys.readouterr()
    assert code == 2
    assert "Invalid arguments" in captured.err
