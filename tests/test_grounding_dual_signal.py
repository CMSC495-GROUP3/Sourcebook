"""#189: condensed retrieval must not launder an uncovered standalone question."""

import json
from pathlib import Path

from conftest import make_passages

from sourcebook.rag import rag_chain
from sourcebook.rag.config import REFUSAL_MESSAGE
from sourcebook.rag.evaluation import EVALUATION_TIERS, load_cases
from sourcebook.rag.rag_chain import (
    answer_question,
    cited_sources,
    ground_question,
    is_grounded,
    resolve_grounding,
)

PTO_HISTORY = [
    {"role": "user", "content": "How much PTO do I get?"},
    {
        "role": "assistant",
        "content": "Full-time employees accrue 15 days of PTO per year.",
        "sources": ["Paid Time Off (PTO) Policy"],
    },
]

MERCURY = "What is the boiling point of mercury at sea level?"
REFERENTIAL_FOLLOW_UP = "how much do I get?"
CONDENSED_MERCURY = f"{MERCURY} under the Paid Time Off policy"


def _condensed_only_gate(passages: list[dict]) -> bool:
    """Pre-#189 rule: score only the passages returned for the retrieval query."""
    return is_grounded(passages)


class TestCondensedQueryEscapeReproduction:
    """These assertions fail on the unpatched (condensed-only) rule."""

    def test_condensed_only_gate_passes_mercury_after_pto(self):
        original = make_passages(0.59, title="Disciplinary Action and Termination")
        lifted = make_passages(0.80, 0.75, title="Paid Time Off (PTO) Policy")
        assert is_grounded(original, threshold=0.62) is False
        assert _condensed_only_gate(lifted) is True

    def test_dual_signal_refuses_the_same_pair(self):
        original = make_passages(0.59, title="Disciplinary Action and Termination")
        lifted = make_passages(0.80, 0.75, title="Paid Time Off (PTO) Policy")
        grounded, chosen = resolve_grounding(
            MERCURY,
            original_passages=original,
            condensed_query=CONDENSED_MERCURY,
            condensed_passages=lifted,
        )
        assert grounded is False
        assert chosen == original
        assert cited_sources(chosen) == ["Disciplinary Action and Termination"]


class TestDualSignalRule:
    def test_referential_follow_up_can_use_condensed_retrieval(self):
        original = make_passages(0.50, title="Paid Time Off (PTO) Policy")
        rewritten = make_passages(0.80, title="Paid Time Off (PTO) Policy")
        grounded, chosen = resolve_grounding(
            REFERENTIAL_FOLLOW_UP,
            original_passages=original,
            condensed_query="How much PTO do I get in my first year?",
            condensed_passages=rewritten,
        )
        assert grounded is True
        assert chosen == rewritten

    def test_supported_follow_up_with_topic_term_in_the_hits(self):
        original = make_passages(0.48, title="Paid Time Off (PTO) Policy")
        rewritten = make_passages(0.81, title="Paid Time Off (PTO) Policy")
        rewritten[0]["text"] = "Contractors accrue PTO on a separate schedule."
        grounded, chosen = resolve_grounding(
            "what about contractors?",
            original_passages=original,
            condensed_query="How much PTO do contractors accrue?",
            condensed_passages=rewritten,
        )
        assert grounded is True
        assert chosen == rewritten

    def test_topic_shift_follow_up_is_not_cited_from_prior_policy(self):
        original = make_passages(0.40, title="Health Insurance and Benefits Enrollment")
        lifted = make_passages(0.80, title="Paid Time Off (PTO) Policy")
        grounded, chosen = resolve_grounding(
            "what about mercury?",
            original_passages=original,
            condensed_query="What about mercury in the Paid Time Off policy?",
            condensed_passages=lifted,
        )
        assert grounded is False
        assert chosen == original

    def test_first_turn_refusal_stays_on_the_raw_question(self):
        weak = make_passages(0.50, 0.40)
        grounded, chosen = resolve_grounding(
            MERCURY,
            original_passages=weak,
            condensed_query=MERCURY,
            condensed_passages=weak,
        )
        assert grounded is False
        assert chosen == weak

    def test_first_turn_answer_is_unchanged(self):
        strong = make_passages(0.80, 0.75)
        grounded, chosen = resolve_grounding(
            "How much PTO do I get?",
            original_passages=strong,
            condensed_query="How much PTO do I get?",
            condensed_passages=strong,
        )
        assert grounded is True
        assert chosen == strong

    def test_hr_adjacent_standalone_is_outside_this_gate(self):
        # #192: an uncovered HR-flavoured ask that already clears the cosine
        # threshold on the original question is not this correction.
        adjacent = make_passages(0.73, title="Relocation Assistance")
        question = "May I take a six month paid sabbatical after ten years?"
        grounded, chosen = resolve_grounding(
            question,
            original_passages=adjacent,
            condensed_query=question,
            condensed_passages=adjacent,
        )
        assert grounded is True
        assert chosen == adjacent


def _retrieve_by_query(query: str, k: int = 5) -> list[dict]:
    """Synthetic Atlas: mercury is weak; condensed PTO-shaped queries are strong."""
    lowered = query.casefold()
    if "mercury" in lowered:
        return make_passages(0.59, title="Health Insurance and Benefits Enrollment")[:k]
    if query == REFERENTIAL_FOLLOW_UP:
        return make_passages(0.50, title="Paid Time Off (PTO) Policy")[:k]
    return make_passages(0.80, 0.75, title="Paid Time Off (PTO) Policy")[:k]


class TestAnswerAndRetrieveApplyTheGate:
    def test_unsupported_original_refuses_after_unrelated_history(self, monkeypatch):
        monkeypatch.setattr(rag_chain, "_vector_search", _retrieve_by_query)
        result = answer_question(MERCURY, PTO_HISTORY)
        assert result["refused"] is True
        assert result["answer"] == REFUSAL_MESSAGE
        assert result["sources"] == []
        assert result["follow_ups"] == []
        assert result["confidence"] == 59

    def test_supported_follow_up_still_answers(self, monkeypatch):
        monkeypatch.setattr(rag_chain, "_vector_search", _retrieve_by_query)
        result = answer_question(REFERENTIAL_FOLLOW_UP, PTO_HISTORY)
        assert result["refused"] is False
        assert result["sources"] == ["Paid Time Off (PTO) Policy"]
        assert result["answer"]
        assert result["confidence"] == 78

    def test_first_turn_unsupported_still_refuses(self, monkeypatch):
        monkeypatch.setattr(rag_chain, "_vector_search", _retrieve_by_query)
        result = answer_question(MERCURY, [])
        assert result["refused"] is True
        assert result["sources"] == []

    def test_refusal_does_not_call_the_answer_model(self, monkeypatch):
        monkeypatch.setattr(rag_chain, "_vector_search", _retrieve_by_query)

        def no_answer(*args, role="utility", **kwargs):
            assert role != "answer"
            return CONDENSED_MERCURY

        monkeypatch.setattr(
            rag_chain, "get_provider", lambda: type("P", (), {"complete": no_answer})()
        )
        result = answer_question(MERCURY, PTO_HISTORY)
        assert result["refused"] is True

    def test_retrieve_passages_scores_both_signals_after_a_rewrite(self, monkeypatch):
        calls: list[str] = []

        def search(query: str, k: int = 5) -> list[dict]:
            calls.append(query)
            return _retrieve_by_query(query, k)

        monkeypatch.setattr(rag_chain, "_vector_search", search)
        monkeypatch.setattr(
            rag_chain,
            "condense_question",
            lambda query, history: CONDENSED_MERCURY,
        )
        rag_chain._pending_original_query.set(MERCURY)
        chosen = rag_chain.retrieve_passages(CONDENSED_MERCURY)
        assert calls == [CONDENSED_MERCURY, MERCURY]
        assert is_grounded(chosen) is False
        assert cited_sources(chosen) == ["Health Insurance and Benefits Enrollment"]

    def test_ground_question_retrieves_both_signals_on_a_rewrite(self, monkeypatch):
        calls: list[str] = []

        def search(query: str, k: int = 5) -> list[dict]:
            calls.append(query)
            return _retrieve_by_query(query, k)

        monkeypatch.setattr(rag_chain, "_vector_search", search)
        monkeypatch.setattr(
            rag_chain,
            "condense_question",
            lambda query, history: CONDENSED_MERCURY,
        )
        rag_chain._pending_original_query.set(MERCURY)
        retrieval = ground_question(MERCURY, PTO_HISTORY)
        assert calls == [CONDENSED_MERCURY, MERCURY]
        assert retrieval["grounded"] is False
        assert retrieval["confidence"] == 59


class TestEvaluationFixture:
    def test_full_tier_records_the_condensed_query_escape(self):
        cases = {case["id"]: case for case in load_cases(EVALUATION_TIERS["full"])}
        fixture = cases["full_unanswerable_03"]
        assert fixture["category"] == "unanswerable"
        assert fixture["expected_outcome"] == "refuse"
        assert fixture["question"] == MERCURY
        assert fixture["expected_sources"] == []
        assert fixture["condensed_question"]
        assert fixture["condensed_question"] != fixture["question"]
        assert fixture["history"]

        original = make_passages(0.59, title="Disciplinary Action and Termination")
        lifted = make_passages(0.69, title="Paid Time Off (PTO) Policy")
        assert _condensed_only_gate(lifted) is True
        grounded, chosen = resolve_grounding(
            fixture["question"],
            original_passages=original,
            condensed_query=fixture["condensed_question"],
            condensed_passages=lifted,
        )
        assert grounded is False
        assert chosen == original

    def test_smoke_tier_stays_at_twenty_cases(self):
        smoke = json.loads(Path(EVALUATION_TIERS["smoke"]).read_text(encoding="utf-8"))
        assert len(smoke) == 20
