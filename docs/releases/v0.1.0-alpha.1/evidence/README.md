# End-to-end pass evidence, Unit 5 alpha

Screenshots from the pass recorded in [../handoff.md](../handoff.md),
run on 2026-09-11 against deployed commit `4e90382` in Chromium 153.0.8010.12
at 1440x1000. The corpus is the fictional Meridian Systems sample, so no real
policy appears. No password, token, or session id is visible in any image.

| File | What it shows |
| --- | --- |
| `01-wrong-password.png` | a wrong password rejected with "Incorrect password." |
| `02-signed-in.png` | the chat page after signing in |
| `03-answer-with-sources.png` | a covered question answered at "Strong match · 75%" with two cited policies |
| `04-cited-source-open.png` | the cited Paid Time Off policy opened in full |
| `05-follow-up.png` | a follow-up answered against the conversation history |
| `06-after-reload.png` | both turns and their sources restored after a reload |
| `07-refusal.png` | an uncovered question refused in a new conversation, 59% |
| `08-escalation-form.png` | the escalation form with a note typed |
| `09-escalation-confirmed.png` | the confirmation and its reference number |
| `10-uncovered-question-in-conversation.png` | the same uncovered question clearing the gate at 69% inside a conversation, evidence for #189 |
