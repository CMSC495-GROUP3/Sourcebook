# Unit 5 alpha handoff and evidence index

This page is the one place a reviewer or grader starts from to check the
Sourcebook alpha. It names the exact commit under review, maps the agreed MVP
scope to what shipped and what evidence backs it, lists what is still open,
and holds the release notes and the tag procedure. Tracking issue:
[#184](https://github.com/CMSC495-GROUP3/Sourcebook/issues/184).

Status on 2026-09-09: **draft, candidate not yet verified.** No tag exists
yet. Each gate below says what it needs before the tag is cut. Nothing here
claims a check passed unless a link shows it.

## Candidate commit

| Field | Value |
| --- | --- |
| Candidate SHA | `2aced17b308be6dd904c22bff23bebe48e21dec3` (head of `main`, 2026-09-09) |
| Deployed on the pilot | same SHA, per `refs/deployed/main` on the host, checked 2026-09-09 19:53 UTC |
| Pilot address | <https://sourcebook.duckdns.org> |
| Proposed tag | `v0.1.0-alpha.1`, annotated, on the verified SHA |
| CI on this SHA | [run 34397213848](https://github.com/CMSC495-GROUP3/Sourcebook/actions/runs/34397213848), success |
| Security on this SHA | [run 34397213833](https://github.com/CMSC495-GROUP3/Sourcebook/actions/runs/34397213833), success |

The final SHA is chosen after the required fixes below land. Until then this
row is the current candidate, and every later section that says "on the
candidate" refers to it. When the SHA changes, update this table and rerun
the gates that depend on the build.

## Scope map

The team's project plan from the earlier units is not in this repository, so
this table starts from the product commitments the README records and the
issues the team has been treating as MVP. Reconcile it against the plan
document before the tag and note any difference in the last column; do not
drop a promised feature by leaving it out of the table.

| Requirement | Implemented | Evidence | Limitation or decision needed |
| --- | --- | --- | --- |
| Plain-language questions answered from the policy corpus with the source cited | Yes | README "How a question is answered"; `tests/test_chat.py`, `tests/test_rag_chain.py`; evaluation metric "citation correctness" | Live answer-quality numbers pending, see the evaluation gate |
| Refuse when the corpus does not support an answer | Yes | grounding gate in `policy_assistant/rag/rag_chain.py`; evaluation "unsupported refusal handling" | `SIMILARITY_THRESHOLD` is untuned against a real corpus (README known limitations) |
| Escalate a refusal or unhelpful answer to Human Resources | Employee side yes; handler side API only | `policy_assistant/api/routes/escalations.py`, `tests/test_escalations.py`, webhook delivery and retry from #99 / PR #113 | #159: no handler page. #84: escalation can target the wrong turn after a failed generation. Decision needed: is API-only queue handling within the agreed alpha scope? Record the answer here |
| Learn from the query log (content gaps, FAQ ranking, threshold tuning) | Logging yes; reports in review | `policy_assistant/api/analytics.py`, `tests/test_analytics.py`; reports in PR #171 (draft) | #160: PR #171 needs review and a live check. Decision needed: alpha scope or documented gap |
| Policy Library renders whole documents | Yes | PR #167, `web/src/components/Documents` | none known |
| Conversation history, projects, reload | Yes | `tests/test_conversations.py`, PRs #126, #133 | #142: project assignment and deletion are not transactional |
| Shared-password sign-in with a second reviewer password | Yes | PRs #74, #110, #154; `tests/test_auth.py`, `tests/test_tokens.py` | Shared credential by design for the pilot (README known limitations) |
| Rate limits and provider bounds so a stalled provider cannot take the site down | Yes | PRs #112, #144; `tests/test_provider_timeout.py`, `tests/test_proxy_headers.py` | #118: saturation reports as a generic error rather than a retryable one |
| Serve 10,000 concurrent users | Synthetic evidence only | `scripts/loadtest/RESULTS.md`: 98.7 req/s with the model faked | Real-service run in [live-benchmark.md](live-benchmark.md) is bounded and cannot verify this claim; say so in the release notes |
| Deployed pilot with TLS and automatic deploys | Yes | README "Deployment" and "Checking a deploy"; `scripts/auto_deploy.sh`, `tests/test_auto_deploy.py` | Single instance, no redundancy, free DuckDNS name |
| Redesigned web app, responsive, keyboard-usable | Redesign shipped in PR #161 and follow-ups | milestone "refactor: new UI/UX" | #51 responsive pass, #52 keyboard pass, #174 theme switch on a phone, #53 deployment verification, all open |

## Gates before the tag

Each gate has an owner from [team-roles.md](team-roles.md) once the roles are
confirmed. Tick a box only with a link beside it.

### 1. Build and checks on the candidate

- [x] CI status: [run 34397213848](https://github.com/CMSC495-GROUP3/Sourcebook/actions/runs/34397213848) covers Python lint, tests on 3.11 to 3.14 with the 80% coverage floor, the evaluation dataset checks, web lint and types and build, both Docker images, Compose validation, and the proxy-chain acceptance script.
- [x] Security: [run 34397213833](https://github.com/CMSC495-GROUP3/Sourcebook/actions/runs/34397213833) covers CodeQL, dependency audit and review, and the secrets scan.
- [ ] Rerun both after the final SHA is chosen and replace the links.

### 2. Live evaluation (#137, #180, PR #181)

- [ ] PR #181 merged so the Live evaluation workflow fails when the evaluator fails. On 2026-09-09 it has a changes-requested review from @RoNUO.
- [ ] Smoke-tier run on the candidate with an exit-code-verified result, linked here with the metrics: Recall@5, citation correctness, grounded answer rate, unsupported refusal handling, prompt-injection gate refusal.
- [ ] Human check of the ambiguous and prompt-injection cases, and the three manual questions #137 lists, with the reviewer's name and date.
- [ ] Comparison against the pre-#138 baseline `9871e3ed2faa798cc21d237b421c7ac68963a9a2` as #137 requires.

A green workflow is not product-quality evidence. The two workflow runs that
exist (2026-09-06 and 2026-09-07) predate #181 and one of them is the false
green that #180 documents.

### 3. Escalation targets the right turn (#84)

- [ ] Fix merged, with the message-id approach or the interim guard #84 describes.
- [ ] Verified on the deployed candidate: force a generation failure, then escalate the next answer, and confirm the stored escalation names that answer.

### 4. Real-service performance (#183)

- [ ] Targets agreed and the run recorded in [live-benchmark.md](live-benchmark.md), with the deployed SHA matching the candidate.

### 5. Team roles (#182)

- [ ] [team-roles.md](team-roles.md) moved from unconfirmed draft to confirmed, with names and the confirmation date.

### 6. End-to-end browser check on the deployed candidate

Record one pass in the table below. Reuse the deployment verification from
#53 and the responsive and keyboard work from #51 and #52 rather than
repeating them; link those results instead. Point `ESCALATION_WEBHOOK_URL` at a
controlled test destination, or leave it unset, before the escalation step.

| Field | Value |
| --- | --- |
| Date (UTC) | _pending_ |
| Tester | _pending_ |
| Browser and version | _pending_ |
| Deployed SHA | _pending_ |
| Screenshots or logs | _pending_, sanitized, under `docs/evidence/alpha/` |

| Step | Expected | Result |
| --- | --- | --- |
| Sign in with the reviewer password | lands on the chat page; a wrong password shows "Incorrect password." | _pending_ |
| Ask a covered question | streamed answer with at least one cited source and a score | _pending_ |
| Open a cited source | Policy Library shows the whole document | _pending_ |
| Ask a follow-up in the same conversation | answer uses the history; no cache badge | _pending_ |
| Reload the page | the conversation and its sources are restored from history | _pending_ |
| Ask an uncovered question | refusal card with the Ask Human Resources button | _pending_ |
| Escalate the refusal with a note | confirmation in the UI; record visible at `GET /api/escalations?status=open`; webhook received at the test destination if configured | _pending_ |
| Escalate the same message again | the first record is returned, not a second one | _pending_ |

### 7. Migration review (#158, PR #176)

PR #176 adds a unique index on `(source, chunk_index)` and a one-time
migration. Its own description says the production migration was not run.
If it is in the candidate, complete the CONTRIBUTING steps it adds before the
deploy that carries it, and record the outcome here.

- [ ] Ingestion stopped for the window.
- [ ] Atlas backup or snapshot confirmed, with its timestamp.
- [ ] Duplicate check run; count of duplicate identities recorded.
- [ ] `python -m scripts.migrate_passage_index` run; output kept.
- [ ] `db.passages.getIndexes()` shows `source_1_chunk_index_1` with `unique: true`.
- [ ] API restarted and healthy; retrieval and the Policy Library smoke-tested.

If PR #176 is not in the candidate, say so here and leave the boxes empty.

### 8. Open PRs to resolve

| PR | State on 2026-09-09 | Decision for the alpha |
| --- | --- | --- |
| #171 query-log reports | draft; CI green; description check failing | _pending_: merge after review, or record #160 as a known gap |
| #176 unique passage index | open; CI green; one comment review | _pending_: include with the migration gate, or defer and keep the non-unique index as a known limitation |
| #181 fail-closed live evaluation | open; changes requested | required for gate 2 |

## Known defects and limitations for the release notes

| Issue | Impact on a pilot user | Mitigation in the alpha |
| --- | --- | --- |
| #84 | an escalation filed after a failed generation can name the wrong exchange | gate 3; until fixed, reload after an error before escalating |
| #118 | provider saturation reads as a generic error, so the user does not know to retry | `OPENAI_MAX_CONCURRENT_REQUESTS` bounds the damage; retry by hand |
| #142 | concurrent project assignment and deletion can race | single-operator pilot; low likelihood at pilot volume |
| #159 | Human Resources has no in-app queue | handler works the queue through the API or a webhook-fed channel |
| #160 / #171 | no report over the query log yet | run the draft report from PR #171 by hand, or query the collection |
| #174, #51, #52 | phone and keyboard usability gaps | desktop browser for the pilot review |
| README known limitations | shared password, untuned threshold, non-atomic re-ingestion, single instance, regex document search, fictional corpus | documented; none blocks a pilot |

## Release notes (draft for the prerelease)

Sourcebook v0.1.0-alpha.1 is the first tagged version of the policy
assistant. It answers employee questions from a policy corpus and cites the
document each answer came from. When the corpus does not cover a question it
says so and lets the employee hand the question to Human Resources.

What is in it. Streaming answers with citations and a retrieval score; a
grounding gate that refuses rather than guesses; escalation with webhook
delivery and retry; conversation history with projects; a Policy Library that
renders whole documents; a shared-password sign-in with a second password for
reviewers; rate limits and provider timeouts; a query log for later analysis;
a Docker Compose deployment behind Caddy with automatic deploys on the pilot
host.

Where to start. The [README](../../README.md) for what it does and why; the
Quick start there for a local run with no accounts; "Running against the real
services" for the full stack; this page for the evidence.

Pilot access. The pilot runs at <https://sourcebook.duckdns.org> on a single
instance and is available while the course runs. Graders obtain the reviewer
password from the team through the course channel, not from this repository.
The README's Configure section explains how the second password works and how
a reviewer session is told apart from the team's.

Known defects and limitations. The table above, carried into the release
notes verbatim with its mitigations.

Not established by this alpha. The 10,000-user requirement rests on synthetic
measurements with the model faked; the bounded real-service run in
[live-benchmark.md](live-benchmark.md) does not verify it. Live answer-quality
metrics are linked from gate 2 once the fail-closed workflow lands.

## Cutting the tag

Run this only after every gate above has its link. The tag is annotated so it
carries the date and the tagger; the release is a prerelease so nobody reads
it as production.

```bash
git fetch upstream
git checkout 2aced17b308be6dd904c22bff23bebe48e21dec3   # replace with the verified SHA
git tag -a v0.1.0-alpha.1 -m "Unit 5 alpha: verified per docs/alpha/handoff.md"
git push upstream v0.1.0-alpha.1
gh release create v0.1.0-alpha.1 --repo CMSC495-GROUP3/Sourcebook --prerelease \
  --title "v0.1.0-alpha.1" --notes-file docs/alpha/release-notes.md
```

Copy the release notes section above into `docs/alpha/release-notes.md` at
tag time so the release body and the repository agree. Then add the release
link to the candidate table at the top of this page and to the README's
Documentation table.

## Reproducing the submitted version later

The pilot host follows `main`, so it will move past the tag. The tag does
not. To see the submitted version:

```bash
git clone https://github.com/CMSC495-GROUP3/Sourcebook.git
cd Sourcebook
git checkout v0.1.0-alpha.1
make setup && make stub        # fake model and in-memory database, no accounts
```

or, with a `.env` for the real services, `docker compose up --build` at that
checkout. The deployed SHA at any time is `refs/deployed/main` on the host
(README "Automatic deploys"). If a grader needs the pilot at the tagged
version after `main` has moved, the operator checks out the tag on the host
and runs `scripts/deploy.sh`; record the date that was done here.
