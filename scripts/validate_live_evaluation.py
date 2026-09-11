#!/usr/bin/env python3
"""Fail-closed gates for the Live evaluation GitHub Action.

Used by ``.github/workflows/evaluation.yml`` before and after the paid runner:

* ``--check-env`` rejects missing/blank live secrets (especially ``MONGODB_DB``)
* ``--results PATH`` rejects absent or malformed ``evaluation/results.json``

These checks are intentionally free of provider/network access so CI and
synthetic scripts can prove red/green behaviour without spending API budget.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# The workflow runs this file by path, which puts scripts/ rather than the
# repository root on sys.path. Add the root so the package imports from any
# working directory without a PYTHONPATH export.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from policy_assistant.rag.evaluation import (
    require_live_env,
    validate_results_file,
)


def main(argv: list[str] | None = None) -> int:
    """Parse CLI flags and run the selected fail-closed check."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check-env",
        action="store_true",
        help="Require non-empty OPENAI_API_KEY, MONGODB_URI, and MONGODB_DB",
    )
    parser.add_argument(
        "--results",
        type=str,
        help="Path to evaluation/results.json that must contain valid metrics",
    )
    args = parser.parse_args(argv)

    if not args.check_env and not args.results:
        parser.error("Specify --check-env and/or --results")

    try:
        if args.check_env:
            require_live_env()
            print("Live evaluation environment values are present.")
        if args.results:
            report = validate_results_file(args.results)
            metrics = report["metrics"]
            print(
                "Validated evaluation results: "
                f"evaluated_cases={metrics['evaluated_cases']} "
                f"recall_at_5={metrics['recall_at_5']} "
                f"citation_correctness={metrics['citation_correctness']} "
                f"grounded_answer_rate={metrics['grounded_answer_rate']}"
            )
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
