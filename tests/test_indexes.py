"""Index declarations in api/db.py, checked against the fake since the real
call is stubbed out of application startup by conftest."""

import pytest
from conftest import FAKE_DB
from pymongo.errors import OperationFailure

from sourcebook.api import db


def test_ensure_indexes_explains_legacy_passage_index(monkeypatch):
    def conflict(*args, **kwargs):
        raise OperationFailure("legacy index options", code=85)

    monkeypatch.setattr(FAKE_DB["passages"], "create_index", conflict)

    with pytest.raises(
        RuntimeError,
        match="one-time passage-index migration",
    ):
        db.ensure_indexes()


def test_ensure_indexes_reraises_other_operation_failures(monkeypatch):
    # Only IndexOptionsConflict gets the migration hint. Anything else, such
    # as an authorization failure, must surface as itself.
    def unauthorized(*args, **kwargs):
        raise OperationFailure("not authorized", code=13)

    monkeypatch.setattr(FAKE_DB["passages"], "create_index", unauthorized)

    with pytest.raises(OperationFailure):
        db.ensure_indexes()


def test_ensure_indexes_declares_a_unique_source_index_for_document_bodies(monkeypatch):
    declared: list[tuple] = []

    def record(*args, **kwargs):
        declared.append((args, kwargs))
        return "index"

    monkeypatch.setattr(FAKE_DB["document_bodies"], "create_index", record)

    db.ensure_indexes()

    assert declared == [(("source",), {"unique": True})]


def test_ensure_indexes_declares_unique_passage_identity(monkeypatch):
    declared: list[tuple] = []

    def record(*args, **kwargs):
        declared.append((args, kwargs))
        return "index"

    monkeypatch.setattr(FAKE_DB["passages"], "create_index", record)

    db.ensure_indexes()

    assert declared == [
        (
            ([("source", 1), ("chunk_index", 1)],),
            {
                "name": "source_1_chunk_index_1",
                "unique": True,
            },
        )
    ]


def test_ensure_indexes_tolerates_an_index_that_already_exists(monkeypatch):
    # pymongo returns the existing name and raises nothing when the index is
    # already there with the same options, which is what a worker restart
    # sees. The fake does the same, so a second call must not raise.
    calls = 0

    def existing(*args, **kwargs):
        nonlocal calls
        calls += 1
        return "source_1_chunk_index_1"

    monkeypatch.setattr(FAKE_DB["passages"], "create_index", existing)

    db.ensure_indexes()
    db.ensure_indexes()

    assert calls == 2
