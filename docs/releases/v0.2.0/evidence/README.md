# End-to-end pass evidence, Unit 6 beta

Screenshots from the pass recorded in [../handoff.md](../handoff.md#end-to-end-pass-by-hand),
run on 2026-09-24 against the web client from `201754e` (PR #254) and the API
from `231e652`, in Google Chrome
152.0.7977.77 at 1440x1000. The corpus is the fictional Meridian Systems
sample, so no real policy appears. No password, token, or session id is
visible in any image. The untitled rows in the sidebar are the benchmark's
sessions, which the script creates without a title.

| File | What it shows |
| --- | --- |
| `01-wrong-password.png` | a wrong password rejected with "Incorrect password." |
| `02-signed-in.png` | the chat page after signing in |
| `03-answer-with-sources.png` | a covered question answered at "Strong match · 76%" with three source chips |
| `04-cited-source-open.png` | the cited Paid Time Off policy open in the source pane |
| `05-follow-up.png` | a follow-up answered against the conversation history |
| `06-after-reload.png` | the same conversation after a reload, scrolled to the top: all three turns (including the #189 turn from step 07) with their scores and chips. Retaken at 22:04 UTC because the first capture was identical to `05` |
| `07-uncovered-follow-up.png` | an uncovered question asked as a follow-up refused at 59% (#189) |
| `08-refusal.png` | the same question refused in a new conversation |
| `09-pet-insurance-refusal.png` | `unanswerable_01` refused by the coverage judge (#192), with the misleading "Strong match · 79%" badge |
| `10-escalation-form.png` | the escalation form with a note typed |
| `11-escalation-confirmed.png` | the confirmation and its reference number |
| `12-hr-requests-open.png` | the new request at the top of the HR Requests open list, with its detail |
| `13-hr-request-resolved.png` | the request in the Resolved list with its resolution note |
| `14-hr-request-reopened.png` | the request back in the open list after Reopen request |
