# Unit 5 integration team roles

Unit 5 asks the team to name a Lead Architect, an Interface Designer, and an
Integration Lead at its first planning meeting. This page is the record of
those assignments for the Sourcebook alpha. It is shared project
documentation, separate from each member's peer review and refinement report.

Status on 2026-09-09: **unconfirmed draft.** The repository holds no meeting
notes and no earlier record of these three roles. The mapping below is what the
repository's own evidence points to. Nobody has confirmed it yet, and nothing
here is backdated. Tracking issue:
[#182](https://github.com/CMSC495-GROUP3/Sourcebook/issues/182).

## Roles

| Role | Member (GitHub) | Confirmed by, date | Basis for the draft mapping |
| --- | --- | --- | --- |
| Lead Architect | Taylor Shahan (@t-shahan) | _pending_ | Wrote the README architecture, throughput, and deployment sections; largest commit count; CODEOWNER; maintains the API contract per milestone 1 |
| Interface Designer | Gavin (@gavinwathen), with Dominick (@fudgepop01) | _pending_ | Milestone "refactor: new UI/UX" names Gavin and Dominick as owners of design and styling; #41 and #43 (prototypes, design tokens); assigned #51, #52, #53, #159, #174 |
| Integration Lead | _pending_ | _pending_ | Two candidates from the evidence: @threshi-art (ran the integration review wave across #84, #159, #160, evaluation workflow, #181) and @DanielTsang26 (repository owner, CODEOWNER, admin). The team has to pick one |

Other members and where their work sits, so the reviewer can see the whole
team: @DanielTsang26 (repository owner, admin, CODEOWNER), @Lazzy-dev (admin,
CODEOWNER, dependency locks in #157, naming in #170), @RoNUO (RobertN, corpus
availability in #150, unique passage index in #176), @threshi-art (Lokias,
evaluation suite, rate limiting, escalation delivery, HR content).

## What each role owns for the alpha integration

Lead Architect. Keeps the module boundaries in `policy_assistant/` and the
contract between the API and `web/` stable while the pieces land. Decides how a
change that spans API, web, and deploy gets split. Owns the deployment shape
(Compose, Caddy, the EC2 host) and the throughput and provider-bound decisions
recorded in `scripts/loadtest/RESULTS.md`.

Interface Designer. Owns the web app's structure, tokens, and interaction
states, and the frontend side of the API contract. Signs off that the
sign-in, chat, refusal, escalation, and Policy Library screens match the
design before the alpha tag. Owns the responsive and keyboard passes (#51,
#52, #174).

Integration Lead. Owns getting merged work verified as one system: branch
currency with `main`, the CI status check, the live evaluation gate (#137,
#180, #181), the migration review for #176, and the pre-tag checklist in
[handoff.md](handoff.md). Decides what counts as done for the alpha and
records the evidence.

## Meeting and decision record

| Date | What | Link |
| --- | --- | --- |
| _none recorded_ | Initial Unit 5 planning meeting | No notes in the repository, wiki, or issue tracker as of 2026-09-09 |

If the meeting happened outside GitHub, add the actual date and a link to the
notes. If it did not happen, record the date the roles were confirmed instead.
Do not fill in a date for a meeting that has no record.

## How to close this out

1. Each named member confirms their role in a comment on #182, or the team
   confirms all three in one meeting and links the notes here.
2. Fill in the "Confirmed by, date" column with the commenter and the comment
   date. Replace the two candidates for Integration Lead with one name.
3. Move the row from "unconfirmed draft" to confirmed in the status line at
   the top, keeping the date it changed.
4. Confirm the handoff document links this page. It does, from the evidence
   index in [handoff.md](handoff.md), once that page merges.
