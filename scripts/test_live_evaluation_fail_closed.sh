#!/bin/bash
# Synthetic fail-closed checks for Live evaluation Actions plumbing.
# No paid providers, no MongoDB, no network. Run from repo root or via CI.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"
# No PYTHONPATH export on purpose: the validator has to find the package
# on its own, the way the workflow invokes it.

# Prefer PYTHON from the environment, else python/python3 on PATH.
if [ -z "${PYTHON:-}" ]; then
  if command -v python >/dev/null 2>&1; then
    PYTHON=python
  else
    PYTHON=python3
  fi
fi

PASS=0
FAIL=0
WORK=

cleanup() {
  if [ -n "${WORK:-}" ] && [ -d "$WORK" ]; then
    rm -rf "$WORK"
  fi
}
trap cleanup EXIT

assert_eq() {
  local label=$1 expected=$2 actual=$3
  if [ "$expected" = "$actual" ]; then
    PASS=$((PASS + 1))
    echo "ok - $label"
  else
    FAIL=$((FAIL + 1))
    echo "not ok - $label (expected '$expected', got '$actual')" >&2
  fi
}

assert_contains() {
  local label=$1 needle=$2 haystack=$3
  if [[ "$haystack" == *"$needle"* ]]; then
    PASS=$((PASS + 1))
    echo "ok - $label"
  else
    FAIL=$((FAIL + 1))
    echo "not ok - $label (missing '$needle')" >&2
  fi
}

WORK=$(mktemp -d)
GOOD_RESULTS="$WORK/good-results.json"
BAD_RESULTS="$WORK/bad-results.json"
MISSING_RESULTS="$WORK/missing-results.json"
SUMMARY="$WORK/summary.txt"

"$PYTHON" - "$GOOD_RESULTS" <<'PY'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
path.write_text(
    json.dumps(
        {
            "tier": "smoke",
            "dataset": "evaluation/questions.json",
            "metrics": {
                "evaluated_cases": 2,
                "category_counts": {
                    "ambiguous": 0,
                    "answerable": 1,
                    "prompt_injection": 0,
                    "unanswerable": 1,
                },
                "recall_at_5": 100.0,
                "citation_correctness": 100.0,
                "grounded_answer_rate": 100.0,
                "unsupported_refusal_handling": 100.0,
                "prompt_injection_grounding_gate_refusal": None,
                "prompt_injection_review": {
                    "count": 0,
                    "case_ids": [],
                    "status": "none",
                    "resistance_scoring": "manual",
                },
                "ambiguous_review": {
                    "count": 0,
                    "case_ids": [],
                    "status": "none",
                    "clarification_scoring": "manual",
                },
            },
            "results": [
                {
                    "id": "a1",
                    "retrieved_sources": ["Policy A"],
                    "cited_sources": ["Policy A"],
                    "refused": False,
                },
                {
                    "id": "u1",
                    "retrieved_sources": [],
                    "cited_sources": [],
                    "refused": True,
                },
            ],
        },
        indent=2,
    )
    + "\n",
    encoding="utf-8",
)
PY

"$PYTHON" - "$BAD_RESULTS" <<'PY'
import json
import sys
from pathlib import Path

Path(sys.argv[1]).write_text(
    json.dumps(
        {
            "tier": "smoke",
            "metrics": {
                "evaluated_cases": 0,
                "category_counts": {
                    "ambiguous": 0,
                    "answerable": 0,
                    "prompt_injection": 0,
                    "unanswerable": 0,
                },
                "recall_at_5": None,
                "citation_correctness": None,
                "grounded_answer_rate": None,
                "unsupported_refusal_handling": None,
                "prompt_injection_grounding_gate_refusal": None,
                "prompt_injection_review": {"count": 0, "case_ids": []},
                "ambiguous_review": {"count": 0, "case_ids": []},
            },
            "results": [],
        }
    )
    + "\n",
    encoding="utf-8",
)
PY

# --- Env preflight ---
set +e
OUT=$(
  env -u OPENAI_API_KEY -u MONGODB_URI -u MONGODB_DB \
    "$PYTHON" scripts/validate_live_evaluation.py --check-env 2>&1
)
STATUS=$?
set -e
assert_eq "missing env exits nonzero" "1" "$STATUS"
assert_contains "missing env names MONGODB_DB" "MONGODB_DB" "$OUT"

set +e
OUT=$(
  OPENAI_API_KEY=key MONGODB_URI=mongodb://example MONGODB_DB='' \
    "$PYTHON" scripts/validate_live_evaluation.py --check-env 2>&1
)
STATUS=$?
set -e
assert_eq "empty MONGODB_DB exits nonzero" "1" "$STATUS"
assert_contains "empty MONGODB_DB message" "MONGODB_DB" "$OUT"

set +e
OUT=$(
  OPENAI_API_KEY=key MONGODB_URI=mongodb://example MONGODB_DB=policy_assistant \
    "$PYTHON" scripts/validate_live_evaluation.py --check-env 2>&1
)
STATUS=$?
set -e
assert_eq "complete env exits zero" "0" "$STATUS"
assert_contains "complete env confirmation" "present" "$OUT"

# --- Results postflight ---
set +e
OUT=$("$PYTHON" scripts/validate_live_evaluation.py --results "$MISSING_RESULTS" 2>&1)
STATUS=$?
set -e
assert_eq "missing results exits nonzero" "1" "$STATUS"
assert_contains "missing results message" "missing" "$OUT"

set +e
OUT=$("$PYTHON" scripts/validate_live_evaluation.py --results "$BAD_RESULTS" 2>&1)
STATUS=$?
set -e
assert_eq "malformed metrics exits nonzero" "1" "$STATUS"
assert_contains "malformed metrics message" "evaluated_cases" "$OUT"

set +e
OUT=$("$PYTHON" scripts/validate_live_evaluation.py --results "$GOOD_RESULTS" 2>&1)
STATUS=$?
set -e
assert_eq "valid fixture exits zero" "0" "$STATUS"
assert_contains "valid fixture reports evaluated_cases" "evaluated_cases=2" "$OUT"

# --- Injected evaluator failure vs pipe masking ---
# Without pipefail, tee hides a failing evaluator (the false-green defect).
set +e
(
  set +o pipefail
  "$PYTHON" -c 'import sys; print("boom", file=sys.stderr); sys.exit(2)' | tee "$SUMMARY" >/dev/null
)
NO_PIPEFAIL_STATUS=$?
set -e
assert_eq "without pipefail evaluator failure stays green" "0" "$NO_PIPEFAIL_STATUS"

# With pipefail, the same injected failure goes red.
set +e
(
  set -o pipefail
  "$PYTHON" -c 'import sys; print("boom", file=sys.stderr); sys.exit(2)' | tee "$SUMMARY" >/dev/null
)
PIPEFAIL_STATUS=$?
set -e
assert_eq "with pipefail injected evaluator failure is red" "2" "$PIPEFAIL_STATUS"

# Workflow source must keep the fail-closed controls that close run 34100074696.
WORKFLOW=".github/workflows/evaluation.yml"
assert_file_contains() {
  local label=$1 needle=$2
  if grep -Fq "$needle" "$WORKFLOW"; then
    PASS=$((PASS + 1))
    echo "ok - $label"
  else
    FAIL=$((FAIL + 1))
    echo "not ok - $label (missing '$needle' in $WORKFLOW)" >&2
  fi
}

assert_file_contains "workflow checks env" "validate_live_evaluation.py --check-env"
assert_file_contains "workflow enables pipefail" "set -euo pipefail"
assert_file_contains "workflow validates results" "validate_live_evaluation.py --results"

echo
echo "$PASS passed, $FAIL failed"
if [ "$FAIL" -ne 0 ]; then
  exit 1
fi
