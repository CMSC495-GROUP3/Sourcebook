# Stakeholder video shot list (v1.0.0)

**Status:** Pre-production only. Recording, final screenshots, deployed SHA,
and video URL are **pending**. Pair with
[stakeholder-video-script.md](stakeholder-video-script.md).

**Issue:** [#216](https://github.com/CMSC495-GROUP3/Sourcebook/issues/216).

**Folder note:** Same `docs/releases/v1.0.0/` layout as
[pull request #230](https://github.com/CMSC495-GROUP3/Sourcebook/pull/230).
This file does not replace Lane 4 measurement docs (for example `numbers.md`)
or the portfolio/handoff pages owned by other lanes.

## Capture settings

| Setting | Value |
| --- | --- |
| Resolution | 1080p |
| Layout | One take per segment, cut together |
| Browser | Full window on the pilot / tagged host; hide personal bookmarks |
| Secrets | No passwords, tokens, or `.env` values on screen or in narration |
| SHA bug | Show deployed commit once on the title and once before the live demo ends — value **pending** until tag |

## Shot table

| Shot | Timestamp (plan) | Segment | Visual | Audio / speaker | Notes |
| --- | --- | --- | --- | --- | --- |
| S01 | 0:00–0:20 | Title | Opening slide: Sourcebook, team names, `v1.0.0`, `<SHA pending>` | Speaker A | Record after tag; leave SHA placeholder until then |
| S02 | 0:20–1:50 | Problem | Slide or README "The problem" section on screen | Speaker A | No live answers yet |
| S03 | 1:50–2:40 | Architecture | Mermaid / three-container diagram (`caddy`, `web`, `api`) | Speaker A | Freeze frame OK |
| S04 | 2:40–3:50 | Architecture | Same diagram; highlight grounding gate and refuse path | Speaker A | Name server-side history |
| S05 | 3:50–4:10 | Demo sign-in | Sign-in page on pilot | Speaker B | Credential via course channel, not spoken |
| S06 | 4:10–4:40 | Grounded answer | Chat: send eval `answerable_01` | Speaker B | Outcome class `answer` expected; **wording pending live run** |
| S07 | 4:40–5:00 | Citation | Sources panel / match percentage visible | Speaker B | Do not invent citation text in editing |
| S08 | 5:00–5:30 | Source open | Policy Library / cited document view | Speaker B | Same conversation turn |
| S09 | 5:30–6:10 | Follow-up | Chat: send eval `answerable_04` | Speaker B | Outcome class `answer` expected; **wording pending** |
| S10 | 6:10–6:40 | Uncovered | Chat: send eval `unanswerable_01` | Speaker B | Outcome class `refuse` expected |
| S11 | 6:40–7:00 | Refusal card | Full refusal UI in frame | Speaker B | Hold 3–5 seconds |
| S12 | 7:00–7:30 | Escalation form | Ask Human Resources form filled (non-secret fields) | Speaker B | No PII beyond demo question |
| S13 | 7:30–7:50 | Escalation confirmed | Confirmation / escalation id on screen | Speaker B | Keep id for S14 |
| S14 | 7:50–9:20 | HR handling | Queue / API client / handler UI as shipped on tag | Speaker B + HR handler | Do not stage a fake console |
| S15 | 9:20–10:20 | RAG rationale | Slide: RAG vs fine-tuning bullets | Speaker A | Citations + ingest without retrain |
| S16 | 10:20–11:00 | Grounding | Slide or code pointer: best score vs threshold | Speaker A | No live metric invention |
| S17 | 11:00–11:50 | CI/CD | `docs/ci-cd.md` or Actions overview (public pages only) | Speaker A | Final run URLs **pending** tagged SHA |
| S18 | 11:50–13:20 | Quality / eval | `docs/quality.md` + eval tier names; measurement pages if present | Speaker C | Numbers from Lane 4 / freeze only — else say pending |
| S19 | 13:20–14:20 | Value prop | Closing slide: employee / HR / policy-owner bullets | Speaker C | End card: URL pending |

## B-roll and cutaways (optional)

| Cutaway | Use when | Pending? |
| --- | --- | --- |
| README architecture mermaid | S03–S04 | No (repo asset) |
| Empty `evidence/` reminder | Editor slate if screenshots missing | Yes — final PNGs pending |
| Coverage / eval chart | S18 | Yes — only after final live measurement |

## Screenshot inventory (all pending)

These are placeholders for post-recording stills. Do not commit binary evidence
in this pull request.

| ID | Intended still | Maps to shot |
| --- | --- | --- |
| VID-01 | Title slide with final SHA | S01 |
| VID-02 | Grounded answer with sources | S06–S07 |
| VID-03 | Cited source open | S08 |
| VID-04 | Follow-up answer | S09 |
| VID-05 | Refusal card | S11 |
| VID-06 | Escalation confirmed | S13 |
| VID-07 | HR queue / resolve | S14 |

## Edit checklist

- [ ] Segment order matches the script timestamps
- [ ] No password keystrokes or secret values in frame
- [ ] Lower-third speaker names match the opening slide
- [ ] Deployed SHA on title matches the tagged commit
- [ ] No voice-over that asserts final eval PASS without the live artifact
- [ ] Export MP4; upload unlisted; paste URL into release notes / README / portfolio in a later change
- [ ] Keep the MP4 for the course submission form

## Out of scope for this file

- Publishing or uploading the video
- Filling Lane 4 numbers or coverage tables
- Closing [#216](https://github.com/CMSC495-GROUP3/Sourcebook/issues/216)
- Editing `user-guide`, CI workflows, or unrelated portfolio pages
