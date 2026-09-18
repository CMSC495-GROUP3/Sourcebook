"""One-time migration for the passages identity index.

This script reconciles duplicate (source, chunk_index) records, removes the
legacy non-unique compound index, and creates the unique replacement.

Run it with --dry-run first. That prints every duplicate group and what the
migration would do, and changes nothing. Without the flag it prints the same
lines before each delete, so the job log is the audit trail.

Do not run this against production without an explicit operations decision.
"""

import argparse

from dotenv import load_dotenv
from pymongo.errors import DuplicateKeyError, OperationFailure

from sourcebook.rag.config import (
    INDEX_OPTIONS_CONFLICT,
    PASSAGE_IDENTITY_KEYS,
    PASSAGES_COLLECTION,
    PASSAGES_IDENTITY_INDEX,
)
from sourcebook.rag.mongo import get_collection

# Same as the other entrypoints, so the documented command works on a host
# whose settings live in .env. get_client reads MONGODB_URI lazily.
load_dotenv()


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


def _is_migrated(index) -> bool:
    return (
        index is not None
        and index.get("unique") is True
        and index.get("name") == PASSAGES_IDENTITY_INDEX
    )


def _keep_id(ids):
    """Keep the greatest _id so reconciliation is deterministic."""
    try:
        return max(ids)
    except TypeError:
        return max(ids, key=repr)


def _duplicate_groups(collection) -> list[dict]:
    """One entry per duplicated identity, naming the record kept and the ones to delete."""
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

    found = []
    for group in groups:
        ids = list(group["ids"])
        keep_id = _keep_id(ids)
        delete_ids = [record_id for record_id in ids if record_id != keep_id]
        if delete_ids:
            found.append(
                {
                    "source": group["_id"].get("source"),
                    "chunk_index": group["_id"].get("chunk_index"),
                    "keep_id": keep_id,
                    "delete_ids": delete_ids,
                }
            )
    return found


def _report_duplicates(groups: list[dict]) -> None:
    for group in groups:
        print(
            f"duplicate source={group['source']!r} chunk_index={group['chunk_index']!r} "
            f"keep={group['keep_id']!r} delete={group['delete_ids']!r}"
        )


def _remove_duplicate_passages(collection, groups: list[dict]) -> int:
    removed = 0
    for group in groups:
        removed += collection.delete_many({"_id": {"$in": group["delete_ids"]}}).deleted_count
    return removed


def migrate_passage_identity_index(collection=None, *, dry_run: bool = False) -> dict:
    if collection is None:
        collection = get_collection(PASSAGES_COLLECTION)

    existing = _find_passage_identity_index(collection)

    # Already migrated, so repeated runs change nothing. The name matters as
    # much as uniqueness, because ensure_indexes pins it and MongoDB refuses
    # the same keys under a second name with IndexOptionsConflict.
    if _is_migrated(existing):
        return {
            "dry_run": dry_run,
            "removed_duplicates": 0,
            "dropped_legacy_index": False,
            "created_unique_index": False,
        }

    # Printed before any delete in both modes, so the log shows what went.
    groups = _duplicate_groups(collection)
    _report_duplicates(groups)

    if dry_run:
        return {
            "dry_run": True,
            "removed_duplicates": sum(len(group["delete_ids"]) for group in groups),
            "dropped_legacy_index": existing is not None,
            "created_unique_index": True,
        }

    removed_duplicates = _remove_duplicate_passages(collection, groups)

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
        "dry_run": False,
        "removed_duplicates": removed_duplicates,
        "dropped_legacy_index": dropped_legacy_index,
        "created_unique_index": True,
    }


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Reconcile duplicate passages and make the identity index unique."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="print the duplicates and the index changes, and change nothing",
    )
    args = parser.parse_args(argv)

    result = migrate_passage_identity_index(dry_run=args.dry_run)

    if result["dry_run"]:
        print(
            "Passage identity migration dry run: "
            f"{result['removed_duplicates']} duplicate passages would be removed; "
            f"legacy index would be dropped={result['dropped_legacy_index']}; "
            f"unique index would be created={result['created_unique_index']}. "
            "Nothing changed."
        )
        return

    print(
        "Passage identity migration complete: "
        f"{result['removed_duplicates']} duplicate passages removed; "
        f"legacy index dropped={result['dropped_legacy_index']}; "
        f"unique index created={result['created_unique_index']}."
    )


if __name__ == "__main__":
    main()
