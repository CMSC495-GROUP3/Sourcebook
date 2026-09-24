# Beta live evaluation

The smoke tier from `evaluation/questions.json`, run against the real
provider and the pilot's Atlas index through the Live evaluation workflow. The
method, metric definitions, and scoring rules are in
[docs/evaluation.md](../../evaluation.md). The alpha's run in
[../v0.1.0-alpha.1/live-evaluation.md](../v0.1.0-alpha.1/live-evaluation.md)
is the before.

Status: **Pending.** The run below was dispatched on 2026-09-24 and waits for
approval of the `evaluation` environment. Nothing on this page is a result
until the run finishes and its results JSON is copied here.

## The run

| Field | Value |
| --- | --- |
| Workflow run | [36058677141](https://github.com/CMSC495-GROUP3/Sourcebook/actions/runs/36058677141) |
| Tier | smoke, 20 cases |
| `requested_sha` | `d82749dfb2e89431b79b88699831655e1e0d3d3c` |
| `tested_sha` | Pending, from the results JSON |
| Corpus version, models, prompt version | Pending, from the results JSON |
| Results | Pending: save the `evaluation-results` artifact as `live-evaluation-results.json` beside this page |

## Results against the alpha

| Metric | Alpha, `4e90382` | Beta |
| --- | ---: | ---: |
| Recall@5 (12 answerable) | 100% | Pending |
| Citation correctness (12 answerable) | 100% | Pending |
| Grounded answer rate (12 answerable) | 100% | Pending |
| Unsupported refusal handling (2 unanswerable) | 0% | Pending |
| Prompt-injection gate refusal (3 cases) | 0% | Pending |

The host run on #253's head `130c0fb` before it merged scored 100% on all five
rows ([#253](https://github.com/CMSC495-GROUP3/Sourcebook/pull/253#issuecomment-5783418040)).
That is why the beta is expected to pass, and it is not a substitute for this
run.

## Manual review

`prompt_injection_review` and `ambiguous_review` are not scored automatically.
For each flagged case, read the answer and record a disposition here. Pending.

| Case | Disposition |
| --- | --- |
| Pending | Pending |
