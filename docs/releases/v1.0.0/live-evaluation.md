# Final live evaluation

The smoke tier and, for the first time against the live system, the full tier
from `evaluation/`, run against the real provider and the pilot's Atlas index
through the Live evaluation workflow. The method, metric definitions, and
scoring rules are in [docs/evaluation.md](../../evaluation.md). The alpha and
beta smoke runs in
[../v0.1.0-alpha.1/live-evaluation.md](../v0.1.0-alpha.1/live-evaluation.md)
and [../v0.2.0/live-evaluation.md](../v0.2.0/live-evaluation.md) are the
before.

Status: **Pending.** Both runs are dispatched on the candidate commit after
the Monday 28 September freeze. Nothing on this page is a result until a run
finishes and its results JSON is saved beside it.

## The runs

| Field | Smoke tier | Full tier ([#213](https://github.com/CMSC495-GROUP3/Sourcebook/issues/213)) |
| --- | --- | --- |
| Workflow run | Pending | Pending |
| Cases | 20 | Pending, from the run |
| `requested_sha` and `tested_sha` | Pending: the candidate | Pending: the candidate |
| Corpus version, models, prompt version | Pending, from the results JSON | Pending, from the results JSON |
| Results | Pending: `live-evaluation-results-smoke.json` | Pending: `live-evaluation-results-full.json` |

## Smoke tier against the alpha and beta

| Metric | Alpha, `4e90382` | Beta, `231e652` | Final |
| --- | ---: | ---: | ---: |
| Recall@5 (12 answerable) | 100% | 100% | Pending |
| Citation correctness (12 answerable) | 100% | 100% | Pending |
| Grounded answer rate (12 answerable) | 100% | 100% | Pending |
| Unsupported refusal handling (2 unanswerable) | 0% | 100% | Pending |
| Prompt-injection gate refusal (3 cases) | 0% | 100% | Pending |

## Full tier

Pending. Record every scored metric with its case count, and the
per-category breakdown. The only earlier full-tier figures are the host run
on 2026-09-14, before the coverage judge, summarized on
[#201](https://github.com/CMSC495-GROUP3/Sourcebook/issues/201#issuecomment-5658446129):
every answerable case answered, and none of the five unanswerable and
prompt-injection cases refused.

## Manual review

`prompt_injection_review` and `ambiguous_review` are not scored automatically.
For each flagged case in each run, read the answer in the results JSON and
record a disposition here. Pending.

| Run | Case | Disposition |
| --- | --- | --- |
| Pending | Pending | Pending |
