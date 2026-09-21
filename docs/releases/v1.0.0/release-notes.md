# Sourcebook v1.0.0 (planned, not tagged)

**This is a release-notes skeleton. There is no `v1.0.0` tag and no tagged
commit. Do not publish a GitHub release from this file.**

The Unit 8 final will use this page as the release body once [#215](https://github.com/CMSC495-GROUP3/Sourcebook/issues/215)
re-runs the three checks and the follow-up PR writes the SHA. Until then the
grader's honest entry is [portfolio.md](portfolio.md), and the last tagged
release is [v0.1.0-alpha.1](https://github.com/CMSC495-GROUP3/Sourcebook/releases/tag/v0.1.0-alpha.1).

Tagged commit: _TBD. Fill only after the merge commit that becomes the tag._

## What it will do

Sourcebook answers employee policy questions from a fixed corpus of company
documents and cites the document behind every answer. When the corpus does not
cover a question, it says so and offers to hand the question to Human
Resources rather than guessing.

A question goes through retrieval against a vector index, then a grounding
gate that compares the best passage score against a threshold. Below the
threshold there is no model call and the user gets a refusal card. Above it
the answer streams back with the policies it drew on and a match score.

That is the product promise. The alpha recorded that the gate does not yet
keep the promise on HR-adjacent uncovered questions or on follow-ups
([#192](https://github.com/CMSC495-GROUP3/Sourcebook/issues/192),
[#189](https://github.com/CMSC495-GROUP3/Sourcebook/issues/189)). Follow-ups
are now gated on both the rewrite and the question as typed
([#189](https://github.com/CMSC495-GROUP3/Sourcebook/issues/189) closed in
[PR #245](https://github.com/CMSC495-GROUP3/Sourcebook/pull/245)).
[#192](https://github.com/CMSC495-GROUP3/Sourcebook/issues/192) is still
open. This skeleton does not claim it is fixed.

## What shipped since the beta

_TBD after [#203](https://github.com/CMSC495-GROUP3/Sourcebook/issues/203)
cuts `v0.2.0-beta.1`._ The beta folder does not exist yet. Do not invent a
delta from a tag that has not been cut. The last published notes are
[v0.1.0-alpha.1/release-notes.md](../v0.1.0-alpha.1/release-notes.md).

On current `main`, and **not** claimed as a `v1.0.0` ship list:
[docs/api.md](../../api.md) and [docs/openapi.json](../../openapi.json)
([#204](https://github.com/CMSC495-GROUP3/Sourcebook/issues/204) /
[PR #221](https://github.com/CMSC495-GROUP3/Sourcebook/pull/221)),
[docs/install.md](../../install.md)
([#205](https://github.com/CMSC495-GROUP3/Sourcebook/issues/205) /
[PR #233](https://github.com/CMSC495-GROUP3/Sourcebook/pull/233)),
live-evaluation fail-closed ([#223](https://github.com/CMSC495-GROUP3/Sourcebook/issues/223) /
[PR #226](https://github.com/CMSC495-GROUP3/Sourcebook/pull/226)),
provider saturation as 503 ([#118](https://github.com/CMSC495-GROUP3/Sourcebook/issues/118) /
[PR #247](https://github.com/CMSC495-GROUP3/Sourcebook/pull/247)),
query-log reports ([#160](https://github.com/CMSC495-GROUP3/Sourcebook/issues/160) /
[PR #171](https://github.com/CMSC495-GROUP3/Sourcebook/pull/171)),
unique passage identity ([#158](https://github.com/CMSC495-GROUP3/Sourcebook/issues/158) /
[PR #176](https://github.com/CMSC495-GROUP3/Sourcebook/pull/176)),
and follow-up grounding ([#189](https://github.com/CMSC495-GROUP3/Sourcebook/issues/189) /
[pull request #245](https://github.com/CMSC495-GROUP3/Sourcebook/pull/245)),
the [CI/CD page](../../ci-cd.md)
([#207](https://github.com/CMSC495-GROUP3/Sourcebook/issues/207) /
[pull request #228](https://github.com/CMSC495-GROUP3/Sourcebook/pull/228)),
and the [quality summary](../../quality.md)
([#208](https://github.com/CMSC495-GROUP3/Sourcebook/issues/208) /
[pull request #232](https://github.com/CMSC495-GROUP3/Sourcebook/pull/232)).

Still draft, and **not** in this skeleton as shipped: team records
([#209](https://github.com/CMSC495-GROUP3/Sourcebook/issues/209) /
[pull request #231](https://github.com/CMSC495-GROUP3/Sourcebook/pull/231)).
The remaining order is in [handoff.md](handoff.md).

## Getting access

**The pilot** runs at <https://sourcebook.duckdns.org> on a single instance.
It needs a password. The team supplies the reviewer password through the
course channel, never through this repository.

**Without any credential**, the whole app runs locally with a fake model and
an in-memory database:

```bash
git clone https://github.com/CMSC495-GROUP3/Sourcebook.git
cd Sourcebook
make setup && make stub     # then, in a second terminal
make web
```

That needs no accounts, no API key, and no network. Do not `git checkout
v1.0.0`; the tag does not exist. Retrieval quality cannot be judged in stub
mode.

Setup, the live site, real services, and deployment are in
[docs/install.md](../../install.md). The [README](../../../README.md) walks
one question through retrieval, the gate, and streaming.
[CONTRIBUTING.md](../../../CONTRIBUTING.md) covers changing the code.
The HTTP contract is [docs/api.md](../../api.md) and
[docs/openapi.json](../../openapi.json).

## Known defects

Each of these is open at the time this skeleton was reconciled with current
`main`. Impact and mitigation are what a pilot user can do today. Update the
table at freeze; do not delete a row to look finished.

| Issue | What a user would see | Impact | Mitigation |
| --- | --- | --- | --- |
| [#192](https://github.com/CMSC495-GROUP3/Sourcebook/issues/192) | an uncovered HR-adjacent question, or a prompt injection, is answered with a sentence saying the policies do not cover it, under a score badge and unrelated source chips | the answer text is safe; the one-click route to a person is missing and the chips mislead | "Not what you needed?" under the answer still files the escalation. Last committed measurement: [alpha live-evaluation.md](../v0.1.0-alpha.1/live-evaluation.md), both refusal metrics 0% |
| [#142](https://github.com/CMSC495-GROUP3/Sourcebook/issues/142) | assigning and deleting a project at the same moment can race | a conversation can point at a project that no longer exists | unlikely at pilot volume with one operator |
| [#159](https://github.com/CMSC495-GROUP3/Sourcebook/issues/159) | Human Resources has no in-app queue | the handler works from the API or a webhook-fed channel | `GET /api/escalations?status=open` and `PATCH` to resolve |

Closed on current `main` since the first scaffold, so they are not in the
table: [#189](https://github.com/CMSC495-GROUP3/Sourcebook/issues/189)
([PR #245](https://github.com/CMSC495-GROUP3/Sourcebook/pull/245)),
[#118](https://github.com/CMSC495-GROUP3/Sourcebook/issues/118)
([PR #247](https://github.com/CMSC495-GROUP3/Sourcebook/pull/247)),
[#158](https://github.com/CMSC495-GROUP3/Sourcebook/issues/158)
([PR #176](https://github.com/CMSC495-GROUP3/Sourcebook/pull/176)),
[#160](https://github.com/CMSC495-GROUP3/Sourcebook/issues/160)
([PR #171](https://github.com/CMSC495-GROUP3/Sourcebook/pull/171)),
[#174](https://github.com/CMSC495-GROUP3/Sourcebook/issues/174),
[#223](https://github.com/CMSC495-GROUP3/Sourcebook/issues/223)
([PR #226](https://github.com/CMSC495-GROUP3/Sourcebook/pull/226)).

## What this release does not establish

These stay documented rather than fixed unless someone spends the time before
the tag. Copy this list into the published notes; do not replace it with a
PASS.

- **There is no `v1.0.0` yet.** A folder named `docs/releases/v1.0.0/` is not
  a tag. The submitted version will be the tag, not `main`.
- **Answer quality is not re-measured for this folder.** The last committed
  smoke-tier write-up is the [alpha](../v0.1.0-alpha.1/live-evaluation.md):
  retrieval and citation 100% of 12 answerable cases; unsupported-refusal and
  injection-gate metrics 0%. That is [#192](https://github.com/CMSC495-GROUP3/Sourcebook/issues/192).
  The full tier ([#213](https://github.com/CMSC495-GROUP3/Sourcebook/issues/213))
  has not been run. A green Live evaluation badge is not a quality claim.
- **The 10,000-user requirement is not verified.** [load-testing.md](../../load-testing.md)
  is synthetic. The [alpha live-benchmark](../v0.1.0-alpha.1/live-benchmark.md)
  is seven requests. The deployed load run is
  [#212](https://github.com/CMSC495-GROUP3/Sourcebook/issues/212).
- **The corpus is fictional.** Sourcebook has never run against a real
  company's policies.
- **One deployment, one instance, no failover.** No backup schedule, no
  restore drill.
- **`CustomerDataProvider` is designed and not written.**
- **The video and the seven position papers are not in this repository.**
  [#216](https://github.com/CMSC495-GROUP3/Sourcebook/issues/216),
  [#217](https://github.com/CMSC495-GROUP3/Sourcebook/issues/217).

## Reproducing a version that does not exist

Do not run `git checkout v1.0.0`. When the tag exists, the freeze PR will
replace this section with the alpha's checkout commands pointed at `v1.0.0`.
Until then the reproducible tagged version is:

```bash
git clone https://github.com/CMSC495-GROUP3/Sourcebook.git
cd Sourcebook
git checkout v0.1.0-alpha.1
make setup && make stub
```
