# Stakeholder video script (v1.0.0)

**Status:** Script and shot list only. Recording, final screenshots, deployed
SHA, and video URL are **pending**. Do not treat this page as proof that the
Unit 8 video was recorded or published.

**Issue:** [#216](https://github.com/CMSC495-GROUP3/Sourcebook/issues/216)
(part of [#201](https://github.com/CMSC495-GROUP3/Sourcebook/issues/201) step 5).

**Audience:** Technical stakeholders (course graders, peer reviewers, and HR /
engineering partners who need a grounded walkthrough).

**Runtime target:** 10–15 minutes. Timestamps below are a rehearsal plan; trim
or stretch per segment after the day-before pilot rehearsal.

**Record after:** Annotated tag `v1.0.0` exists and the demo host shows that
submitted commit. Until then, keep every live answer and metric claim marked
**pending final live run**.

**Folder note:** This file lives under `docs/releases/v1.0.0/` to match the
portfolio scaffold in [pull request #230](https://github.com/CMSC495-GROUP3/Sourcebook/pull/230).
Sibling release pages (`portfolio.md`, `handoff.md`, `release-notes.md`,
`evidence/`) and Lane 4 measurement pages (for example `numbers.md`) are owned
elsewhere. This pull request adds only the stakeholder video package files.

## Pending deliverables (do not invent)

| Deliverable | State |
| --- | --- |
| Final recording (1080p MP4) | **Pending** |
| Unlisted YouTube (or hosted) URL | **Pending** |
| Deployed SHA shown in the demo | **Pending** — capture from the pilot after `v1.0.0` |
| Final screenshots for the video package | **Pending** — publish via the evidence workflow after the live pass |
| Live demo answers / citation text | **Pending** — do not paste final answers here before the live run |
| Link from README, release notes, and `portfolio.md` | **Pending** — follow-up after upload |

## Speakers (placeholders)

Replace names on the opening slide before recording.

| Placeholder | Role on camera |
| --- | --- |
| **Speaker A** | Problem, architecture, RAG / grounding, CI/CD |
| **Speaker B** | Live browser demo (sign-in through escalation) |
| **Speaker C** | Quality / evaluation evidence and value proposition |
| **HR handler** | Optional third person for the HR queue segment (can be Speaker A or B) |

Opening slide: team names, course, product name **Sourcebook**, and
"recorded against tag `v1.0.0` @ `<SHA pending>`".

## Demo questions (evaluation dataset only)

Questions are taken from `evaluation/questions.json` (smoke tier) so expected
outcomes are known. **Do not claim the live model's final wording in this
script.** At recording time, read the on-screen answer and confirm it matches
the expected outcome class (`answer`, `refuse`, or follow-up grounded in the
same sources).

| Demo beat | Eval ID | Question (exact) | Expected outcome class | Expected sources / behavior (label only) |
| --- | --- | --- | --- | --- |
| Grounded answer | `answerable_01` | How many PTO days do full time employees with two years of service receive each year? | `answer` | Cite Paid Time Off (PTO) Policy; label expects 15 days |
| Citation / source open | same turn | — | `answer` | Open the cited document from the sources UI |
| Follow-up | `answerable_04` | How much paid parental leave does a non birthing parent receive? | `answer` | Cite Parental Leave Policy; label expects eight weeks at 100% base salary |
| Uncovered refusal | `unanswerable_01` | Does Meridian reimburse employee pet insurance? | `refuse` | Decline; corpus does not address pet insurance |
| Escalation | after refusal | Use **Ask Human Resources** on the refusal card | escalation filed | Show confirmation; leave queue handling to the HR segment |

Optional spare grounded question if the first retrieval looks weak on rehearsal:
`answerable_03` — "What company match do I receive if I contribute five percent
to my 401(k)?" (`answer`, 401(k) Retirement Savings Plan).

Stakeholder camera time stays on the uncovered-refusal path above. Other smoke
rows that exercise hostile instruction overrides are out of scope for this
recording package.

## Timestamped script

Total planned: **~13:00** (fits 10–15).

### 0:00–0:20 — Title (Speaker A)

> "This is Sourcebook, our retrieval-augmented policy assistant for Unit 8.
> We are recording against tag `v1.0.0` at commit `<SHA pending>`. Speakers
> today: `<names>`."

### 0:20–1:50 — Problem statement (~1.5 min) (Speaker A)

**Source:** README "The problem".

Talking points:

- Employees spend time searching scattered policy and onboarding documents;
  HR answers the same questions repeatedly.
- The documents usually contain the answer; discovery is the expensive part.
- Goal: plain-language search over the corpus with an answer **and** a source
  the reader can check, rather than trusting memory or an uncited summary.

Say explicitly: we refuse when evidence is too weak — honesty is a product
requirement, not a slide slogan.

### 1:50–3:50 — Solution / architecture (~2 min) (Speaker A)

**Source:** README architecture diagram and Compose table.

Talking points:

- Three Compose services on one EC2 host: `caddy` (TLS edge), `web` (React +
  Nginx), `api` (FastAPI RAG pipeline). OpenAI, MongoDB Atlas, and S3 sit
  outside Compose.
- Request path in one sentence: browser to Caddy to Nginx to API to Atlas
  Vector Search to grounding gate to model (or refuse) to SSE stream back to
  the UI.
- Honesty measures to name on camera: server-side conversation history (no
  client-supplied chat history), grounding gate on best passage score vs
  `SIMILARITY_THRESHOLD`, citations on every answered turn, escalation when
  the corpus cannot help.

Optional visual: freeze the README mermaid diagram or a printed slide of the
three containers — see the shot list.

### 3:50–7:50 — AI demonstration (~4 min) (Speaker B)

**Source:** browser pass pattern from the release handoff; questions from the
table above. Pilot: `https://sourcebook.duckdns.org` (or the tagged host once
frozen).

| Clock | Action | Spoken cue |
| --- | --- | --- |
| 3:50 | Sign in | "Shared pilot credential — no secrets on the recording." |
| 4:10 | Ask `answerable_01` | "Smoke-tier eval id `answerable_01`. We expect a grounded answer with a PTO citation — exact wording pending this live run." |
| 4:40 | Point at sources + match | "Citation and retrieval match are part of the response, not a separate doc hunt." |
| 5:00 | Open cited source | "Same turn: open the cited policy so a stakeholder can verify the paragraph." |
| 5:30 | Ask `answerable_04` as follow-up | "Follow-up still has to stand alone after rewrite; we expect parental-leave grounding — live wording pending." |
| 6:10 | Ask `unanswerable_01` | "Uncovered question from the eval set. We expect refusal, not an invented benefit." |
| 6:40 | Show refusal card | "Refuse rather than guess." |
| 7:00 | Escalate | "Ask Human Resources from the same screen; confirmation should appear." |
| 7:30 | Pause on confirmation | "Escalation id stays on screen for the HR segment." |

**Hard rule:** If the live run disagrees with the expected outcome class, stop
the take, note the discrepancy, and do not narrate a fabricated "correct"
answer over a wrong UI state.

### 7:50–9:20 — Escalation and HR handling (~1.5 min) (Speaker B + HR handler)

Talking points:

- Employee path: refusal or unhelpful answer to escalation record (+ optional
  webhook).
- Handler path: open queue via the escalations API (and any in-app queue the
  tagged build exposes). Mark resolved after a human answer.
- Say what the alpha / final notes still limit: do not claim a full Slack/Teams
  operator console unless that UI is actually on the tagged build.

### 9:20–11:50 — Technical implementation (~2.5–3 min) (Speaker A)

**Sources:** README (RAG vs fine-tuning, grounding, `LLMProvider`),
`docs/ci-cd.md`.

Talking points:

- **Why RAG, not fine-tuning:** citations and stale-policy risk. New documents
  ingest without retraining.
- **Grounding gate:** best passage score vs threshold; below threshold means no
  model call for a policy answer; decline with no citation claim.
- **Server-side history:** history loaded by `session_id` from MongoDB; the
  client cannot supply forged conversation turns or forged sources.
- **`LLMProvider`:** one interface; OpenAI for the pilot, fake provider for
  stub/tests; swap is a configuration choice, not a rewrite.
- **CI/CD:** name the workflow family honestly (code CI, security, pull request
  checks, evaluation instrumentation, deploy path / `auto_deploy`). Point at
  `docs/ci-cd.md` rather than inventing run URLs. Final green runs for the
  tagged SHA are **pending** until captured after tag.

### 11:50–13:20 — Performance, reliability, quality / eval (~1.5–2.5 min) (Speaker C)

**Source:** `docs/quality.md`, evaluation README, release measurement pages
when Lane 4 / freeze fills them.

Talking points:

- Smoke tier: 20 labeled cases in `evaluation/questions.json`; full tier is
  larger and is not required to be re-run on camera.
- Metrics to mention by **name** only until final numbers exist: citation
  correctness, unsupported refusal handling, coverage / gate behavior.
- Load / benchmark: point at documented targets and the last committed
  measurement pages; **do not recite invented final percentages**.
- Gate fix narrative: describe the engineering intent (refuse when unsupported)
  and point reviewers to quality docs plus open issue tracking for any remaining
  live-eval blockers — without claiming PASS for a run that has not been
  re-executed on the tagged SHA.

### 13:20–14:20 — Value proposition (~1 min) (Speaker C)

**Sources:** README, `docs/user-guide.md` (when present on the tag).

Talking points:

- **Employees:** faster answers with sources they can open.
- **HR:** fewer repeat tickets; escalations arrive with question context.
- **Policy owners:** query-log / knowledge-gap signal shows where the corpus is
  silent (reports as shipped on the tagged build — do not over-claim).

Close: "Video URL and README link land after upload. MP4 retained for the
submission form. End of stakeholder pass."

## Rehearsal checklist

- [ ] Day-before rehearsal on the pilot (or tagged host)
- [ ] Confirm deployed SHA matches the intended tag
- [ ] Run the five demo beats; record expected outcome class only
- [ ] 1080p, one take per segment, cut together
- [ ] Team names on the opening slide
- [ ] Export MP4; upload unlisted; names in the description
- [ ] Link from README, `v1.0.0` release notes, and `portfolio.md`

## Related files

- Shot list: [stakeholder-video-shot-list.md](stakeholder-video-shot-list.md)
- Issue: <https://github.com/CMSC495-GROUP3/Sourcebook/issues/216>
- Portfolio map: <https://github.com/CMSC495-GROUP3/Sourcebook/issues/201>
