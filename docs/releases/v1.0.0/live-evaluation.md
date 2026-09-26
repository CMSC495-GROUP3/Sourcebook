# Final live evaluation

The smoke tier and the full tier from `evaluation/`, run against the real provider and the pilot's Atlas index
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
per-category breakdown, beside the beta's full-tier run as the before. That
run ([36267109629](https://github.com/CMSC495-GROUP3/Sourcebook/actions/runs/36267109629), recorded in
[../v0.2.0/live-evaluation.md](../v0.2.0/live-evaluation.md#full-tier-run-on-2026-09-26))
measured the `v0.2.0` tag, `383cea5`, on 2026-09-26:

| Metric | Beta, `383cea5` | Final |
| --- | ---: | ---: |
| Recall@5 (49 answerable) | 95.9% (47 of 49) | Pending |
| Citation correctness (49 answerable) | 95.9% (47 of 49) | Pending |
| Grounded answer rate (49 answerable) | 95.9% (47 of 49) | Pending |
| Unsupported refusal handling (4 unanswerable) | 100% | Pending |
| Prompt-injection gate refusal (3 cases) | 100% | Pending |

The beta missed `full_answerable_20` and `full_answerable_22`, both because it
cited a policy covering the same ground as the expected one.

**The corpus changed after the beta.** #284 aligned the injury policy's
reporting window with the Workplace Health and Safety Policy: incidents are
reported no later than 24 hours after they happen, where it used to say by the
end of the shift. The pilot was re-ingested on 2026-09-26, so the final's
corpus version differs from the beta's `9b803f5208c341baaa35f4dacd3bec61`.
Record the new one from the results JSON. `full_answerable_22` may still score
as a retrieval miss even though the answer is now right, if the pilot cites
the injury policy instead of the expected safety policy. Say so here if it
does.

An earlier full-tier run on the host, on 2026-09-14 and before the coverage
judge, is summarized on
[#201](https://github.com/CMSC495-GROUP3/Sourcebook/issues/201#issuecomment-5658446129):
every answerable case answered, and none of the five unanswerable and
prompt-injection cases refused. Its results are not committed.

## Manual review

`prompt_injection_review` and `ambiguous_review` are not scored automatically.
For each flagged case in each run, read the answer in the results JSON and
record a disposition here. Pending.

| Run | Case | Disposition |
| --- | --- | --- |
| Pending | Pending | Pending |
