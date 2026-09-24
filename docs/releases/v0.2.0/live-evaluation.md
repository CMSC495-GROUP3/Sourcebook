# Beta live evaluation

The smoke tier from `evaluation/questions.json`, run against the real
provider and the pilot's Atlas index through the Live evaluation workflow. The
method, metric definitions, and scoring rules are in
[docs/evaluation.md](../../evaluation.md). The alpha's run in
[../v0.1.0-alpha.1/live-evaluation.md](../v0.1.0-alpha.1/live-evaluation.md)
is the before.

Status: **Measured on 2026-09-24.** All five scored metrics are 100% on the
code under test. The results JSON and the manual review of the injection and
ambiguous answers are still Pending; see below.

The first attempt, [run 36058677141](https://github.com/CMSC495-GROUP3/Sourcebook/actions/runs/36058677141)
on `d82749d` (2026-09-24), failed before any paid call. PR #258 made the
evaluator record the corpus version through a helper that writes to the `meta`
collection, and the evaluation's database user is read-only, so Atlas refused
the write. [PR #268](https://github.com/CMSC495-GROUP3/Sourcebook/pull/268)
reads the version without writing. The measurement below ran on its merge
commit.

## The run

| Field | Value |
| --- | --- |
| Workflow run | [36062704072](https://github.com/CMSC495-GROUP3/Sourcebook/actions/runs/36062704072), success, 2026-09-24 21:38 to 21:39 UTC |
| Tier | smoke, 20 cases: 12 answerable, 2 unanswerable, 3 prompt injection, 3 ambiguous |
| `requested_sha` | `231e65224efa3ecf688af0f89b8d4d0ce924d153`, the merge of PR #268 |
| `tested_sha` | `231e65224efa3ecf688af0f89b8d4d0ce924d153`; the workflow's SHA gate and the results validator both require it to equal `requested_sha` |
| Corpus version, models, prompt version | Pending: in the results JSON and the run's summary page |
| Results | Pending: save the run's `evaluation-results` artifact as `live-evaluation-results.json` beside this page |

## Results against the alpha

| Metric | Alpha, `4e90382` | Beta |
| --- | ---: | ---: |
| Recall@5 (12 answerable) | 100% | 100% |
| Citation correctness (12 answerable) | 100% | 100% |
| Grounded answer rate (12 answerable) | 100% | 100% |
| Unsupported refusal handling (2 unanswerable) | 0% | 100% |
| Prompt-injection gate refusal (3 cases) | 0% | 100% |

The two refusal rows are the ones #192 was about. In the alpha, all five of
those cases cleared the gate and got a prose decline; here every one is
refused before answer generation. The three answerable metrics did not move,
so the coverage judge did not refuse any question the corpus covers.

The host run on #253's head `130c0fb` before it merged scored the same
([#253](https://github.com/CMSC495-GROUP3/Sourcebook/pull/253#issuecomment-5783418040)).
This run is the first on merged code through the workflow.

Twenty cases on a fictional corpus, run once, are evidence for this corpus and
this sample. They are not a quality guarantee, and a green workflow is
measurement, not a pass.

## Manual review

`prompt_injection_review` and `ambiguous_review` are not scored automatically.
The run flagged `prompt_injection_01` to `03` and `ambiguous_01` to `03`. For
each, read the answer in the results JSON and record a disposition here.
Pending.

| Case | Disposition |
| --- | --- |
| `prompt_injection_01` | Pending |
| `prompt_injection_02` | Pending |
| `prompt_injection_03` | Pending |
| `ambiguous_01` | Pending |
| `ambiguous_02` | Pending |
| `ambiguous_03` | Pending |
