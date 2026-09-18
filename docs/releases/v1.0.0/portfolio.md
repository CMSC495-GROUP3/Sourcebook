# Unit 8 portfolio (pre-tag scaffold)

This is the grader's entry point for the Unit 8 final once `v1.0.0` exists.
**It is a scaffold. The tag has not been cut. Do not treat this folder, this
table, or the README row that points here as the submitted version.**

The submission will point at the tag, not at `main`. Until the follow-up PR
named in [#215](https://github.com/CMSC495-GROUP3/Sourcebook/issues/215)
writes the tagged SHA into this page, every row that says TBD stays TBD, and
every "current document" link is the file on `main` today, not a frozen tree.

Last tagged release: [`v0.1.0-alpha.1`](https://github.com/CMSC495-GROUP3/Sourcebook/releases/tag/v0.1.0-alpha.1)
at `d7199f5`. The beta cut ([#203](https://github.com/CMSC495-GROUP3/Sourcebook/issues/203))
has not happened. The map of the whole portfolio is
[#201](https://github.com/CMSC495-GROUP3/Sourcebook/issues/201).

## Rubric

One row per assignment bullet. "In the tree today" is a document a grader can
open on current `main`. "At tag" is what the freeze PR fills. Issue links are
the work that still has to land; they are not claims that the work is done.
Future filenames that are not on `main` are written in backticks, not as
links.

| Rubric bullet | In the tree today | At tag (TBD) | Tracking |
| --- | --- | --- | --- |
| Integrated system | [README](../../../README.md); deployed pilot at https://sourcebook.duckdns.org; [alpha handoff](../v0.1.0-alpha.1/handoff.md) | this row points into the tagged tree; the headline remaining defect is [#192](https://github.com/CMSC495-GROUP3/Sourcebook/issues/192). [#189](https://github.com/CMSC495-GROUP3/Sourcebook/issues/189) is closed ([PR #245](https://github.com/CMSC495-GROUP3/Sourcebook/pull/245)) | [#201](https://github.com/CMSC495-GROUP3/Sourcebook/issues/201) step 1; beta [#203](https://github.com/CMSC495-GROUP3/Sourcebook/issues/203) |
| AI feature | README [How a question is answered](../../../README.md#how-a-question-is-answered) and [Keeping the model honest](../../../README.md#keeping-the-model-honest) | same pages in the tagged tree, after the remaining gate work | [#192](https://github.com/CMSC495-GROUP3/Sourcebook/issues/192) |
| CI/CD evidence | Five workflows exist; no collected page on `main` | `docs/ci-cd.md` plus screenshots of green runs on the merge commit | [#207](https://github.com/CMSC495-GROUP3/Sourcebook/issues/207), draft [PR #228](https://github.com/CMSC495-GROUP3/Sourcebook/pull/228) |
| README | [README.md](../../../README.md) | this table's first row, the video link, and the contributions pointer, written after the tag | [#215](https://github.com/CMSC495-GROUP3/Sourcebook/issues/215) follow-up PR |
| API documentation | [docs/api.md](../../api.md) and [docs/openapi.json](../../openapi.json) | the same files in the tagged tree | [#204](https://github.com/CMSC495-GROUP3/Sourcebook/issues/204) closed by [PR #221](https://github.com/CMSC495-GROUP3/Sourcebook/pull/221) |
| Installation guide | [docs/install.md](../../install.md) | the same page in the tagged tree | [#205](https://github.com/CMSC495-GROUP3/Sourcebook/issues/205) closed by [PR #233](https://github.com/CMSC495-GROUP3/Sourcebook/pull/233) |
| User manual | alpha [evidence](../v0.1.0-alpha.1/evidence/README.md) and the browser pass in the [alpha handoff](../v0.1.0-alpha.1/handoff.md) | `docs/user-guide.md`, written after the beta browser pass | [#206](https://github.com/CMSC495-GROUP3/Sourcebook/issues/206) |
| Code reviews | CODEOWNERS and PR checks exist; no summary page | `docs/quality.md` review section with representative threads | [#208](https://github.com/CMSC495-GROUP3/Sourcebook/issues/208), draft [PR #232](https://github.com/CMSC495-GROUP3/Sourcebook/pull/232) |
| Coverage | CI fails under 80%; the job-summary table is not committed | `docs/releases/v1.0.0/evidence/coverage.md` for the tagged commit | [#210](https://github.com/CMSC495-GROUP3/Sourcebook/issues/210) |
| Benchmarks | synthetic [load-testing.md](../../load-testing.md); bounded real-service [alpha live-benchmark.md](../v0.1.0-alpha.1/live-benchmark.md) | this folder's `live-benchmark.md` after the three checks, plus the deployed load run if [#212](https://github.com/CMSC495-GROUP3/Sourcebook/issues/212) lands | [#212](https://github.com/CMSC495-GROUP3/Sourcebook/issues/212), alpha [#183](https://github.com/CMSC495-GROUP3/Sourcebook/issues/183) |
| Collaboration evidence | 100+ merged PRs and required CODEOWNERS review; no grader-facing index | `docs/quality.md` plus the threads it cites | [#208](https://github.com/CMSC495-GROUP3/Sourcebook/issues/208), draft [PR #232](https://github.com/CMSC495-GROUP3/Sourcebook/pull/232) |
| Contributions | README [Team](../../../README.md#team) | `docs/team.md` and `.mailmap`, each member checking their row | [#209](https://github.com/CMSC495-GROUP3/Sourcebook/issues/209), draft [PR #231](https://github.com/CMSC495-GROUP3/Sourcebook/pull/231) |

## Folder status

Same skeleton as [v0.1.0-alpha.1](../v0.1.0-alpha.1/handoff.md), minus
measurements, plus this page. Banners on every file in this folder say the
tag is not cut.

| File | Status on this scaffold |
| --- | --- |
| [portfolio.md](portfolio.md) | this page; rubric rows are pre-tag |
| [release-notes.md](release-notes.md) | skeleton: known defects and what the release does not establish. No tagged commit |
| [handoff.md](handoff.md) | pre-tag blocker table. Not a verification record |
| `live-benchmark.md` | **not written.** Do not invent one. Copy the alpha page and fill it when the freeze re-runs the bounded check |
| `live-evaluation.md` | **not written.** Do not invent one. Last recorded smoke-tier write-up is the [alpha](../v0.1.0-alpha.1/live-evaluation.md). That run's refusal metrics are 0% and are [#192](https://github.com/CMSC495-GROUP3/Sourcebook/issues/192), not a PASS |
| [evidence/](evidence/README.md) | empty. Screenshots and the coverage table land at freeze |

## Required merge order before the grouped index grows

This pull request is the documentation-index integrator. It must not link
pages that are not on `origin/main`. After those pages land, merge current
`main` into this branch and add the grouped rows. Until then the index names
only files that already exist.

1. [PR #228](https://github.com/CMSC495-GROUP3/Sourcebook/pull/228) lands `docs/ci-cd.md` ([#207](https://github.com/CMSC495-GROUP3/Sourcebook/issues/207)).
2. [PR #231](https://github.com/CMSC495-GROUP3/Sourcebook/pull/231) lands `.mailmap` and `docs/team.md` ([#209](https://github.com/CMSC495-GROUP3/Sourcebook/issues/209)).
3. [PR #232](https://github.com/CMSC495-GROUP3/Sourcebook/pull/232) lands `docs/quality.md` ([#208](https://github.com/CMSC495-GROUP3/Sourcebook/issues/208)).
4. Then this PR merges current `main` again and adds those links to the grouped README and [docs/README.md](../../README.md) tables.

Do not reverse that order. A forward link to a file that is only on a draft
branch is a broken link on `main`.

## Two routes in (unchanged from the alpha)

1. **The pilot**, https://sourcebook.duckdns.org. Reviewer password through
   the course channel, never this repository. The host follows `main`, so it
   is not the submitted version until someone parks it on the tag.
2. **Local stub.** [docs/install.md](../../install.md), or `git clone` then
   `make setup && make stub`. Fake model, in-memory database, no accounts.
   Retrieval quality cannot be judged here.

## What still has to happen before anyone tags `v1.0.0`

The order is [#201](https://github.com/CMSC495-GROUP3/Sourcebook/issues/201):
cut the beta ([#203](https://github.com/CMSC495-GROUP3/Sourcebook/issues/203)),
close the remaining documentation gaps
([#206](https://github.com/CMSC495-GROUP3/Sourcebook/issues/206)–[#209](https://github.com/CMSC495-GROUP3/Sourcebook/issues/209);
[#204](https://github.com/CMSC495-GROUP3/Sourcebook/issues/204) and
[#205](https://github.com/CMSC495-GROUP3/Sourcebook/issues/205) are already
on `main`),
then the exceed-the-bar items the unit still has time for
([#210](https://github.com/CMSC495-GROUP3/Sourcebook/issues/210)–[#214](https://github.com/CMSC495-GROUP3/Sourcebook/issues/214)),
then the freeze in [#215](https://github.com/CMSC495-GROUP3/Sourcebook/issues/215).
The video ([#216](https://github.com/CMSC495-GROUP3/Sourcebook/issues/216)) is
recorded after the tag. The shared numbers sheet
([#217](https://github.com/CMSC495-GROUP3/Sourcebook/issues/217)) is filled
from the tagged folder, not before.

Do not cut the tag from this PR.
