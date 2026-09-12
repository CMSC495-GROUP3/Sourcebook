# Evaluation sets

`questions.json` is the smoke tier and `questions_full.json` the full tier.
What they measure and how to run them is in [docs/evaluation.md](../docs/evaluation.md).

`full_unanswerable_03` is the #189 condensed-query escape fixture. Optional
`history` and `condensed_question` fields label the follow-up that must still
refuse. The live runner scores the standalone `question`; unit tests in
`tests/test_grounding_dual_signal.py` apply the dual-signal gate to both
strings. Smoke stays at 20 cases.
