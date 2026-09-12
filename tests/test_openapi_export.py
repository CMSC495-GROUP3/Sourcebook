"""The committed OpenAPI document must match a fresh, repeatable export."""

from pathlib import Path

from scripts.export_openapi import OUTPUT, dumps, export_schema, write_openapi

ROOT = Path(__file__).resolve().parents[1]
API_MD = ROOT / "docs" / "api.md"


def test_export_is_byte_identical_across_two_writes(tmp_path: Path) -> None:
    """Two regenerations in the same process produce no diff."""
    first = tmp_path / "a.json"
    second = tmp_path / "b.json"
    write_openapi(first)
    write_openapi(second)
    assert first.read_bytes() == second.read_bytes()
    assert first.read_text(encoding="utf-8").endswith("\n")
    assert first.read_bytes().count(b"\r") == 0


def test_committed_openapi_matches_regeneration() -> None:
    """``make openapi`` (and CI) fail unless docs/openapi.json is current."""
    assert OUTPUT.is_file(), "docs/openapi.json is missing; run make openapi"
    committed = OUTPUT.read_text(encoding="utf-8").replace("\r\n", "\n")
    assert committed == dumps(export_schema())


def test_api_md_names_every_openapi_path() -> None:
    """The client page must mention every route the committed document lists."""
    text = API_MD.read_text(encoding="utf-8")
    schema = export_schema()
    missing = [path for path in schema["paths"] if path not in text]
    assert missing == [], f"docs/api.md omits OpenAPI paths: {missing}"
