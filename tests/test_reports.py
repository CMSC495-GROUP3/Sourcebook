"""The coverage report behind the Coverage Gaps page."""

from datetime import UTC, datetime, timedelta

import pytest
from conftest import FAKE_DB, make_passages

from scripts.loadtest.fakemongo import FakeCollection
from sourcebook.api.routes.reports import MAX_WINDOW_DAYS

URL = "/api/reports/gaps"


def log(question: str, *, refused: bool, age: timedelta = timedelta(hours=1), **fields) -> None:
    """One query_logs row, shaped like analytics.log_query writes it."""
    FAKE_DB["query_logs"].insert_one(
        {
            "created_at": datetime.now(UTC) - age,
            "question_raw": question,
            "question_condensed": question,
            "question_hash": question.lower(),
            "refused": refused,
            **fields,
        }
    )


def test_requires_a_token(client):
    assert client.get(URL).status_code in (401, 403)


def test_empty_log(client, auth):
    body = client.get(URL, headers=auth).json()
    assert body["days"] == 30
    assert (body["total"], body["refused"]) == (0, 0)
    assert body["gaps"] == []
    assert body["faq"] == []


def test_refused_questions_rank_by_count(client, auth):
    for _ in range(3):
        log("Can I bring my dog?", refused=True)
    log("Is there a sabbatical?", refused=True)
    log("How much PTO do I get?", refused=False)

    body = client.get(URL, headers=auth).json()

    assert (body["total"], body["refused"]) == (5, 4)
    assert [(g["question"], g["count"]) for g in body["gaps"]] == [
        ("Can I bring my dog?", 3),
        ("Is there a sabbatical?", 1),
    ]


def test_faq_counts_repeats_and_their_refusals(client, auth):
    log("How much PTO do I get?", refused=False)
    log("How much PTO do I get?", refused=True)
    log("Asked once", refused=False)

    faq = client.get(URL, headers=auth).json()["faq"]

    assert faq == [
        {
            "question_hash": "how much pto do i get?",
            "question": "How much PTO do I get?",
            "count": 2,
            "refused": 1,
        }
    ]


def test_rows_outside_the_window_are_left_out(client, auth):
    log("Last week", refused=True, age=timedelta(days=6))
    log("Last month", refused=True, age=timedelta(days=20))

    body = client.get(URL, params={"days": 7}, headers=auth).json()

    assert body["days"] == 7
    assert [g["question"] for g in body["gaps"]] == ["Last week"]
    assert body["total"] == 1


def test_prefers_the_condensed_question(client, auth):
    """The hash groups on the condensed rewrite, so a follow-up's raw text
    ("what about part-time?") would misname the group."""
    log(
        "what about part-time?",
        refused=True,
        question_condensed="Do part-time employees get PTO?",
    )
    log("", refused=True, question_condensed=None, question_hash="blank")

    gaps = client.get(URL, headers=auth).json()["gaps"]

    assert {g["question"] for g in gaps} == {"Do part-time employees get PTO?", None}


def test_top_caps_each_list(client, auth):
    for n in range(5):
        log(f"Question {n}", refused=True)

    gaps = client.get(URL, params={"top": 2}, headers=auth).json()["gaps"]

    assert len(gaps) == 2


@pytest.mark.parametrize(
    "params",
    [{"days": 0}, {"days": MAX_WINDOW_DAYS + 1}, {"top": 0}, {"top": 101}, {"days": "a"}],
)
def test_rejects_out_of_range_parameters(client, auth, params):
    assert client.get(URL, params=params, headers=auth).status_code == 422


def test_a_refused_chat_shows_up_as_a_gap(client, auth, retrieval, conversation):
    """End to end: the chat route logs the refusal and the report finds it."""
    retrieval.passages = make_passages(0.30)
    client.post(
        "/api/chat",
        json={"question": "Can I bring my dog to work?", "session_id": conversation},
        headers=auth,
    )

    body = client.get(URL, headers=auth).json()

    assert body["refused"] == 1
    assert [g["question"] for g in body["gaps"]] == ["Can I bring my dog to work?"]
    assert "session_id" not in body["gaps"][0]


def test_fake_aggregate_still_rejects_vector_search():
    with pytest.raises(NotImplementedError):
        FakeCollection().aggregate([{"$vectorSearch": {}}])
