"""Offline ingestion behavior with AWS, MongoDB, and the model provider stubbed."""

import importlib
import sys
from pathlib import Path

import boto3
import pytest
from conftest import FAKE_DB

from sourcebook.rag.cache import get_corpus_version


class _Body:
    def __init__(self, text: str):
        self._text = text

    def read(self) -> bytes:
        return self._text.encode("utf-8")


class _Paginator:
    def __init__(self, pages: list[dict]):
        self._pages = pages

    def paginate(self, **_kwargs):
        return iter(self._pages)


class _S3:
    def __init__(self, pages: list[dict], objects: dict[str, str]):
        self._pages = pages
        self._objects = objects

    def get_paginator(self, _operation: str):
        return _Paginator(self._pages)

    def get_object(self, *, Bucket: str, Key: str):
        return {"Body": _Body(self._objects[Key])}


def _load_ingestion(monkeypatch, s3):
    """Import the script only after replacing boto3's network client."""
    monkeypatch.setattr(boto3, "client", lambda *_args, **_kwargs: s3)
    sys.modules.pop("sourcebook.rag.embed_documents", None)
    return importlib.import_module("sourcebook.rag.embed_documents")


class _UploadOnlyS3:
    """Records put_object calls; the seeding script needs nothing else."""

    def __init__(self):
        self.uploads: list[tuple[str, str]] = []

    def put_object(self, *, Bucket: str, Key: str, Body: bytes, ContentType: str):
        self.uploads.append((Bucket, Key))


SEEDING_MODULE = "sourcebook.rag.seed_documents"


@pytest.fixture
def seeding(monkeypatch):
    """The seeding script imported with S3 stubbed and a bucket configured.

    Unloaded afterwards so the stubbed module does not outlive the test."""
    s3 = _UploadOnlyS3()
    monkeypatch.setattr(boto3, "client", lambda *_args, **_kwargs: s3)
    monkeypatch.setenv("S3_BUCKET_NAME", "test-bucket")
    sys.modules.pop(SEEDING_MODULE, None)
    try:
        yield importlib.import_module(SEEDING_MODULE), s3
    finally:
        sys.modules.pop(SEEDING_MODULE, None)


def test_seeding_uploads_the_sample_corpus_from_the_repository_root(seeding):
    """The default source directory is resolved relative to the module's
    location, which the package move once broke. Guard the real path."""
    module, s3 = seeding
    sample_dir = Path(__file__).resolve().parent.parent / "data" / "sample-policies"
    expected = sorted(
        p.name for p in sample_dir.iterdir() if p.is_file() and not p.name.startswith(".")
    )
    assert sample_dir == module.SAMPLE_DIR
    assert len(expected) > 0

    module.upload_documents()

    assert [bucket for bucket, _ in s3.uploads] == ["test-bucket"] * len(expected)
    assert [key for _, key in s3.uploads] == [
        f"{module.S3_DOCUMENT_PREFIX}{name}" for name in expected
    ]


def test_seeding_without_a_bucket_stops_with_actionable_message(seeding, monkeypatch):
    module, s3 = seeding
    monkeypatch.delenv("S3_BUCKET_NAME")

    with pytest.raises(SystemExit, match="S3_BUCKET_NAME is not set"):
        module.upload_documents()
    assert s3.uploads == []


def test_seeding_from_a_missing_directory_names_it(seeding, tmp_path):
    module, s3 = seeding

    with pytest.raises(SystemExit, match="No such directory"):
        module.upload_documents(tmp_path / "does-not-exist")
    assert s3.uploads == []


def test_seeding_from_an_empty_directory_uploads_nothing(seeding, tmp_path):
    module, s3 = seeding
    (tmp_path / ".hidden").write_text("ignored")

    with pytest.raises(SystemExit, match="No documents found"):
        module.upload_documents(tmp_path)
    assert s3.uploads == []


def test_fetches_all_s3_pages_and_skips_directory_placeholders(monkeypatch):
    s3 = _S3(
        pages=[
            {"Contents": [{"Key": "documents/"}, {"Key": "documents/pto.md"}]},
            {"Contents": [{"Key": "documents/conduct.txt"}]},
        ],
        objects={
            "documents/pto.md": "Title: PTO\n\nPTO body.",
            "documents/conduct.txt": "Title: Conduct\n\nConduct body.",
        },
    )
    ingestion = _load_ingestion(monkeypatch, s3)
    monkeypatch.setenv("S3_BUCKET_NAME", "test-policies")

    assert ingestion.fetch_documents_from_s3() == [
        ("documents/pto.md", "Title: PTO\n\nPTO body."),
        ("documents/conduct.txt", "Title: Conduct\n\nConduct body."),
    ]


def test_fetch_drops_a_byte_order_mark_so_the_header_still_parses(monkeypatch):
    """Files saved by some Windows editors start with a BOM. Left in place it
    would make the Title line fail to parse and land the whole header block
    in the rendered document."""
    s3 = _S3(
        pages=[{"Contents": [{"Key": "documents/pto.md"}]}],
        objects={"documents/pto.md": "\ufeffTitle: PTO\n\nPTO body."},
    )
    ingestion = _load_ingestion(monkeypatch, s3)
    monkeypatch.setenv("S3_BUCKET_NAME", "test-policies")

    [(_, raw)] = ingestion.fetch_documents_from_s3()
    assert raw == "Title: PTO\n\nPTO body."


def test_missing_bucket_stops_with_actionable_message(monkeypatch):
    ingestion = _load_ingestion(monkeypatch, _S3([], {}))
    monkeypatch.delenv("S3_BUCKET_NAME", raising=False)

    with pytest.raises(SystemExit, match="S3_BUCKET_NAME is not set"):
        ingestion.fetch_documents_from_s3()


def test_reingestion_replaces_stale_passages_and_invalidates_cache(monkeypatch):
    ingestion = _load_ingestion(monkeypatch, _S3([], {}))
    documents = [
        (
            "documents/pto.md",
            "Title: Paid Time Off\nCategory: Leave\nOwner: HR\n"
            "Effective: 2026-01-01\n\nEmployees accrue 15 PTO days.",
        ),
        (
            "documents/conduct.md",
            "Title: Code of Conduct\nCategory: Workplace\n\nEmployees act professionally.",
        ),
    ]

    class Provider:
        def embed_many(self, texts: list[str]) -> list[list[float]]:
            return [[0.25, 0.75] for _ in texts]

    monkeypatch.setattr(ingestion, "fetch_documents_from_s3", lambda: documents)
    monkeypatch.setattr(ingestion, "get_collection", lambda name: FAKE_DB[name])
    monkeypatch.setattr(ingestion, "get_provider", Provider)

    FAKE_DB["passages"].insert_one({"source": "documents/stale.md", "text": "stale"})
    FAKE_DB["document_bodies"].insert_one({"source": "documents/stale.md", "body": "stale"})
    initial_version = get_corpus_version()

    ingestion.embed_and_store()

    first_version = get_corpus_version()
    first_passages = list(FAKE_DB["passages"].find({}))
    bodies = list(FAKE_DB["document_bodies"].find({}, {"_id": 0}))
    assert [body["source"] for body in bodies] == ["documents/pto.md", "documents/conduct.md"]
    assert bodies[0]["title"] == "Paid Time Off"
    assert bodies[0]["body"] == "Employees accrue 15 PTO days."
    assert "embedding" not in bodies[0]
    assert first_version != initial_version
    assert len(first_passages) == 2
    assert [passage["source"] for passage in first_passages] == [
        "documents/pto.md",
        "documents/conduct.md",
    ]
    assert [passage["chunk_index"] for passage in first_passages] == [0, 0]
    assert first_passages[0]["title"] == "Paid Time Off"
    assert first_passages[0]["category"] == "Leave"
    assert first_passages[0]["owner"] == "HR"
    assert first_passages[0]["effective_date"] == "2026-01-01"
    assert first_passages[0]["text"] == "Employees accrue 15 PTO days."
    assert first_passages[0]["embedding"] == [0.25, 0.75]

    ingestion.embed_and_store()

    assert get_corpus_version() != first_version
    assert FAKE_DB["passages"].count_documents({}) == 2
    assert FAKE_DB["passages"].count_documents({"source": "documents/stale.md"}) == 0
    assert FAKE_DB["document_bodies"].count_documents({}) == 2
    assert FAKE_DB["document_bodies"].count_documents({"source": "documents/stale.md"}) == 0


def test_reingestion_keeps_existing_corpus_available_while_embedding(monkeypatch):
    ingestion = _load_ingestion(monkeypatch, _S3([], {}))
    documents = [
        (
            "documents/pto.md",
            "Title: Paid Time Off\n\nEmployees accrue 15 PTO days.",
        )
    ]

    FAKE_DB["passages"].insert_one(
        {
            "source": "documents/pto.md",
            "chunk_index": 0,
            "text": "Old live passage",
            "embedding": [0.1, 0.2],
        }
    )

    collection = FAKE_DB["passages"]
    original_update_one = collection.update_one
    update_calls = 0

    def checked_update_one(*args, **kwargs):
        nonlocal update_calls
        assert collection.count_documents({}) > 0
        result = original_update_one(*args, **kwargs)
        assert collection.count_documents({}) > 0
        update_calls += 1
        return result

    monkeypatch.setattr(collection, "update_one", checked_update_one)

    class Provider:
        def embed_many(self, texts):
            assert FAKE_DB["passages"].count_documents({}) > 0
            assert FAKE_DB["passages"].count_documents({"source": "documents/pto.md"}) > 0
            return [[0.25, 0.75] for _ in texts]

    monkeypatch.setattr(ingestion, "fetch_documents_from_s3", lambda: documents)
    monkeypatch.setattr(ingestion, "get_collection", lambda name: FAKE_DB[name])
    monkeypatch.setattr(ingestion, "get_provider", Provider)

    ingestion.embed_and_store()

    assert FAKE_DB["passages"].count_documents({}) > 0
    assert update_calls > 0


def test_ingestion_batches_embeddings_per_document(monkeypatch):
    ingestion = _load_ingestion(monkeypatch, _S3([], {}))
    documents = [
        (
            "documents/large.md",
            "Title: Large Policy\n\n" + ("Policy text. " * 300),
        )
    ]

    class Provider:
        def __init__(self):
            self.calls = []

        def embed_many(self, texts):
            self.calls.append(list(texts))
            return [[0.25, 0.75] for _ in texts]

    provider = Provider()

    monkeypatch.setattr(ingestion, "fetch_documents_from_s3", lambda: documents)
    monkeypatch.setattr(ingestion, "get_collection", lambda name: FAKE_DB[name])
    monkeypatch.setattr(ingestion, "get_provider", lambda: provider)

    ingestion.embed_and_store()

    assert len(provider.calls) == 1
    assert len(provider.calls[0]) > 1


def test_failed_embedding_leaves_corpus_and_version_untouched(monkeypatch):
    """The property #89 cares about most: a rebuild that dies part-way changes
    nothing. Two documents; the provider embeds the first and raises on the
    second, so the failure lands after some work has been done."""
    ingestion = _load_ingestion(monkeypatch, _S3([], {}))
    documents = [
        ("documents/pto.md", "Title: Paid Time Off\n\nEmployees accrue 15 PTO days."),
        ("documents/conduct.md", "Title: Code of Conduct\n\nEmployees act professionally."),
    ]
    seeded = [
        {"source": "documents/pto.md", "chunk_index": 0, "text": "old pto", "embedding": [0.1]},
        {"source": "documents/gone.md", "chunk_index": 0, "text": "old gone", "embedding": [0.2]},
    ]
    FAKE_DB["passages"].insert_many([dict(record) for record in seeded])
    seeded_bodies = [{"source": "documents/pto.md", "body": "old pto whole"}]
    FAKE_DB["document_bodies"].insert_many([dict(record) for record in seeded_bodies])
    version_before = get_corpus_version()

    class Provider:
        calls = 0

        def embed_many(self, texts: list[str]) -> list[list[float]]:
            Provider.calls += 1
            if Provider.calls == 2:
                raise RuntimeError("embedding service unavailable")
            return [[0.25, 0.75] for _ in texts]

    monkeypatch.setattr(ingestion, "fetch_documents_from_s3", lambda: documents)
    monkeypatch.setattr(ingestion, "get_collection", lambda name: FAKE_DB[name])
    monkeypatch.setattr(ingestion, "get_provider", Provider)

    with pytest.raises(RuntimeError, match="embedding service unavailable"):
        ingestion.embed_and_store()

    remaining = [
        {key: value for key, value in passage.items() if key != "_id"}
        for passage in FAKE_DB["passages"].find({})
    ]
    assert remaining == seeded
    assert list(FAKE_DB["document_bodies"].find({}, {"_id": 0})) == seeded_bodies
    assert get_corpus_version() == version_before


def test_document_that_shrinks_loses_its_obsolete_chunks(monkeypatch):
    """Three chunks on record for one source; the new version yields one. The
    per-source delete must drop chunk 1 and 2 and keep the stale-source delete
    from touching a source that is still present."""
    ingestion = _load_ingestion(monkeypatch, _S3([], {}))
    documents = [("documents/pto.md", "Title: Paid Time Off\n\nOne short paragraph now.")]
    for index in range(3):
        FAKE_DB["passages"].insert_one(
            {
                "source": "documents/pto.md",
                "chunk_index": index,
                "text": f"old chunk {index}",
                "embedding": [0.1 * index],
            }
        )

    class Provider:
        def embed_many(self, texts: list[str]) -> list[list[float]]:
            return [[0.25, 0.75] for _ in texts]

    monkeypatch.setattr(ingestion, "fetch_documents_from_s3", lambda: documents)
    monkeypatch.setattr(ingestion, "get_collection", lambda name: FAKE_DB[name])
    monkeypatch.setattr(ingestion, "get_provider", Provider)

    ingestion.embed_and_store()

    passages = list(FAKE_DB["passages"].find({"source": "documents/pto.md"}))
    assert [passage["chunk_index"] for passage in passages] == [0]
    assert passages[0]["text"] == "One short paragraph now."
    assert passages[0]["embedding"] == [0.25, 0.75]


def test_document_with_no_passages_keeps_no_reading_copy(monkeypatch):
    """A header-only file parses to an empty body and yields no chunks, so it
    is absent from the library. Its reading copy must go the same way, or the
    body endpoint would serve a document the library does not list."""
    ingestion = _load_ingestion(monkeypatch, _S3([], {}))
    documents = [
        ("documents/empty.md", "Title: Placeholder\n"),
        ("documents/pto.md", "Title: Paid Time Off\n\nEmployees accrue 15 PTO days."),
    ]
    FAKE_DB["document_bodies"].insert_one({"source": "documents/empty.md", "body": "old"})

    class Provider:
        def embed_many(self, texts: list[str]) -> list[list[float]]:
            return [[0.25, 0.75] for _ in texts]

    monkeypatch.setattr(ingestion, "fetch_documents_from_s3", lambda: documents)
    monkeypatch.setattr(ingestion, "get_collection", lambda name: FAKE_DB[name])
    monkeypatch.setattr(ingestion, "get_provider", Provider)

    ingestion.embed_and_store()

    assert FAKE_DB["passages"].count_documents({"source": "documents/empty.md"}) == 0
    assert [b["source"] for b in FAKE_DB["document_bodies"].find({})] == ["documents/pto.md"]


def test_each_body_is_written_right_after_its_own_passages(monkeypatch):
    """A body must not trail the whole corpus: while passages are upserted a
    document's reading copy may be one version behind, but only until its own
    passages are in, never until every document's are."""
    ingestion = _load_ingestion(monkeypatch, _S3([], {}))
    documents = [
        ("documents/pto.md", "Title: Paid Time Off\n\nEmployees accrue 15 PTO days."),
        ("documents/conduct.md", "Title: Code of Conduct\n\nEmployees act professionally."),
    ]
    writes: list[tuple[str, str]] = []

    def recording(name: str):
        collection = FAKE_DB[name]
        original = collection.update_one

        def update_one(query, update, upsert=False):
            writes.append((name, query["source"]))
            return original(query, update, upsert=upsert)

        monkeypatch.setattr(collection, "update_one", update_one)
        return collection

    class Provider:
        def embed_many(self, texts: list[str]) -> list[list[float]]:
            return [[0.25, 0.75] for _ in texts]

    monkeypatch.setattr(ingestion, "fetch_documents_from_s3", lambda: documents)
    monkeypatch.setattr(ingestion, "get_collection", recording)
    monkeypatch.setattr(ingestion, "get_provider", Provider)

    ingestion.embed_and_store()

    assert writes == [
        ("passages", "documents/pto.md"),
        ("document_bodies", "documents/pto.md"),
        ("passages", "documents/conduct.md"),
        ("document_bodies", "documents/conduct.md"),
    ]
