# Sourcebook beta handoff

Sourcebook answers employee policy questions from a fixed corpus of company
documents and cites the document behind every answer. When the corpus does not
cover a question, it says so and offers to hand the question to Human
Resources rather than guessing.

This page is the entry point for reviewing the Unit 6 beta. It names the
commit under review, lists what changed since the
[alpha](../v0.1.0-alpha.1/handoff.md), links the evidence behind each claim,
and states what the beta does not establish. Nothing here is called verified
without a link that shows it.

**Status: candidate, not tagged.** The blocker table at the end of this page
says what has to be true before `v0.2.0-beta.1` is cut. Until every row is
done, treat every Pending cell below as unmeasured.

## Where to start

- **See it running.** The pilot is at <https://sourcebook.duckdns.org>. It has
  a reviewer password separate from the team's; the team supplies it through
  the course channel, not through this repository.
- **Run it yourself in about two minutes.** `git clone`, then `make setup && make
  stub`. That starts the whole app with a fake model and an in-memory database,
  so it needs no accounts, no API key, and no network.
- **Read the code.** The [README](../../../README.md) explains what the system
  does. [docs/install.md](../../install.md) is the installation guide,
  [docs/api.md](../../api.md) the API reference, [docs/ci-cd.md](../../ci-cd.md)
  the pipeline, and [docs/quality.md](../../quality.md) the review, coverage,
  and performance evidence.

## The submitted version

| Field | Value |
| --- | --- |
| Commit | Pending: the merge commit of the release pull request that adds this folder |
| Tag and release | Pending: `v0.2.0-beta.1`, annotated, prerelease, on that commit |
| Running at | <https://sourcebook.duckdns.org> |
| Deployed commit | Pending: read `refs/deployed/main` on the pilot host and record it with the time checked |
| CI | Pending: the push-to-`main` run on the merge commit |
| Security | Pending: the push-to-`main` run on the merge commit |
| Code under test | Pending: `main` after [PR #268](https://github.com/CMSC495-GROUP3/Sourcebook/pull/268), which the live evaluation below needs. The release pull request adds documentation only, so its merge commit runs the same code |

## What changed since the alpha

Every blocker the alpha listed for the beta in
[#203](https://github.com/CMSC495-GROUP3/Sourcebook/issues/203) is closed.

| Area | Change | Pull requests |
| --- | --- | --- |
| Refusal card follows the model's own decline | Follow-ups are gated on the question as asked, not only the condensed rewrite (#189). A fail-closed coverage judge runs after the cosine gate clears and refuses before answer generation when the passages do not answer the question (#192) | #245, #253 |
| Provider saturation | Both chat routes answer HTTP 503 with `{"error", "retryable": true}` and `Retry-After`, and the stream sends the same as an event, instead of a generic error (#118) | #247 |
| Passage identity | Unique index on `(source, chunk_index)` with a one-time migration, deployed to the pilot (#158) | #176 |
| Knowledge-gap report | `python -m sourcebook.rag.query_log_reports` reads the query log for content gaps (#160) | #171 |
| HR queue in the app | An HR Requests page lists open and resolved escalations, resolves and reopens them, and retries webhook delivery, laid out as list and detail with the request in the URL. Delivery state is reported as it stands | #250, #263, #264 |
| Phone and source pane | Mobile drawer height fixed so the theme switch is reachable (#174); the source pane docks on narrower windows and collapses; passages render as Markdown | #234, #242, #240, #202 |
| Web tests | Vitest and React Testing Library cover the chat stream, messages, escalation button, and theme toggle (#211), and the HR queue since its pages landed. `make check` and CI run them with an 80% floor | #252, #250, #264 |
| Security | `python-jose` replaced by PyJWT to drop the `ecdsa` advisory; `session_id` sanitized at log sinks | #239, #220 |
| Evaluation workflow | The runner is admitted to the Atlas access list for the run; empty or invalid `MONGODB_DB` fails at preflight; the embedding cache is off; `commit_sha` must be a full SHA on `main` history, and results record `requested_sha` and `tested_sha` | #197, #226, #244, #258 |
| CI evidence | SHA-named Python and web coverage artifacts on green `main` runs, kept 90 days | #261 |
| Documentation | Installation guide, committed OpenAPI document and API guide, CI/CD page, quality page, evidence numbers sheet, stakeholder video script | #233, #221, #228, #232, #260, #262 |
| Package | Python package renamed from `policy_assistant` to `sourcebook`; docs moved under `docs/` | #199, #196 |

## Verification status

| Check | Status | Evidence |
| --- | --- | --- |
| Python lint and tests on 3.11 to 3.14 with the 80% floor, web lint, types, tests, and build, both Docker images, Compose validation | Passed on `d82749d`; Pending on the release merge commit | [CI run 36057773007](https://github.com/CMSC495-GROUP3/Sourcebook/actions/runs/36057773007) |
| CodeQL, dependency audit, secret scan | Passed on `d82749d`; Pending on the release merge commit | [Security run 36057772985](https://github.com/CMSC495-GROUP3/Sourcebook/actions/runs/36057772985) |
| Answer quality against the live system, smoke tier | Pending: the first run failed before any paid call because of a defect from PR #258, fixed in PR #268. Re-run after #268 merges | [live-evaluation.md](live-evaluation.md) |
| Real-service latency and error rate on the pilot | Pending: needs the operator to run `scripts/loadtest/live_benchmark.py` against the pilot | [live-benchmark.md](live-benchmark.md) |
| End-to-end pass through the deployed app by hand | Pending: needs a tester with the reviewer password | [below](#end-to-end-pass-by-hand) |
| Knowledge-gap report run once against the pilot's query log | Pending: [#203](https://github.com/CMSC495-GROUP3/Sourcebook/issues/203) asks for one run before the cut | none yet |

The coverage judge was measured once before it merged, on the host against
the pull request head `130c0fb`: both refusal metrics at 100% and the three
answerable metrics at 100%
([#253](https://github.com/CMSC495-GROUP3/Sourcebook/pull/253#issuecomment-5783418040)).
That was not this commit, and it was not run by the workflow, so it is the
reason to expect the smoke tier to pass, not the evidence that it did.

### End-to-end pass by hand

Pending. Repeat the alpha's pass with the same steps and expected results,
plus the HR Requests page that is new in this release. Save sanitized
screenshots to [evidence/](evidence/README.md): no password, token, or session
id visible.

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
| Ask `unanswerable_01`, "Does Meridian reimburse employee pet insurance?" (#192) | refusal card, not a prose decline with chips | Pending |
| Escalate the refusal with a note | confirmation in the UI; the record appears on the HR Requests page | Pending |
| Escalate the same message again | the first record comes back, not a second one | Pending |
| Resolve the request on the HR Requests page, then reopen it | the request moves between the open and resolved lists | Pending |

## Known defects and limitations

| Issue | What a pilot user would see | Mitigation in the beta |
| --- | --- | --- |
| [#246](https://github.com/CMSC495-GROUP3/Sourcebook/issues/246) | provider saturation shows the server's busy message, but the web app offers no Retry button yet | the message says to try again; [PR #254](https://github.com/CMSC495-GROUP3/Sourcebook/pull/254) adds the button |
| [#266](https://github.com/CMSC495-GROUP3/Sourcebook/issues/266) | on a phone, Back can reopen the request or policy just left, and keyboard focus falls to the top of the page when the list and detail panes switch | use the "All requests" link; on a desktop both panes show at once |
| [#142](https://github.com/CMSC495-GROUP3/Sourcebook/issues/142) | concurrent project assignment and deletion can race | a single-operator pilot makes this unlikely at this volume |
| README known limitations | a shared password, a threshold set by judgement, non-atomic re-ingestion, one instance, a fictional corpus | documented in the README; none of them blocks a pilot |

## What this beta does not establish

The 10,000-user requirement still rests on the synthetic measurements in
[docs/load-testing.md](../../load-testing.md), taken with the model faked, the
database in memory, and the chat limiter off. The deployed system has not been
measured under concurrent load
([#212](https://github.com/CMSC495-GROUP3/Sourcebook/issues/212)).

Answer quality is measured on the 20-case smoke tier. The full tier has not
been run against this commit
([#213](https://github.com/CMSC495-GROUP3/Sourcebook/issues/213)).

Accessibility and web performance have not been measured
([#214](https://github.com/CMSC495-GROUP3/Sourcebook/issues/214)).

`CustomerDataProvider` is designed and not written.

The corpus is fictional. Sourcebook has never been run against a real
company's policies.

## The tag

The tag is the claim that the beta was verified, so it waits for every row
below. The commands are the alpha's, with the version changed:

```bash
git fetch upstream
git tag -a v0.2.0-beta.1 <merge commit> -m "Unit 6 beta: verified per docs/releases/v0.2.0-beta.1/handoff.md"
git push upstream v0.2.0-beta.1
gh release create v0.2.0-beta.1 --repo CMSC495-GROUP3/Sourcebook --prerelease \
  --title "v0.2.0-beta.1" --notes-file docs/releases/v0.2.0-beta.1/release-notes.md
```

Rewrite relative links in the release body to absolute links into the tagged
tree. Then open the follow-up pull request that writes the tagged SHA, the tag
link, and the CI and Security run links into this page, the README, and
`docs/README.md`. That pull request closes
[#203](https://github.com/CMSC495-GROUP3/Sourcebook/issues/203).

| Blocker | State |
| --- | --- |
| Smoke-tier live evaluation on the code under test, recorded in [live-evaluation.md](live-evaluation.md) | Pending: PR #268 merged, then a smoke run on its merge commit |
| Bounded benchmark against the pilot, recorded in [live-benchmark.md](live-benchmark.md) | Pending |
| End-to-end pass by hand, recorded above with screenshots | Pending |
| Knowledge-gap report run once against the pilot's query log | Pending |
| Release pull request merged, with its CI and Security runs green and linked in the table at the top of this page | Pending |
