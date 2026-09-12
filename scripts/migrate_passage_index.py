"""One-time migration for the passages identity index.

This script reconciles duplicate (source, chunk_index) records, removes the
legacy non-unique compound index, and creates the unique replacement.

Do not run this against production without an explicit operations decision.
"""

from pymongo import ASCENDING
from pymongo.errors import DuplicateKeyError, OperationFailure

from sourcebook.rag.config import PASSAGES_COLLECTION
from sourcebook.rag.mongo import get_collection

PASSAGES_IDENTITY_INDEX = "source_1_chunk_index_1"
INDEX_OPTIONS_CONFLICT = 85

PASSAGE_IDENTITY_KEYS = [
    ("source", ASCENDING),
    ("chunk_index", ASCENDING),
]


def _index_keys(index: dict) -> list[tuple]:
    keys = index.get("key", {})
    if hasattr(keys, "items"):
        return list(keys.items())
    return list(keys)


def _find_passage_identity_index(collection):
    for index in collection.list_indexes():
        if _index_keys(index) == PASSAGE_IDENTITY_KEYS:
            return index
    return None


def _keep_id(ids):
    """Keep the greatest _id so reconciliation is deterministic."""
    try:
        return max(ids)
    except TypeError:
        return max(ids, key=repr)


def _remove_duplicate_passages(collection) -> int:
    groups = collection.aggregate(
        [
            {
                "$group": {
                    "_id": {
                        "source": "$source",
                        "chunk_index": "$chunk_index",
                    },
                    "ids": {"$push": "$_id"},
                    "count": {"$sum": 1},
                }
            },
            {"$match": {"count": {"$gt": 1}}},
        ]
    )

    removed = 0

    for group in groups:
        ids = list(group["ids"])
        keep_id = _keep_id(ids)
        duplicate_ids = [record_id for record_id in ids if record_id != keep_id]

        if duplicate_ids:
            removed += collection.delete_many({"_id": {"$in": duplicate_ids}}).deleted_count

    return removed


def migrate_passage_identity_index(collection=None) -> dict:
    if collection is None:
        collection = get_collection(PASSAGES_COLLECTION)

    existing = _find_passage_identity_index(collection)

    # Already migrated: safe no-op on repeated runs.
    if existing is not None and existing.get("unique") is True:
        return {
            "removed_duplicates": 0,
            "dropped_legacy_index": False,
            "created_unique_index": False,
        }

    removed_duplicates = _remove_duplicate_passages(collection)

    dropped_legacy_index = False
    if existing is not None:
        collection.drop_index(existing["name"])
        dropped_legacy_index = True

    try:
        collection.create_index(
            PASSAGE_IDENTITY_KEYS,
            name=PASSAGES_IDENTITY_INDEX,
            unique=True,
        )
    except DuplicateKeyError as exc:
        raise RuntimeError(
            "Duplicate passages still exist. Stop passage writers, "
            "re-run duplicate reconciliation, and retry the migration."
        ) from exc
    except OperationFailure as exc:
        if exc.code == INDEX_OPTIONS_CONFLICT:
            raise RuntimeError(
                "The passages identity index still has conflicting options. "
                "Inspect list_indexes() before retrying the migration."
            ) from exc
        raise

    return {
        "removed_duplicates": removed_duplicates,
        "dropped_legacy_index": dropped_legacy_index,
        "created_unique_index": True,
    }


def main() -> None:
    result = migrate_passage_identity_index()

    print(
        "Passage identity migration complete: "
        f"{result['removed_duplicates']} duplicate passages removed; "
        f"legacy index dropped={result['dropped_legacy_index']}; "
        f"unique index created={result['created_unique_index']}."
    )


if __name__ == "__main__":
    main()
