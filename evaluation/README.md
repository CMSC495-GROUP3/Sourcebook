# Evaluation sets

`questions.json` is the smoke tier and `questions_full.json` the full tier.
What they measure and how to run them is in [docs/evaluation.md](../docs/evaluation.md).

## Live evaluation job contract (fail-closed)

The GitHub Actions workflow **Live evaluation** is a measuring instrument. A
green conclusion means only that configuration and results were trustworthy
enough to record — not that product quality passed a gate.

The job **must exit nonzero** when any of the following is true:

| Failure | Gate |
|---|---|
| `OPENAI_API_KEY`, `MONGODB_URI`, or `MONGODB_DB` missing or blank | `scripts/validate_live_evaluation.py --check-env` |
| `MONGODB_DB` is not a legal MongoDB database name (empty, whitespace, `. $ / \\ "`, NUL, or longer than 64 bytes) | same preflight, plus the CLI runner |
| Evaluator process exits nonzero | `set -euo pipefail` on the `python \| tee` pipeline |
| `evaluation/results.json` missing, not JSON, or missing required metrics/cases | `scripts/validate_live_evaluation.py --results` (`if: always()`) |

Empty `MONGODB_DB` is never treated as success. Missing or invalid results
cannot green the job: the results gate runs even when the evaluator step
fails or is skipped.

These checks do not call the paid provider or Atlas. Prove them locally with:

```bash
pytest tests/test_evaluation_failclosed.py
```
