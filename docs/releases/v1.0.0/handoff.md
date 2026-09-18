# Sourcebook v1.0.0 handoff (pre-tag scaffold)

**The tag is not cut. This page is the checklist that exists to stop anyone
cutting it early.** It is not a verification record. Nothing below is called
verified for `v1.0.0`.

Graders: start at [portfolio.md](portfolio.md). The last submitted tag is
[`v0.1.0-alpha.1`](https://github.com/CMSC495-GROUP3/Sourcebook/releases/tag/v0.1.0-alpha.1);
its handoff is [../v0.1.0-alpha.1/handoff.md](../v0.1.0-alpha.1/handoff.md).

This folder follows that alpha pattern
([#215](https://github.com/CMSC495-GROUP3/Sourcebook/issues/215) step 1) with
one addition, `portfolio.md`. `live-benchmark.md` and `live-evaluation.md`
are deliberately absent until the three checks are re-run against the
deployed candidate. Copy the alpha pages then; do not invent numbers.
`evidence/` is empty for the same reason.

## The submitted version

| Field | Value |
| --- | --- |
| Commit | TBD. The merge commit of the freeze PR, after CI and Security on that commit |
| Tag and release | **not cut.** Do not create `v1.0.0` from this scaffold |
| Running at | <https://sourcebook.duckdns.org> (follows `main`, not a tag) |
| Deployed commit | whatever `refs/deployed/main` is on the host today; not recorded here |
| CI | TBD: the push-to-main run on the freeze merge commit |
| Security | TBD: the push-to-main run on the freeze merge commit |
| Proposed tag | `v1.0.0`, annotated, **not** prerelease, only after the blocker table is clear |

## Where to start

- **See it running.** The pilot is at <https://sourcebook.duckdns.org>. The
  reviewer password comes through the course channel, not this repository.
- **Run it yourself.** [docs/install.md](../../install.md), or `git clone`
  then `make setup && make stub`. Fake model, in-memory database, no
  accounts. Do not check out `v1.0.0`.
- **Read the code.** The [README](../../../README.md) walks one question
  through retrieval, the grounding gate, and streaming.
  [docs/api.md](../../api.md) and [docs/openapi.json](../../openapi.json)
  are the committed HTTP contract.
  [CONTRIBUTING.md](../../../CONTRIBUTING.md) covers the development setup.

## Required merge order (this PR is last)

This pull request is the documentation-index integrator, not an advance
placeholder. It currently links only pages that exist on `origin/main`. Do
not add README or `docs/README.md` rows for files that live only on draft
branches.

1. [PR #228](https://github.com/CMSC495-GROUP3/Sourcebook/pull/228) merges and lands `docs/ci-cd.md` ([#207](https://github.com/CMSC495-GROUP3/Sourcebook/issues/207)).
2. [PR #231](https://github.com/CMSC495-GROUP3/Sourcebook/pull/231) merges and lands `.mailmap` plus `docs/team.md` ([#209](https://github.com/CMSC495-GROUP3/Sourcebook/issues/209)).
3. [PR #232](https://github.com/CMSC495-GROUP3/Sourcebook/pull/232) merges and lands `docs/quality.md` ([#208](https://github.com/CMSC495-GROUP3/Sourcebook/issues/208)).
4. Then this PR merges current `main` again and adds those grouped index
   links. Until step 4, those filenames stay in backticks in
   [portfolio.md](portfolio.md).

## Blockers before anyone tags

The tag is the claim that the Unit 8 final was verified. Cutting it from this
scaffold is the mistake this page exists to prevent. [#201](https://github.com/CMSC495-GROUP3/Sourcebook/issues/201)
is the order.

| Blocker | State |
| --- | --- |
| [#203](https://github.com/CMSC495-GROUP3/Sourcebook/issues/203) cut `v0.2.0-beta.1` | Open. Remaining correctness blocker is [#192](https://github.com/CMSC495-GROUP3/Sourcebook/issues/192). Closed since the scaffold was first written: [#189](https://github.com/CMSC495-GROUP3/Sourcebook/issues/189) ([PR #245](https://github.com/CMSC495-GROUP3/Sourcebook/pull/245)), [#118](https://github.com/CMSC495-GROUP3/Sourcebook/issues/118) ([PR #247](https://github.com/CMSC495-GROUP3/Sourcebook/pull/247)), [#158](https://github.com/CMSC495-GROUP3/Sourcebook/issues/158) ([PR #176](https://github.com/CMSC495-GROUP3/Sourcebook/pull/176)), [#160](https://github.com/CMSC495-GROUP3/Sourcebook/issues/160) ([PR #171](https://github.com/CMSC495-GROUP3/Sourcebook/pull/171)), [#174](https://github.com/CMSC495-GROUP3/Sourcebook/issues/174), [#223](https://github.com/CMSC495-GROUP3/Sourcebook/issues/223) ([PR #226](https://github.com/CMSC495-GROUP3/Sourcebook/pull/226)) |
| [#192](https://github.com/CMSC495-GROUP3/Sourcebook/issues/192), refusal card follows the model's own decline | Open. [#189](https://github.com/CMSC495-GROUP3/Sourcebook/issues/189) is closed. Alpha smoke-tier refusal metrics are 0% and remain the last committed measurement |
| Documentation pages #204–#209 | [#204](https://github.com/CMSC495-GROUP3/Sourcebook/issues/204) and [#205](https://github.com/CMSC495-GROUP3/Sourcebook/issues/205) are on `main` ([docs/api.md](../../api.md), [docs/openapi.json](../../openapi.json), [docs/install.md](../../install.md)). Still open: [#206](https://github.com/CMSC495-GROUP3/Sourcebook/issues/206), [#207](https://github.com/CMSC495-GROUP3/Sourcebook/issues/207) / draft [PR #228](https://github.com/CMSC495-GROUP3/Sourcebook/pull/228), [#208](https://github.com/CMSC495-GROUP3/Sourcebook/issues/208) / draft [PR #232](https://github.com/CMSC495-GROUP3/Sourcebook/pull/232), [#209](https://github.com/CMSC495-GROUP3/Sourcebook/issues/209) / draft [PR #231](https://github.com/CMSC495-GROUP3/Sourcebook/pull/231) |
| Re-run the three checks on the deployed candidate (browser pass, bounded benchmark, smoke-tier evaluation) | Not started for `v1.0.0`. Do not copy alpha numbers into new files and call them final |
| `live-benchmark.md`, `live-evaluation.md`, and `evidence/` filled from those checks | Not written |
| Video link | [#216](https://github.com/CMSC495-GROUP3/Sourcebook/issues/216), recorded after the tag |
| A commit on `main` after the work above, CI and Security green, then tag | Not chosen |

Hands-off elsewhere, still open, and not implemented from this folder:
[#142](https://github.com/CMSC495-GROUP3/Sourcebook/issues/142),
[#159](https://github.com/CMSC495-GROUP3/Sourcebook/issues/159).

## Known defects and limitations

See [release-notes.md](release-notes.md). The alpha tables remain the last
filled record. Do not mark [#192](https://github.com/CMSC495-GROUP3/Sourcebook/issues/192)
fixed because a pull request exists. Do not reopen [#189](https://github.com/CMSC495-GROUP3/Sourcebook/issues/189)
in the notes; it closed in [PR #245](https://github.com/CMSC495-GROUP3/Sourcebook/pull/245).

## What this page does not establish

- That `v1.0.0` was verified, tagged, or published.
- That live evaluation or the bounded benchmark was re-run.
- That the 10,000-user requirement, the full evaluation tier, or a real
  corpus was measured.
- That any open pull request listed above has merged.

## The tag (do not run these yet)

The alpha's commands, pointed at `v1.0.0`, belong here only so the freeze PR
does not have to rediscover them. Every line is blocked until the table
above is clear.

```bash
# Do not run until the blocker table is clear and the freeze PR has merged.
git fetch upstream
git tag -a v1.0.0 <merge commit> -m "Unit 8 final: verified per docs/releases/v1.0.0/handoff.md"
git push upstream v1.0.0
gh release create v1.0.0 --repo CMSC495-GROUP3/Sourcebook \
  --title "v1.0.0" --notes-file docs/releases/v1.0.0/release-notes.md
```

Rewrite relative links in the release body to absolute links into the tagged
tree. Then the follow-up PR writes the SHA, the tag link, the run links, and
the video link into this page, the README, and [portfolio.md](portfolio.md).
That follow-up is what closes [#215](https://github.com/CMSC495-GROUP3/Sourcebook/issues/215)
and [#201](https://github.com/CMSC495-GROUP3/Sourcebook/issues/201). This
scaffold closes neither.
