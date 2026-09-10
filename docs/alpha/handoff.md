# Sourcebook alpha handoff

Sourcebook answers employee policy questions from a fixed corpus of company
documents and cites the document behind every answer. When the corpus does not
cover a question, it says so and offers to hand the question to Human
Resources rather than guessing.

This page is the entry point for reviewing the Unit 5 alpha. It names the
commit under review, maps the scope the team agreed in its project pitch and
its Unit 3 design specification onto what shipped, links the evidence behind
each claim, and states what the alpha does not establish. Nothing here is
called verified without a link that shows it.

## Where to start

- **See it running.** The pilot is at <https://sourcebook.duckdns.org>. It has
  a reviewer password separate from the team's; the team supplies it through
  the course channel, not through this repository. The README's Configure
  section explains how the second password works.
- **Run it yourself in about two minutes.** `git clone`, then `make setup && make
  stub`. That starts the whole app with a fake model and an in-memory database,
  so it needs no accounts, no API key, and no network.
- **Read the code.** The [README](../../README.md) explains what the system
  does and walks one question through retrieval, the grounding gate, and
  streaming. [CONTRIBUTING.md](../../CONTRIBUTING.md) covers the development
  setup.

Unit 5 roles are in the [README's Team section](../../README.md#team): Taylor
as Lead Architect, Daniel as Interface Designer, Chris as Integration Lead,
with Gavin, Dominick, George, and Robert on the React app, administration, and
the corpus.

## The submitted version

| Field | Value |
| --- | --- |
| Commit | `435296607ec1b95a4b989c3c421d0cb246c0ffaa`, head of `main` on 2026-09-10 |
| Running at | <https://sourcebook.duckdns.org> |
| Deployed commit | the same, per `refs/deployed/main` on the pilot host, checked 2026-09-10 22:00 UTC |
| CI | [run 34534962223](https://github.com/CMSC495-GROUP3/Sourcebook/actions/runs/34534962223), success |
| Security | [run 34534962098](https://github.com/CMSC495-GROUP3/Sourcebook/actions/runs/34534962098), success |
| Proposed tag | `v0.1.0-alpha.1`, annotated, marked prerelease |

The tag is not cut yet. The verification status section says what has been
checked on this commit and what has not. The tag goes on the commit that
clears the remaining items, and this table is updated to match it.

## What shipped, against the agreed scope

The table below reconciles the candidate against the two planning documents
from earlier units, neither of which lives in this repository. The project
pitch states the problem, the stack, and the risks the team promised to
mitigate. The Unit 3 design specification of 2026-08-30 fixes the interface
contracts and the architecture. Where the candidate departs from the
specification, the departure is in the next section rather than missing from
this one.

| Requirement | Implemented | Evidence | Limitation |
| --- | --- | --- | --- |
| Plain-language questions answered from the policy corpus with the source cited | Yes | README "How a question is answered"; `tests/test_chat.py`, `tests/test_rag_chain.py`; evaluation metric "citation correctness" | Answer quality has not been measured against the live system on this commit |
| Refuse when the corpus does not support an answer | Yes | grounding gate in `policy_assistant/rag/rag_chain.py`; evaluation "unsupported refusal handling" | `SIMILARITY_THRESHOLD` is set at 0.62 by judgement, not tuned against a real corpus |
| Escalate a refusal or unhelpful answer to Human Resources | Employee side yes; handler side through the API | `policy_assistant/api/routes/escalations.py`, `tests/test_escalations.py`; webhook delivery and retry from #99 / PR #113 | #84: an escalation filed after a failed generation can name the wrong exchange. The specification's Figure 3 has the Human Resources agent read the open queue through `GET /api/escalations?status=open` and `PATCH` it resolved, reached from a Slack or Teams webhook, so API-only handling is the designed path. #159 proposes an in-app queue beyond it |
| Learn from the query log (content gaps, FAQ ranking, threshold tuning) | Logging yes; reports not in this commit | `policy_assistant/api/analytics.py`, `tests/test_analytics.py` | The specification asks for a weekly human-read knowledge-gap report over `query_logs`. That report is in draft as PR #171 and did not make this commit, so #160 stands as a gap against the specification |
| Policy Library renders whole documents | Yes | PR #167, `web/src/components/Documents` | none known |
| Conversation history, projects, reload | Yes | `tests/test_conversations.py`, PRs #126, #133 | #142: project assignment and deletion are not transactional |
| Shared-password sign-in with a second reviewer password | Yes | PRs #75 (for #74), #110, #154; `tests/test_auth.py`, `tests/test_tokens.py` | A shared credential by design for the pilot, with no per-user accounts |
| Rate limits and provider bounds so a stalled provider cannot take the site down | Yes | PRs #112, #144; `tests/test_provider_timeout.py`, `tests/test_proxy_headers.py` | #118: saturation reports as a generic error rather than a retryable one |
| Serve 10,000 concurrent users, which the design specification reads as about 100 requests per second | Synthetic evidence only | `scripts/loadtest/RESULTS.md`: 98.7 requests per second on one worker at `THREADPOOL_TOKENS=320`, zero failures, 0.17s time to first byte, with the model faked | The measurement is 1.3% under the 100 figure, not over it. Four workers at the shipped default project to about 124 requests per second, and that is arithmetic rather than a measurement. The real-service run described in [live-benchmark.md](live-benchmark.md) is deliberately small and cannot settle any of this |
| Model call behind one interface, so a self-hosted model can replace the vendor (pitch risk: lock-in) | Yes | `LLMProvider` in `policy_assistant/rag/llm.py`, with `OpenAIProvider` and `FakeProvider` registered in `_PROVIDERS` and chosen by `LLM_PROVIDER`; `tests/test_provider_timeout.py` | One real vendor is implemented. The fake exists for tests and refuses to start in production, so the swap is unproven against a second real provider |
| Customer record lookup behind one interface, shown to be workable rather than integrated | Not yet | `CustomerDataProvider` in section 2 of the design specification and grey in its Figure 1 | The requirement is a demonstration, so the alpha implements the contract with a simulated provider rather than reading a real customer system. Not written yet, and not tracked by an issue |
| Passages, metadata, and embeddings in one database rather than a vector store beside a document store (pitch) | Yes | `policy_assistant/rag/mongo.py`, the index setup in `policy_assistant/api/db.py`, `tests/test_indexes.py`; Atlas Vector Search index `vector_index` | The Atlas free tier caps the pilot corpus at 512 MB, which the pitch names as a risk |
| Deployed pilot with TLS and automatic deploys | Yes | README "Deployment" and "Checking a deploy"; `scripts/auto_deploy.sh`, `tests/test_auto_deploy.py` | One instance, no redundancy, a free DuckDNS name |
| Redesigned web app, responsive, keyboard-usable | Redesign shipped in PR #161 and its follow-ups | milestone "refactor: new UI/UX" | #51 responsive pass, #52 keyboard pass, #174 theme switch on a phone, #53 deployment verification, all open |

## Where the implementation differs from the Unit 3 design specification

The specification was written on 2026-08-30 and this commit is eleven days of
work past it. Nothing below breaks a contract the React app or the tests rely
on, but anyone reading the two side by side will find these, so the team names
them here.

| Item | Design specification | This commit | Why it changed |
| --- | --- | --- | --- |
| Edge | Figure 1 has one edge component: Nginx serves the app and proxies `/api` with buffering off | Caddy terminates TLS for `SITE_ADDRESS` and forwards to Nginx, which still serves the app and proxies `/api`. Only Caddy publishes ports | TLS with a Let's Encrypt certificate for the DuckDNS name arrived with the pilot host, after the specification was written. No contract changed. Figure 1 is stale |
| Endpoint contract | Section 2.1 lists login, chat, chat/stream, conversations (list, create, get), documents, and escalations (create, list, patch) | Also `GET /api/health` and `/api/config`, `PATCH` and `DELETE /api/conversations/{id}`, `GET /api/documents/categories`, `/body`, and `/passages`, `POST /api/documents/reindex`, `GET /api/escalations/{id}`, `POST /api/escalations/{id}/retry-delivery`, and the whole `/api/projects` resource | Every addition is additive, and Figure 1 already names projects among the route files. Section 2.1 needs the extra rows |
| Rate limits | Login 10 a minute per IP, escalation 5 | The same two, plus `CHAT_RATE_LIMIT` at 30 a minute per address per worker and `REINDEX_RATE_LIMIT` at 2 a minute | The chat cap is the binding ceiling for interactive use and is missing from section 2 of the specification |
| Throughput target | "the 10,000-user target, which we read as about 100 requests per second" | README and `scripts/loadtest/RESULTS.md` derive 83 requests per second from 10,000 employees each asking one question in a 120-second peak, and use that as their pass mark | Two readings of one requirement, from the same 10,000 employees. The team states the specification's figure of about 100 requests per second. `RESULTS.md` keeps 83 as its internal pass mark because that is what its own arithmetic gives, so the two documents differ on the target and agree on the measurement. Both rest on synthetic runs with the model faked |
| `CustomerDataProvider` | A planned interface, drawn grey in Figure 1, with `get_customer(id)` returning three fields and raising `PermissionError` for another owner's id | Not built. Nothing in `policy_assistant/` reads a customer database | The specification draws it grey because the requirement is to show the interface is workable, not to integrate a real customer system. The alpha satisfies it with a simulated provider behind the contract, the way `FakeProvider` already stands behind `LLMProvider`. That code is not written yet |
| Module paths | `src/llm.py`, `src/rag_chain.py`, `src/mongo.py` | `policy_assistant/rag/llm.py`, `policy_assistant/rag/rag_chain.py`, `policy_assistant/rag/mongo.py`, `policy_assistant/api/db.py` | The package layout refactor landed after the specification. The modules and their jobs are unchanged and only the paths moved. Figure 1 needs relabelling |

Checked against the specification and unchanged: the grounding threshold at
0.62, retrieval at k=5, the 20-turn history cap, the streaming event names and
payloads, the escalation record shape with its unique `(session_id,
message_index)` index, and the error and validation table in section 2.5.

## Verification status

| Check | Status on this commit | Evidence |
| --- | --- | --- |
| Python lint, tests on 3.11 to 3.14 with an 80% coverage floor, web lint and types and build, both Docker images, Compose validation, the proxy-chain acceptance script | Passed | [CI run 34534962223](https://github.com/CMSC495-GROUP3/Sourcebook/actions/runs/34534962223) |
| CodeQL, dependency audit, secret scan | Passed | [Security run 34534962098](https://github.com/CMSC495-GROUP3/Sourcebook/actions/runs/34534962098) |
| Answer quality against the live system | Not measured | see below |
| Real-service latency and error rate on the pilot | Passed, on a sample of seven | [live-benchmark.md](live-benchmark.md): all five agreed targets met on `4352966`, 1.21s median time to first token, no errors, no rate limiting |
| End-to-end pass through the deployed app by hand | Not recorded | see below |
| Escalation after a failed generation | Known defect, open as #84 | see the defects table |

The dependency review job runs only on pull requests, so a push to `main`
skips it. It last ran on the pull request that produced this commit.

### Answer quality

The measuring instrument works now and the measurement has not been taken.

PR #181 merged on 2026-09-10 and closed #180, a defect where the Live
evaluation workflow could finish green after the evaluator had failed. Empty
secrets, a nonzero evaluator exit, a missing results file, and malformed
metrics each fail the job. Two earlier workflow runs exist, from 2026-09-06
and 2026-09-07, and both predate that fix; one of them is the false green
#180 documents. Neither is evidence of anything.

What the alpha still owes:

- A smoke-tier run on this commit with an exit-code-verified result, reporting
  Recall@5, citation correctness, grounded answer rate, unsupported refusal
  handling, and the prompt-injection gate refusal rate.
- The same run against the pre-#138 baseline
  `9871e3ed2faa798cc21d237b421c7ac68963a9a2`, so the clarify-and-escalate
  prompt change from PR #138 can be judged as an improvement or not.
- Three questions asked by hand on both sides, on the PTO amount, on
  parental-leave eligibility, and on remote work, with a person deciding
  whether the clarification or escalation was the right call. The ambiguous
  and prompt-injection cases are reported for review rather than auto-scored,
  so a person has to read them.

A green workflow badge is not evidence of answer quality and the team does not
present it as such.

### Real-service performance

PR #186 merged the benchmark protocol and its harness on 2026-09-10. The
protocol is in [live-benchmark.md](live-benchmark.md) and the script is
`scripts/loadtest/live_benchmark.py`. It logs in once and sends a scripted
workload over the public address, through Caddy and Nginx to the API, with
real OpenAI and Atlas and the rate limits left on. It is capped at eight chat
requests and stops after two errors, so a full run costs under ten cents.

The operator agreed the targets unchanged and ran the workload on 2026-09-10
against deployed commit `4352966`. Seven chat requests, five generated, one
served from the cache, one refused. Every request took the path its step
expected. Median time to first token on the generated path was 1.21s against a
4.0s target, the slowest generation completed in 4.69s against 30.0s, the
cache hit answered in 0.04s, the refusal in 0.31s, and there were no errors
and no rate limiting. All five targets pass. Results, the settings in force,
and the limitations are in [live-benchmark.md](live-benchmark.md), with the
sanitized JSON in `live-benchmark-results.json`. This closes #183.

This is a bounded check that the deployed path works for one user and a burst
of three on a given day. It says nothing about 10,000 concurrent users, and a
passing run does not narrow the gap in the table above.

### End-to-end pass by hand

One pass through the deployed app gets recorded here. It reuses the
deployment verification from #53 and the responsive and keyboard work from #51
and #52 rather than repeating them. Before the escalation step,
`ESCALATION_WEBHOOK_URL` points at a controlled test destination or is left
unset.

| Field | Value |
| --- | --- |
| Date (UTC) | _not yet recorded_ |
| Tester | _not yet recorded_ |
| Browser and version | _not yet recorded_ |
| Deployed commit | _not yet recorded_ |
| Screenshots or logs | _not yet recorded_, sanitized, under `docs/evidence/alpha/` |

| Step | Expected | Result |
| --- | --- | --- |
| Sign in with the reviewer password | lands on the chat page; a wrong password shows "Incorrect password." | _not yet recorded_ |
| Ask a covered question | streamed answer with at least one cited source and a score | _not yet recorded_ |
| Open a cited source | Policy Library shows the whole document | _not yet recorded_ |
| Ask a follow-up in the same conversation | the answer uses the history; no cache badge | _not yet recorded_ |
| Reload the page | the conversation and its sources are restored from history | _not yet recorded_ |
| Ask an uncovered question | refusal card with the Ask Human Resources button | _not yet recorded_ |
| Escalate the refusal with a note | confirmation in the UI; the record appears at `GET /api/escalations?status=open`; the webhook arrives at the test destination if one is configured | _not yet recorded_ |
| Escalate the same message again | the first record comes back, not a second one | _not yet recorded_ |

### The passage index migration

PR #176 adds a unique index on `(source, chunk_index)` for passages and a
one-time migration to reconcile duplicates. It is not in this commit. The
passages collection keeps its non-unique index, so nothing at the database
level stops a duplicate passage identity from being written, and re-ingestion
relies on upserting by `(source, chunk_index)` to avoid it.

That pull request needs a database snapshot and a maintenance window, because
the migration deletes duplicate records and the application refuses to start
against a database still carrying the old index. The steps ship with it in
CONTRIBUTING.md. Tracked as #158.

## Known defects and limitations

| Issue | What a pilot user would see | Mitigation in the alpha |
| --- | --- | --- |
| #84 | an escalation filed after a failed generation can name the wrong exchange | reload after an error before escalating |
| #118 | provider saturation reads as a generic error, so the user does not know it is worth retrying | `OPENAI_MAX_CONCURRENT_REQUESTS` bounds the damage; retry by hand |
| #142 | concurrent project assignment and deletion can race | a single-operator pilot makes this unlikely at this volume |
| #158 | nothing at the database level prevents duplicate passage identities | ingestion upserts by `(source, chunk_index)`; PR #176 adds the constraint |
| #159 | Human Resources has no in-app queue | the handler works the queue through the API or a webhook-fed channel |
| #160 | no report over the query log yet | query the collection directly, or run the draft report from PR #171 by hand |
| #174, #51, #52 | phone and keyboard usability gaps | review the pilot in a desktop browser |
| README known limitations | a shared password, an untuned threshold, non-atomic re-ingestion, one instance, regex document search, a fictional corpus | documented in the README; none of them blocks a pilot |

## What this alpha does not establish

The 10,000-user requirement rests on synthetic measurements taken on a
development laptop with the model faked, the database in memory, and the chat
limiter off. Reading that requirement as about 100 requests per second, the
best measured figure is 98.7 on a single worker, which is just under the
target rather than over it. Four workers at the shipped `THREADPOOL_TOKENS`
default project to about 124 requests per second, but that number is
multiplication, not a run. `scripts/loadtest/RESULTS.md` gives the method and
the raw tables, and lists what its own harness cannot capture: real model
latency is slower and more variable, real Atlas is slower than a 15 ms
dictionary, and a development laptop is not the t3.micro the pilot runs on.
None of this measures the deployed system under load, and the bounded run in
[live-benchmark.md](live-benchmark.md) is too small to become one.

Answer quality is unmeasured on this commit, for the reasons above.

`CustomerDataProvider` is designed and not written. When the simulated
provider lands it will show that the contract holds, not that Sourcebook can
read a real customer system.

The corpus is fictional. Sourcebook has never been run against a real company's
policies, so the retrieval threshold, the refusal rate, and the citation
accuracy would all have to be revisited before anyone used it for real.

## Release notes for the prerelease

Sourcebook v0.1.0-alpha.1 is the first tagged version of the policy assistant.
It answers employee questions from a policy corpus and cites the document each
answer came from. When the corpus does not cover a question it says so and
lets the employee hand the question to Human Resources.

In this release: streaming answers with citations and a retrieval score; a
grounding gate that refuses rather than guesses; escalation with webhook
delivery and retry; conversation history with projects; a Policy Library that
renders whole documents; shared-password sign-in with a second password for
reviewers; rate limits and provider timeouts; a query log for later analysis;
and a Docker Compose deployment behind Caddy that redeploys itself when `main`
moves.

The pilot runs at <https://sourcebook.duckdns.org> on a single instance and
stays up while the course runs. The reviewer password comes from the team
through the course channel.

Known defects, limitations, and the checks the team has not run carry over
from the tables above.

The release body itself is [release-notes.md](release-notes.md), which repeats
the defects with their impact and mitigation inline rather than pointing back
here, because a release page is read on its own.

## The tag, and reproducing this version later

The pilot host follows `main`, so it moves past the tag. The tag does not. To
see the submitted version:

```bash
git clone https://github.com/CMSC495-GROUP3/Sourcebook.git
cd Sourcebook
git checkout v0.1.0-alpha.1
make setup && make stub        # fake model, in-memory database, no accounts
```

With a `.env` holding real credentials, `docker compose up --build` at that
checkout runs the full stack instead. The commit deployed on the pilot at any
moment is `refs/deployed/main` on the host, which the README's "Automatic
deploys" section explains. If the pilot has to be shown at the tagged version
after `main` has moved, the operator checks out the tag on the host and runs
`scripts/deploy.sh`, and records the date here.

The tag itself is annotated, so it carries its date and tagger, and the
release is marked prerelease so nobody mistakes it for production:

```bash
git fetch upstream
git checkout <the verified commit>
git tag -a v0.1.0-alpha.1 -m "Unit 5 alpha: verified per docs/alpha/handoff.md"
git push upstream v0.1.0-alpha.1
gh release create v0.1.0-alpha.1 --repo CMSC495-GROUP3/Sourcebook --prerelease \
  --title "v0.1.0-alpha.1" --notes-file docs/alpha/release-notes.md
```

`docs/alpha/release-notes.md` is written and is the release body, so the
release page and the repository say the same thing. Two things are filled in
at tag time and are deliberately not guessed now: the commit, and the
`Tagged commit:` line at the top of that file.

Before running the commands above, all of these must be true. The tag is the
claim that the alpha was verified, so cutting it early is the one mistake this
page exists to prevent.

| Blocker | State |
| --- | --- |
| Answer quality measured against the live system, per the gate on [#137](https://github.com/CMSC495-GROUP3/Sourcebook/issues/137) | Not done. This is the only remaining item that needs work rather than a merge |
| [PR #188](https://github.com/CMSC495-GROUP3/Sourcebook/pull/188) merged, or #84 accepted as a shipped defect | Open, CI green |
| [PR #190](https://github.com/CMSC495-GROUP3/Sourcebook/pull/190) merged, so the browser pass is on `main` | Open |
| A commit chosen on `main` after those merges, with its CI and Security runs green and linked in the table at the top of this page | Not chosen |

Once the tag exists, its link goes in the table at the top of this page and in
the README's Documentation table.
