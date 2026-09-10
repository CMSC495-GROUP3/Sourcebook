# Unit 5 integration team roles

Unit 5 asks the team to name a Lead Architect, an Interface Designer, and an
Integration Lead at its first planning meeting. The team already made those
assignments in its project pitch. This page is the repository's copy of that
record for the Sourcebook alpha. It is shared project documentation, separate
from each member's peer review and refinement report.

Status on 2026-09-10: **taken from the project pitch, one confirmation
outstanding.** The three rows below are the pitch's assignments, not a fresh
reading of the commit history. Chris confirmed his row on
[PR #185](https://github.com/CMSC495-GROUP3/Sourcebook/pull/185#issuecomment-5612132102).
Daniel's row is unconfirmed, and the pitch's date is not recorded here yet.
Tracking issue:
[#182](https://github.com/CMSC495-GROUP3/Sourcebook/issues/182).

## Roles

| Role | Member (GitHub) | The pitch's words | Confirmed | What the repository shows |
| --- | --- | --- | --- | --- |
| Lead Architect | Taylor Shahan (@t-shahan) | "Taylor, Lead Architect (diagrams)" | @t-shahan, 2026-09-10, this record | Wrote the architecture, throughput, and deployment sections of the README and the diagrams in the Unit 3 design specification; largest commit count; CODEOWNER; maintains the API contract per milestone 1 |
| Interface Designer | Daniel Tsang (@DanielTsang26) | "Daniel, Interface Designer (API and interfaces)" | _pending_ | Created the repository and merged its first three PRs; owner, admin, and CODEOWNER; reviewed and merged #170, which changed a contract the frontend and the corpus both depend on |
| Integration Lead | Chris (@threshi-art, commits as Lokias) | "Chris, Integration Lead (AI feature integration)" | @threshi-art, [2026-09-10](https://github.com/CMSC495-GROUP3/Sourcebook/pull/185#issuecomment-5612132102) | Evaluation suite, rate limiting, escalation delivery, and the Human Resources corpus content; ran the integration review wave across #84, #159, #160, and the evaluation workflow in #180 and PR #181 |

The pitch's parenthetical for Interface Designer reads "API and interfaces",
so the role covers the interface contracts in section 2 of the design
specification rather than the visual design. The web app's look and its
components are built by the three members below.

Chris proposed on PR #185 that he and Daniel hold Integration Lead together,
Chris for day-to-day integration and evidence and Daniel for repository
authority at the canonical boundary. His comment allowed for one primary name
if the submission needs one. Because the pitch names Daniel as Interface
Designer, this page keeps Chris as the named Integration Lead and records
Daniel's repository authority as a supporting responsibility under that role.
If the team wants both names in the row, say so on #182 and it changes.

The rest of the team, so a reviewer sees the whole roster:

| Member (GitHub) | Where their work sits |
| --- | --- |
| Gavin (@gavinwathen) | React components, design and styling; owner of milestone "refactor: new UI/UX" with Dominick; #41 and #43 (prototypes, design tokens); assigned #51, #52, #53, #159, #174 |
| Dominick (@fudgepop01) | React components, design and styling; the other named owner of milestone 1 |
| George Struder (@Lazzy-dev) | Admin and CODEOWNER; dependency locks in #157; the escalation contact rename in #170, which touched the web app, the corpus, and the fixtures |
| Robert (@RoNUO) | Corpus availability during re-ingestion in #150; the unique passage identity index in #176; the changes-requested review on PR #181 |

## What each role owns for the alpha integration

Lead Architect. Keeps the module boundaries in `policy_assistant/` and the
split between the API and `web/` stable while the pieces land. Decides how a
change that spans API, web, and deploy gets split. Owns the deployment shape
(Compose, Caddy, Nginx, the EC2 host) and the throughput and provider-bound
decisions recorded in `scripts/loadtest/RESULTS.md`. Owns the diagrams and
keeps them honest against what the code does; the differences the alpha
carries are listed in [handoff.md](handoff.md).

Interface Designer. Owns the contracts in section 2 of the design
specification: the endpoint shapes, the streaming events, the component
interfaces `LLMProvider` and the RAG pipeline expose, and the stored records.
A change to any of those is a change to the contract the React app and the
tests are written against, so it goes through this role. Also owns the
repository boundary itself as CODEOWNER, which is where a contract change
becomes final.

Integration Lead. Owns getting merged work verified as one system: branch
currency with `main`, the CI status check, the live evaluation gate (#137,
#180, PR #181), the migration review for #176, and the pre-tag checklist in
[handoff.md](handoff.md). Decides what counts as done for the alpha and
records the evidence.

## Meeting and decision record

| Date | What | Link |
| --- | --- | --- |
| _pending_ | Project pitch assigns the three roles | Team pitch document, not in this repository. Fill in its date and where it lives |
| 2026-08-30 | Unit 3 design specification records the interface contracts the Interface Designer owns | `Policy-Assistant-Design-Specification`, not in this repository |
| 2026-09-10 | Chris confirms Integration Lead and proposes sharing it with Daniel | [PR #185 comment](https://github.com/CMSC495-GROUP3/Sourcebook/pull/185#issuecomment-5612132102) |
| _pending_ | Daniel confirms Interface Designer | #182 or PR #185 |

There are no meeting notes in the repository, the wiki, or the issue tracker.
If the planning meeting happened outside GitHub, add its date and a link to
the notes. Do not fill in a date for a meeting that has no record.

## How to close this out

1. Daniel confirms Interface Designer on #182 or on PR #185, or corrects it.
2. Fill in the pitch's date in the decision record and say where the document
   lives, so a grader can follow the assignment back to its source.
3. Change the status line at the top from "one confirmation outstanding" to
   confirmed, keeping the date it changed.
4. Confirm the handoff document links this page. It does, from the evidence
   index in [handoff.md](handoff.md), once that page merges.
