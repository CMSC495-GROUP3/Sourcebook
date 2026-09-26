# Sourcebook v1.0.0 handoff

Sourcebook answers employee policy questions from a fixed corpus of company
documents and cites the document behind every answer. When the corpus does not
cover a question, it says so and offers to hand the question to Human
Resources rather than guessing.

This page is the entry point for reviewing the Unit 8 final release. It names
the commit under review, lists what changed since the
[beta](../v0.2.0/handoff.md), links the evidence behind each claim, and states
what the release does not establish. Nothing here is called verified without a
link that shows it.

**Status: draft, no candidate yet.** The plan on
[#215](https://github.com/CMSC495-GROUP3/Sourcebook/issues/215#issuecomment-5824613941)
freezes code on Monday 28 September. `main` at that point is the candidate,
and every Pending cell below is measured on it. Until the blocker table at the
end of this page is clear, treat every Pending cell as unmeasured.

## Where to start

- **Graders:** start at [portfolio.md](portfolio.md). It has one row per
  item in the assignment, each linking to its evidence.
- **See it running.** The pilot is at <https://sourcebook.duckdns.org>. The
  reviewer password comes through the course channel, not this repository.
- **Run it yourself.** [docs/install.md](../../install.md), or `git clone`
  then `make setup && make stub`: fake model, in-memory database, no accounts.
- **Read the code.** The [README](../../../README.md), the
  [API guide](../../api.md), the [CI/CD page](../../ci-cd.md), and the
  [quality page](../../quality.md).

## The submitted version

| Field | Value |
| --- | --- |
| Commit | Pending: the merge commit of the release pull request that fills this folder |
| Tag and release | Pending: `v1.0.0`, annotated, a full release (not a prerelease), on that commit |
| Running at | <https://sourcebook.duckdns.org> |
| Deployed commit | Pending: read `HEAD` and `refs/deployed/main` on the pilot host and record them with the time checked |
| CI | Pending: the push-to-`main` run on the merge commit |
| Security | Pending: the push-to-`main` run on the merge commit |
| Code under test | Pending: `main` at the Monday 28 September freeze. The release pull request adds documentation only, so its merge commit runs the same code |

## What changed since the beta

Pending until the freeze. So far:

| Area | Change | Pull requests |
| --- | --- | --- |
| Refusal card | The card says which check refused. A question refused by the coverage judge no longer shows "Strong match" under "No matching policy" or claims nothing indexed came close ([#269](https://github.com/CMSC495-GROUP3/Sourcebook/issues/269)) | #271 |
| Projects | Assigning a conversation to a project and deleting that project no longer race: on a replica set, which Atlas clusters like the pilot's are, both run in MongoDB transactions, and the assignment writes to the project so it conflicts with a concurrent delete ([#142](https://github.com/CMSC495-GROUP3/Sourcebook/issues/142)). The in-memory stub has no transactions and keeps the old sequential behavior. The move-to-project menu stays open when the pointer leaves the row | #279, #272 |
| HR Requests and Policy Library on a phone | Back from the list leaves the page instead of reopening the item just left, and a resolve leaves one list entry. Focus moves to the item's heading when it opens, back to its row when you return, and to the list heading after a resolve or reopen, which is announced to screen readers ([#266](https://github.com/CMSC495-GROUP3/Sourcebook/issues/266)) | #277 |
| README | Release, pilot site, and Ruff badges | #273 |
| Documentation | User guide ([#206](https://github.com/CMSC495-GROUP3/Sourcebook/issues/206)) and team page ([#209](https://github.com/CMSC495-GROUP3/Sourcebook/issues/209)) pending; [portfolio page](portfolio.md) in this folder; pilot load-run page | Pending: #259, #231; #274, #278 |

## Verification status

| Check | Status | Evidence |
| --- | --- | --- |
| Python lint and tests on 3.11 to 3.14 with the 80% floor, web lint, types, tests, and build, both Docker images, Compose validation | Pending on the release merge commit | none yet |
| CodeQL, dependency audit, secret scan | Pending on the release merge commit | none yet |
| Coverage, Python and web, for the tagged commit ([#210](https://github.com/CMSC495-GROUP3/Sourcebook/issues/210)) | Pending: copy from the candidate's `python-coverage-<sha>` and `web-coverage-<sha>` artifacts | [evidence/coverage.md](evidence/coverage.md) |
| Answer quality, smoke tier | Pending | [live-evaluation.md](live-evaluation.md) |
| Answer quality, full tier, first run against the live system ([#213](https://github.com/CMSC495-GROUP3/Sourcebook/issues/213)) | Pending | [live-evaluation.md](live-evaluation.md) |
| Real-service latency and error rate on the pilot | Pending | [live-benchmark.md](live-benchmark.md) |
| Load run against the deployed pilot ([#212](https://github.com/CMSC495-GROUP3/Sourcebook/issues/212)) | Pending | [docs/load-testing-pilot.md](../../load-testing-pilot.md), Pending |
| Lighthouse, both themes, phone and desktop ([#214](https://github.com/CMSC495-GROUP3/Sourcebook/issues/214)) | Pending | [docs/quality.md](../../quality.md), Pending |
| End-to-end pass by hand | Pending | [below](#end-to-end-pass-by-hand) |
| Knowledge-gap report run against the pilot's query log | Pending | none yet |
| Screenshots of green CI, Security, and auto-deploy runs ([#207](https://github.com/CMSC495-GROUP3/Sourcebook/issues/207)) | Pending | [evidence/](evidence/README.md) |

### End-to-end pass by hand

Pending. Repeat the beta's pass with the same steps and expected results, and
add one step each for the #271 and #277 fixes. Save sanitized screenshots to
[evidence/](evidence/README.md): no password, token, or session id visible.

| Field | Value |
| --- | --- |
| Date (UTC) | Pending |
| Tester | Pending |
| Browser and version | Pending |
| Deployed commit | Pending |

| Step | Expected | Result |
| --- | --- | --- |
| Sign in with the reviewer password | lands on the chat page; a wrong password shows "Incorrect password." | Pending |
| Ask a covered question | streamed answer with at least one cited source and a score | Pending |
| Open a cited source | the source pane shows the whole document | Pending |
| Ask a follow-up in the same conversation | the answer uses the history; no cache badge | Pending |
| Reload the page | the conversation and its sources are restored from history | Pending |
| Ask an uncovered question in a new conversation | refusal card with the Ask Human Resources button | Pending |
| Ask an uncovered question as a follow-up (#189) | refusal card, not an answer with unrelated chips | Pending |
| Ask `unanswerable_01`, "Does Meridian reimburse employee pet insurance?" (#192, #269) | refusal card that says the coverage check refused it, without "Strong match" under "No matching policy" | Pending |
| Escalate the refusal with a note | confirmation in the UI; the record appears on the HR Requests page | Pending |
| Escalate the same message again | the first record comes back, not a second one | Pending |
| Resolve the request on the HR Requests page, then reopen it | the request moves between the open and resolved lists | Pending |
| At 390px wide, keyboard only: open a request on the HR Requests page, choose "All requests", then press Back (#266) | focus lands on the request's heading, then on its row; Back leaves the page instead of reopening the request | Pending |

## Known defects and limitations

Carried from the beta unless fixed before the freeze. Update at the freeze.

| Issue | What a pilot user would see | Mitigation |
| --- | --- | --- |
| Vague questions on covered topics | "Can I expense this trip?" is refused where the alpha answered in general terms ([beta evaluation](../v0.2.0/live-evaluation.md#manual-review)) | ask a more specific question, or use Ask Human Resources |
| README known limitations | a shared password, a threshold set by judgement, non-atomic re-ingestion, one instance, a fictional corpus | documented in the README |

## What this release does not establish

Pending: rewrite at the freeze from what was measured. Start from the beta's
list: load (#212), full-tier quality (#213), accessibility and web performance
(#214), `CustomerDataProvider` not written, a fictional corpus, one instance
with no failover. Remove only the items the measurements above actually
settle.

## The tag

The tag is the claim that the release was verified, so it waits for every row
below. `v1.0.0` is the final release, so it is not marked prerelease:

```bash
git fetch upstream
git tag -a v1.0.0 <merge commit> -m "Unit 8 final: verified per docs/releases/v1.0.0/handoff.md"
git push upstream v1.0.0
gh release create v1.0.0 --repo CMSC495-GROUP3/Sourcebook \
  --title "v1.0.0" --notes-file docs/releases/v1.0.0/release-notes.md
```

Rewrite relative links in the release body to absolute links into the tagged
tree. Then open the follow-up pull request that writes the tagged SHA, the tag
link, the CI and Security run links, and the video link into this page, the
README, `docs/README.md`, and `portfolio.md`. That pull request closes
[#215](https://github.com/CMSC495-GROUP3/Sourcebook/issues/215) and
[#201](https://github.com/CMSC495-GROUP3/Sourcebook/issues/201).

| Blocker | State |
| --- | --- |
| Code frozen on `main`; the candidate commit named in the table at the top of this page | Pending: Monday 28 September |
| Smoke and full tier on the candidate, recorded in [live-evaluation.md](live-evaluation.md) | Pending |
| Bounded benchmark against the pilot, recorded in [live-benchmark.md](live-benchmark.md) | Pending |
| End-to-end pass by hand, recorded above with screenshots | Pending |
| Coverage for the candidate in [evidence/coverage.md](evidence/coverage.md) | Pending |
| Load run and Lighthouse, or recorded as not measured | Pending |
| `docs/user-guide.md` and `docs/team.md` on `main` | Pending: #259, #231 |
| Release pull request merged, with its CI and Security runs green and linked in the table at the top of this page | Pending |
