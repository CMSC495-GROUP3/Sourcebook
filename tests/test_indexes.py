"""Index declarations in api/db.py, checked against the fake since the real
call is stubbed out of application startup by conftest."""

from conftest import FAKE_DB

from sourcebook.api import db


def test_ensure_indexes_declares_a_unique_source_index_for_document_bodies(monkeypatch):
    declared: list[tuple] = []

    def record(*args, **kwargs):
        declared.append((args, kwargs))
        return "index"

    monkeypatch.setattr(FAKE_DB["document_bodies"], "create_index", record)

    db.ensure_indexes()

    assert declared == [(("source",), {"unique": True})]
