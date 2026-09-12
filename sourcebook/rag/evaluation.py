"""Run and score the labeled AI evaluation set.

The unit tests exercise dataset validation and metric calculations without any
network access. The command line runner uses the configured MongoDB and model
provider, so it is intentionally separate from ``make check``.

Two tiers are supported:

* ``smoke`` — the bounded routine set in ``evaluation/questions.json``
* ``full`` — one supported retrieval question per sample policy, plus refusal,
  ambiguity, and prompt-injection coverage
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
from collections import Counter
from collections.abc import Iterable, Mapping
from pathlib import Path
from typing import Any

from sourcebook.rag.documents import parse_document

ALLOWED_CATEGORIES = {
    "answerable",
    "unanswerable",
    "ambiguous",
    "prompt_injection",
}
# Categories whose labeled outcome must be refuse; scored as refusal metrics.
REFUSAL_CATEGORIES = {"unanswerable", "prompt_injection"}
ALLOWED_OUTCOMES = {"answer", "clarify", "refuse"}
REQUIRED_FIELDS = {
    "id",
    "category",
    "question",
    "expected_sources",
    "expected_outcome",
    "expected_behavior",
}

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CORPUS_DIR = REPO_ROOT / "data" / "sample-policies"
EVALUATION_TIERS = {
    "smoke": REPO_ROOT / "evaluation" / "questions.json",
    "full": REPO_ROOT / "evaluation" / "questions_full.json",
}
# Smoke stays at 20 cases with the corpus-reconciled category mix.
SMOKE_CASE_COUNT = 20
SMOKE_CATEGORY_MIX = {
    "answerable": 12,
    "unanswerable": 2,
    "ambiguous": 3,
    "prompt_injection": 3,
}

# Live Actions / paid CLI must refuse empty secrets before any provider call.
REQUIRED_LIVE_ENV_VARS = ("OPENAI_API_KEY", "MONGODB_URI", "MONGODB_DB")
# Keys ``score_results`` always emits; Actions postflight rejects anything else.
REQUIRED_RESULT_METRIC_KEYS = (
    "evaluated_cases",
    "category_counts",
    "recall_at_5",
    "citation_correctness",
    "grounded_answer_rate",
    "unsupported_refusal_handling",
    "prompt_injection_grounding_gate_refusal",
    "prompt_injection_review",
    "ambiguous_review",
)
_RATE_METRIC_KEYS = (
    "recall_at_5",
    "citation_correctness",
    "grounded_answer_rate",
    "unsupported_refusal_handling",
    "prompt_injection_grounding_gate_refusal",
)


def require_live_env(environ: Mapping[str, str] | None = None) -> None:
    """Fail closed when required live-evaluation env values are missing or blank.

    Empty strings count as missing. GitHub environment secrets that exist but
    hold no value therefore cannot reach PyMongo as ``InvalidName``.
    """
    env = os.environ if environ is None else environ
    missing = [name for name in REQUIRED_LIVE_ENV_VARS if not str(env.get(name, "")).strip()]
    if missing:
        raise ValueError(
            "Live evaluation requires non-empty environment values for: " + ", ".join(missing)
        )


def _validate_rate_metric(name: str, value: Any) -> None:
    """Accept ``None`` (no eligible cases) or a finite percentage in ``[0, 100]``.

    ``NaN`` and ``±inf`` must fail closed: comparisons against ``0``/``100`` are
    false for ``NaN``, so a non-finite check is required before the range gate.
    """
    if value is None:
        return
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"Evaluation metric {name} must be a number or null")
    if not math.isfinite(value):
        raise ValueError(f"Evaluation metric {name} must be a finite number")
    if value < 0 or value > 100:
        raise ValueError(f"Evaluation metric {name} must be between 0 and 100")


def validate_results_report(report: Mapping[str, Any]) -> dict[str, Any]:
    """Reject an evaluation report that is missing required metrics or cases."""
    if not isinstance(report, Mapping):
        raise ValueError("Evaluation results must be a JSON object")

    metrics = report.get("metrics")
    if not isinstance(metrics, Mapping):
        raise ValueError("Evaluation results are missing a metrics object")

    missing = [key for key in REQUIRED_RESULT_METRIC_KEYS if key not in metrics]
    if missing:
        raise ValueError("Evaluation metrics are missing required keys: " + ", ".join(missing))

    evaluated_cases = metrics["evaluated_cases"]
    if not isinstance(evaluated_cases, int) or isinstance(evaluated_cases, bool):
        raise ValueError("evaluated_cases must be an integer")
    if evaluated_cases < 1:
        raise ValueError("evaluated_cases must be at least 1 for a live evaluation run")

    category_counts = metrics["category_counts"]
    if not isinstance(category_counts, Mapping):
        raise ValueError("category_counts must be an object")
    for category in sorted(ALLOWED_CATEGORIES):
        if category not in category_counts:
            raise ValueError(f"category_counts is missing {category}")
        count = category_counts[category]
        if not isinstance(count, int) or isinstance(count, bool) or count < 0:
            raise ValueError(f"category_counts[{category}] must be a non-negative integer")
    if sum(int(category_counts[category]) for category in ALLOWED_CATEGORIES) != evaluated_cases:
        raise ValueError("category_counts must sum to evaluated_cases")

    for key in _RATE_METRIC_KEYS:
        _validate_rate_metric(key, metrics[key])

    for review_key in ("prompt_injection_review", "ambiguous_review"):
        review = metrics[review_key]
        if not isinstance(review, Mapping):
            raise ValueError(f"{review_key} must be an object")
        if "count" not in review or "case_ids" not in review:
            raise ValueError(f"{review_key} must include count and case_ids")

    results = report.get("results")
    if not isinstance(results, list) or not results:
        raise ValueError("Evaluation results must include a non-empty results list")
    if len(results) != evaluated_cases:
        raise ValueError(
            f"results length ({len(results)}) does not match evaluated_cases ({evaluated_cases})"
        )

    return dict(report)


def validate_results_file(path: str | Path) -> dict[str, Any]:
    """Load ``evaluation/results.json`` and reject missing or malformed reports."""
    results_path = Path(path)
    if not results_path.is_file():
        raise ValueError(f"Evaluation results file is missing: {results_path}")
    try:
        payload = json.loads(results_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"Evaluation results file is not valid JSON: {results_path}") from exc
    return validate_results_report(payload)


def sample_policy_titles(corpus_dir: str | Path | None = None) -> set[str]:
    """Return Title headers from the sample policy corpus."""
    root = Path(corpus_dir) if corpus_dir is not None else DEFAULT_CORPUS_DIR
    if not root.is_dir():
        raise ValueError(f"Sample policy corpus not found: {root}")

    titles: set[str] = set()
    for path in sorted(root.iterdir()):
        if not path.is_file() or path.name.startswith("."):
            continue
        document = parse_document(path.name, path.read_text(encoding="utf-8"))
        title = document.get("title")
        if not isinstance(title, str) or not title.strip():
            raise ValueError(f"Sample policy {path.name} is missing a Title header")
        titles.add(title.strip())
    if not titles:
        raise ValueError(f"No sample policies found in {root}")
    return titles


def validate_sources_against_corpus(
    cases: list[dict[str, Any]],
    corpus_dir: str | Path | None = None,
) -> None:
    """Reject expected_sources that do not match a sample policy Title."""
    titles = sample_policy_titles(corpus_dir)
    unknown: list[str] = []
    for case in cases:
        for source in case["expected_sources"]:
            if source not in titles:
                unknown.append(f"{case['id']}: {source}")
    if unknown:
        raise ValueError(
            "Evaluation expected_sources missing from sample corpus: " + "; ".join(unknown)
        )


def load_cases(
    path: str | Path,
    *,
    corpus_dir: str | Path | None = None,
    require_corpus_titles: bool = True,
) -> list[dict[str, Any]]:
    """Load a JSON evaluation set and reject incomplete or duplicate cases."""
    dataset_path = Path(path)
    cases = json.loads(dataset_path.read_text(encoding="utf-8"))
    if not isinstance(cases, list):
        raise ValueError("Evaluation dataset must be a JSON list")

    seen: set[str] = set()
    for index, case in enumerate(cases, start=1):
        if not isinstance(case, dict):
            raise ValueError(f"Evaluation case {index} must be an object")

        missing = REQUIRED_FIELDS - case.keys()
        if missing:
            raise ValueError(f"Evaluation case {index} is missing: {', '.join(sorted(missing))}")

        case_id = case["id"]
        if not isinstance(case_id, str) or not case_id.strip():
            raise ValueError(f"Evaluation case {index} has an invalid id")
        if case_id in seen:
            raise ValueError(f"Duplicate evaluation case id: {case_id}")
        seen.add(case_id)

        if case["category"] not in ALLOWED_CATEGORIES:
            raise ValueError(f"Evaluation case {case_id} has an invalid category")
        if case["expected_outcome"] not in ALLOWED_OUTCOMES:
            raise ValueError(f"Evaluation case {case_id} has an invalid outcome")
        if case["category"] in REFUSAL_CATEGORIES and case["expected_outcome"] != "refuse":
            raise ValueError(
                f"Evaluation case {case_id} category {case['category']} "
                'requires expected_outcome "refuse"'
            )
        if not isinstance(case["question"], str) or not case["question"].strip():
            raise ValueError(f"Evaluation case {case_id} has an empty question")
        if not isinstance(case["expected_sources"], list) or not all(
            isinstance(source, str) and source.strip() for source in case["expected_sources"]
        ):
            raise ValueError(f"Evaluation case {case_id} has invalid expected sources")
        if not isinstance(case["expected_behavior"], str) or not case["expected_behavior"].strip():
            raise ValueError(f"Evaluation case {case_id} has empty expected behavior")

    if require_corpus_titles:
        validate_sources_against_corpus(cases, corpus_dir=corpus_dir)

    return cases


def resolve_dataset(tier: str | None = None, dataset: Path | None = None) -> tuple[str, Path]:
    """Map an explicit tier or dataset path to ``(tier_label, path)``."""
    if tier is not None and dataset is not None:
        raise ValueError("Specify either --tier or --dataset, not both")
    if tier is not None:
        if tier not in EVALUATION_TIERS:
            raise ValueError(f"Unknown evaluation tier: {tier}")
        return tier, EVALUATION_TIERS[tier]
    if dataset is not None:
        return "custom", Path(dataset)
    return "smoke", EVALUATION_TIERS["smoke"]


def _percentage(outcomes: Iterable[bool]) -> float | None:
    values = list(outcomes)
    if not values:
        return None
    return round(100 * sum(values) / len(values), 1)


def extract_answer_citations(answer: str, known_titles: Iterable[str]) -> list[str]:
    """Return known policy titles that appear in the generated answer text.

    Matching is case-insensitive and prefers longer titles first so a short
    title cannot claim a hit inside a longer one. Only titles from the
    retrieved set are considered; this measures whether the answer named a
    retrieved policy, not whether the UI listed retrieval hits.
    """
    titles = [title for title in known_titles if isinstance(title, str) and title.strip()]
    if not answer or not titles:
        return []

    haystack = answer.casefold()
    matched: list[tuple[int, str]] = []
    occupied: list[tuple[int, int]] = []

    for title in sorted(titles, key=len, reverse=True):
        needle = title.casefold()
        start = 0
        while True:
            index = haystack.find(needle, start)
            if index < 0:
                break
            end = index + len(needle)
            overlaps = any(
                index < occupied_end and end > occupied_start
                for occupied_start, occupied_end in occupied
            )
            if not overlaps:
                matched.append((index, title))
                occupied.append((index, end))
                break
            start = index + 1

    matched.sort(key=lambda item: item[0])
    return [title for _, title in matched]


def run_live_case(case: dict[str, Any]) -> dict[str, Any]:
    """Execute one case through the configured retrieval and answer pipeline."""
    from sourcebook.rag.llm import get_provider
    from sourcebook.rag.rag_chain import (
        build_messages,
        cited_sources,
        confidence_score,
        is_grounded,
        retrieve_passages,
    )

    passages = retrieve_passages(case["question"], k=5)
    retrieved_sources = cited_sources(passages)
    grounded = is_grounded(passages)

    answer = ""
    if grounded:
        answer = get_provider().complete(
            build_messages(case["question"], passages, []),
            role="answer",
            temperature=0,
        )

    # Displayed attribution mirrors what the chat API attaches to an answered
    # turn (retrieved titles). Answer citations are derived separately.
    displayed_sources = retrieved_sources if grounded else []
    answer_citations = extract_answer_citations(answer, retrieved_sources)

    return {
        "id": case["id"],
        "category": case["category"],
        "question": case["question"],
        "retrieved_sources": retrieved_sources,
        "displayed_sources": displayed_sources,
        "cited_sources": answer_citations,
        "confidence": confidence_score(passages),
        "refused": not grounded,
        "answer": answer,
    }


def _category_counts(cases: list[dict[str, Any]]) -> dict[str, int]:
    """Return a count for every allowed category, including zeros.

    Uses ``Counter`` so the sum of counts equals ``len(cases)`` whenever every
    case category is in ``ALLOWED_CATEGORIES`` (enforced by ``load_cases``).
    """
    counted = Counter(case["category"] for case in cases)
    return {category: counted[category] for category in sorted(ALLOWED_CATEGORIES)}


def _ambiguous_review(cases: list[dict[str, Any]]) -> dict[str, Any]:
    """Describe ambiguous cases that still need human clarification review.

    Clarification quality is not scored automatically: the live runner only
    records grounding/refusal and source lists, which cannot tell whether the
    assistant asked for the right missing detail.
    """
    ambiguous_ids = [case["id"] for case in cases if case["category"] == "ambiguous"]
    return {
        "count": len(ambiguous_ids),
        "case_ids": ambiguous_ids,
        "status": "manual_review_required" if ambiguous_ids else "none",
        "clarification_scoring": "manual",
        "clarification_scoring_reason": (
            "No honest automated clarification metric: refusal and source "
            "matching cannot judge whether a clarification asked for the "
            "right missing detail."
        ),
    }


def _prompt_injection_review(cases: list[dict[str, Any]]) -> dict[str, Any]:
    """List injection cases whose generated prose needs human review."""
    case_ids = [case["id"] for case in cases if case["category"] == "prompt_injection"]
    return {
        "count": len(case_ids),
        "case_ids": case_ids,
        "status": "manual_review_required" if case_ids else "none",
        "resistance_scoring": "manual",
        "resistance_scoring_reason": (
            "Grounding-gate refusal does not establish that generated prose resisted an injection."
        ),
    }


def score_results(cases: list[dict[str, Any]], results: list[dict[str, Any]]) -> dict[str, Any]:
    """Calculate Week 3 metrics, split by behavior category where it matters.

    Recall@5, citation correctness, and grounded answer rate use cases whose
    expected outcome is an answer. Unsupported-question refusals
    (``unanswerable``) and prompt-injection grounding-gate refusals are scored
    separately so one category cannot hide the other. Prompt resistance and
    ambiguous clarification quality stay explicitly manual.

    Citation fields are consumed as provided on each result
    (``cited_sources`` / ``retrieved_sources``). How the live runner populates
    those fields is independent of this category reporting layer.
    """
    result_by_id: dict[str, dict[str, Any]] = {}
    for result in results:
        result_id = result.get("id")
        if result_id in result_by_id:
            raise ValueError(f"Duplicate evaluation result id: {result_id}")
        result_by_id[result_id] = result

    missing = [case["id"] for case in cases if case["id"] not in result_by_id]
    if missing:
        raise ValueError(f"Missing evaluation results for: {', '.join(missing)}")

    answer_cases = [case for case in cases if case["expected_outcome"] == "answer"]
    unsupported_cases = [
        case
        for case in cases
        if case["category"] == "unanswerable" and case["expected_outcome"] == "refuse"
    ]
    injection_cases = [
        case
        for case in cases
        if case["category"] == "prompt_injection" and case["expected_outcome"] == "refuse"
    ]

    def source_match(case: dict[str, Any], result_field: str) -> bool:
        expected = set(case["expected_sources"])
        actual = set(result_by_id[case["id"]].get(result_field, []))
        return bool(expected & actual)

    def refused(case: dict[str, Any]) -> bool:
        return bool(result_by_id[case["id"]].get("refused", False))

    citation_matches = [source_match(case, "cited_sources") for case in answer_cases]

    return {
        "evaluated_cases": len(cases),
        "category_counts": _category_counts(cases),
        "recall_at_5": _percentage(
            source_match(case, "retrieved_sources") for case in answer_cases
        ),
        "citation_correctness": _percentage(citation_matches),
        "grounded_answer_rate": _percentage(
            not refused(case) and citation_matches[index] for index, case in enumerate(answer_cases)
        ),
        "unsupported_refusal_handling": _percentage(refused(case) for case in unsupported_cases),
        "prompt_injection_grounding_gate_refusal": _percentage(
            refused(case) for case in injection_cases
        ),
        "prompt_injection_review": _prompt_injection_review(cases),
        "ambiguous_review": _ambiguous_review(cases),
    }


def run_evaluation(cases: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Run every labeled question using the real configured services."""
    return [run_live_case(case) for case in cases]


def _confirm_paid_run(tier: str, case_count: int, dataset: Path, assume_yes: bool) -> bool:
    """Show the selected tier and case count before any paid provider call."""
    print(f"Evaluation tier: {tier}")
    print(f"Dataset: {dataset}")
    print(f"Cases selected: {case_count}")
    if assume_yes:
        return True
    if not sys.stdin.isatty():
        print(
            "Refusing to start a paid evaluation without an interactive confirmation or --yes.",
            file=sys.stderr,
        )
        return False
    try:
        reply = (
            input("Continue with live evaluation against paid providers? [y/N] ").strip().lower()
        )
    except EOFError:
        print(
            "Refusing to start a paid evaluation without an interactive confirmation or --yes.",
            file=sys.stderr,
        )
        return False
    return reply in {"y", "yes"}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group()
    source.add_argument(
        "--tier",
        choices=sorted(EVALUATION_TIERS),
        help="Named evaluation tier (smoke or full). Preferred over --dataset.",
    )
    source.add_argument(
        "--dataset",
        type=Path,
        help="Explicit path to a labeled question set (mutually exclusive with --tier)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("evaluation/results.json"),
        help="Where to write detailed results and metrics",
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Skip the interactive confirmation after printing the case count",
    )
    args = parser.parse_args(argv)

    # Argparse owns CLI exclusivity; resolve_dataset still rejects both for
    # library callers and defaults to the smoke tier when neither is set.
    tier, dataset = resolve_dataset(args.tier, args.dataset)

    cases = load_cases(dataset)
    if not _confirm_paid_run(tier, len(cases), dataset, assume_yes=args.yes):
        print("Aborted before paid execution.")
        return 1

    try:
        require_live_env()
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    results = run_evaluation(cases)
    metrics = score_results(cases, results)
    report = {
        "tier": tier,
        "dataset": str(dataset),
        "metrics": metrics,
        "results": results,
    }
    # Fail closed locally the same way Actions postflight does.
    validate_results_report(report)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    # Category counts and review lines live in the workflow heredoc table only.
    print(json.dumps(metrics, indent=2))
    print(f"Wrote detailed results to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
