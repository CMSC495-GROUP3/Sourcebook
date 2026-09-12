"""Tests for the one-time passages identity-index migration."""

import pytest
from pymongo.errors import DuplicateKeyError, OperationFailure

from scripts import migrate_passage_index as migration


class MigrationCollection:
    def __init__(self, docs=None, indexes=None):
        self.docs = [dict(doc) for doc in (docs or [])]
        self.indexes = [dict(index) for index in (indexes or [])]
        self.dropped = []
        self.created = []

    def list_indexes(self):
        return list(self.indexes)

    def aggregate(self, _pipeline):
        grouped = {}

        for doc in self.docs:
            identity = (doc.get("source"), doc.get("chunk_index"))
            grouped.setdefault(identity, []).append(doc["_id"])

        return [
            {
                "_id": {
                    "source": source,
                    "chunk_index": chunk_index,
                },
                "ids": ids,
                "count": len(ids),
            }
            for (source, chunk_index), ids in grouped.items()
            if len(ids) > 1
        ]

    def delete_many(self, query):
        ids = set(query["_id"]["$in"])
        before = len(self.docs)
        self.docs = [doc for doc in self.docs if doc["_id"] not in ids]
        deleted = before - len(self.docs)
        return type("Result", (), {"deleted_count": deleted})()

    def drop_index(self, name):
        self.dropped.append(name)
        self.indexes = [index for index in self.indexes if index["name"] != name]

    def create_index(self, keys, *, name, unique):
        self.created.append((list(keys), name, unique))
        self.indexes.append(
            {
                "name": name,
                "key": dict(keys),
                "unique": unique,
            }
        )
        return name


def test_migration_reconciles_duplicates_and_replaces_legacy_index():
    collection = MigrationCollection(
        docs=[
            {
                "_id": 2,
                "source": "documents/pto.md",
                "chunk_index": 0,
                "text": "older",
            },
            {
                "_id": 7,
                "source": "documents/pto.md",
                "chunk_index": 0,
                "text": "newer",
            },
            {
                "_id": 9,
                "source": "documents/conduct.md",
                "chunk_index": 0,
                "text": "only",
            },
        ],
        indexes=[
            {
                "name": "source_1_chunk_index_1",
                "key": {"source": 1, "chunk_index": 1},
            }
        ],
    )

    result = migration.migrate_passage_identity_index(collection)

    assert result == {
        "dry_run": False,
        "removed_duplicates": 1,
        "dropped_legacy_index": True,
        "created_unique_index": True,
    }
    assert [doc["_id"] for doc in collection.docs] == [7, 9]
    assert collection.dropped == ["source_1_chunk_index_1"]
    assert collection.created == [
        (
            [("source", 1), ("chunk_index", 1)],
            "source_1_chunk_index_1",
            True,
        )
    ]


def test_migration_is_idempotent_after_unique_index_exists():
    collection = MigrationCollection(
        docs=[
            {
                "_id": 4,
                "source": "documents/pto.md",
                "chunk_index": 0,
            }
        ],
        indexes=[
            {
                "name": "source_1_chunk_index_1",
                "key": {"source": 1, "chunk_index": 1},
                "unique": True,
            }
        ],
    )

    first = migration.migrate_passage_identity_index(collection)
    second = migration.migrate_passage_identity_index(collection)

    expected = {
        "dry_run": False,
        "removed_duplicates": 0,
        "dropped_legacy_index": False,
        "created_unique_index": False,
    }

    assert first == expected
    assert second == expected
    assert collection.dropped == []
    assert collection.created == []


def test_migration_keeps_highest_id_deterministically():
    collection = MigrationCollection(
        docs=[
            {
                "_id": 3,
                "source": "documents/leave.md",
                "chunk_index": 1,
            },
            {
                "_id": 12,
                "source": "documents/leave.md",
                "chunk_index": 1,
            },
            {
                "_id": 8,
                "source": "documents/leave.md",
                "chunk_index": 1,
            },
        ]
    )

    result = migration.migrate_passage_identity_index(collection)

    assert result["removed_duplicates"] == 2
    assert [doc["_id"] for doc in collection.docs] == [12]


def test_migration_reports_duplicate_race():
    class RacingCollection(MigrationCollection):
        def create_index(self, keys, *, name, unique):
            raise DuplicateKeyError("E11000 duplicate key")

    collection = RacingCollection(
        docs=[
            {
                "_id": 1,
                "source": "documents/pto.md",
                "chunk_index": 0,
            }
        ]
    )

    with pytest.raises(
        RuntimeError,
        match="Duplicate passages still exist",
    ):
        migration.migrate_passage_identity_index(collection)


def test_migration_renames_a_unique_legacy_index_under_another_name():
    # ensure_indexes pins the name, so a unique index under any other name
    # would fail startup with code 85 forever unless the migration replaces it.
    collection = MigrationCollection(
        docs=[{"_id": 1, "source": "documents/pto.md", "chunk_index": 0}],
        indexes=[
            {
                "name": "passage_identity",
                "key": {"source": 1, "chunk_index": 1},
                "unique": True,
            }
        ],
    )

    result = migration.migrate_passage_identity_index(collection)

    assert result["dropped_legacy_index"] is True
    assert result["created_unique_index"] is True
    assert collection.dropped == ["passage_identity"]
    assert [name for _, name, _ in collection.created] == ["source_1_chunk_index_1"]


def test_migration_explains_an_index_options_conflict():
    class ConflictingCollection(MigrationCollection):
        def create_index(self, keys, *, name, unique):
            raise OperationFailure("Index with name already exists", code=85)

    collection = ConflictingCollection(
        docs=[{"_id": 1, "source": "documents/pto.md", "chunk_index": 0}]
    )

    with pytest.raises(RuntimeError, match="conflicting options"):
        migration.migrate_passage_identity_index(collection)


def test_migration_reraises_other_operation_failures():
    class FailingCollection(MigrationCollection):
        def create_index(self, keys, *, name, unique):
            raise OperationFailure("not authorized", code=13)

    collection = FailingCollection(
        docs=[{"_id": 1, "source": "documents/pto.md", "chunk_index": 0}]
    )

    with pytest.raises(OperationFailure):
        migration.migrate_passage_identity_index(collection)


def test_dry_run_reports_duplicates_and_changes_nothing(capsys):
    collection = MigrationCollection(
        docs=[
            {"_id": 2, "source": "documents/pto.md", "chunk_index": 0},
            {"_id": 7, "source": "documents/pto.md", "chunk_index": 0},
            {"_id": 9, "source": "documents/conduct.md", "chunk_index": 0},
        ],
        indexes=[
            {
                "name": "source_1_chunk_index_1",
                "key": {"source": 1, "chunk_index": 1},
            }
        ],
    )

    result = migration.migrate_passage_identity_index(collection, dry_run=True)

    assert result == {
        "dry_run": True,
        "removed_duplicates": 1,
        "dropped_legacy_index": True,
        "created_unique_index": True,
    }
    assert [doc["_id"] for doc in collection.docs] == [2, 7, 9]
    assert collection.dropped == []
    assert collection.created == []
    assert (
        "duplicate source='documents/pto.md' chunk_index=0 keep=7 delete=[2]"
        in capsys.readouterr().out
    )


def test_migration_prints_every_duplicate_before_deleting(capsys):
    class WatchingCollection(MigrationCollection):
        seen = ""

        def delete_many(self, query):
            # The whole audit trail must already be on stdout when the first
            # delete runs. readouterr drains the buffer, so keep what it read.
            self.seen += capsys.readouterr().out
            assert "keep=7 delete=[2]" in self.seen
            assert "keep=12 delete=[3, 8]" in self.seen
            return super().delete_many(query)

    collection = WatchingCollection(
        docs=[
            {"_id": 2, "source": "documents/pto.md", "chunk_index": 0},
            {"_id": 7, "source": "documents/pto.md", "chunk_index": 0},
            {"_id": 3, "source": "documents/leave.md", "chunk_index": 1},
            {"_id": 12, "source": "documents/leave.md", "chunk_index": 1},
            {"_id": 8, "source": "documents/leave.md", "chunk_index": 1},
        ]
    )

    result = migration.migrate_passage_identity_index(collection)

    assert result["removed_duplicates"] == 3
    assert sorted(doc["_id"] for doc in collection.docs) == [7, 12]


def test_main_dry_run_flag_changes_nothing(monkeypatch, capsys):
    collection = MigrationCollection(
        docs=[
            {"_id": 2, "source": "documents/pto.md", "chunk_index": 0},
            {"_id": 7, "source": "documents/pto.md", "chunk_index": 0},
        ]
    )
    monkeypatch.setattr(migration, "get_collection", lambda name: collection)

    migration.main(["--dry-run"])

    out = capsys.readouterr().out
    assert "duplicate source='documents/pto.md' chunk_index=0 keep=7 delete=[2]" in out
    assert out.rstrip().endswith("Nothing changed.")
    assert "1 duplicate passages would be removed" in out
    assert [doc["_id"] for doc in collection.docs] == [2, 7]
    assert collection.created == []


def test_main_reports_a_completed_migration(monkeypatch, capsys):
    collection = MigrationCollection(
        docs=[
            {"_id": 2, "source": "documents/pto.md", "chunk_index": 0},
            {"_id": 7, "source": "documents/pto.md", "chunk_index": 0},
        ]
    )
    monkeypatch.setattr(migration, "get_collection", lambda name: collection)

    migration.main([])

    out = capsys.readouterr().out
    assert "Passage identity migration complete: 1 duplicate passages removed" in out
    assert [doc["_id"] for doc in collection.docs] == [7]
    assert [name for _, name, _ in collection.created] == ["source_1_chunk_index_1"]
