#!/usr/bin/env python3
"""Write a deterministic OpenAPI document from the live FastAPI app.

``make openapi`` and CI call this so ``docs/openapi.json`` stays a stable,
sorted dump of ``app.openapi()``. Environment knobs that can appear in the
schema are pinned here before ``sourcebook.api.main`` is imported, because
``main`` loads ``.env`` and ``rag/config.py`` reads those knobs at import.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import bcrypt

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "openapi.json"


def prepare_export_env() -> None:
    """Pin import-time knobs so two runs write the same document."""
    os.environ.setdefault("JWT_SECRET_KEY", "openapi-export-not-a-secret")
    os.environ.setdefault("MONGODB_URI", "mongodb://127.0.0.1:1")
    os.environ.setdefault("MONGODB_DB", "openapi-export")
    os.environ["LLM_PROVIDER"] = "fake"
    os.environ["APP_NAME"] = "Sourcebook"
    os.environ.pop("APP_ENV", None)
    if not os.environ.get("APP_PASSWORD_HASH"):
        os.environ["APP_PASSWORD_HASH"] = bcrypt.hashpw(
            b"openapi-export", bcrypt.gensalt(4)
        ).decode()


def dumps(schema: dict) -> str:
    """Stable JSON: sorted keys, two-space indent, trailing newline, LF only."""
    return json.dumps(schema, indent=2, sort_keys=True, ensure_ascii=True) + "\n"


def export_schema() -> dict:
    """Import the app and return its OpenAPI document."""
    prepare_export_env()
    if str(ROOT) not in sys.path:
        sys.path.insert(0, str(ROOT))
    from sourcebook.api.main import app

    return app.openapi()


def write_openapi(path: Path | None = None) -> Path:
    """Write the deterministic document and return the output path."""
    dest = path or OUTPUT
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(dumps(export_schema()), encoding="utf-8", newline="\n")
    return dest


def main() -> int:
    """Export ``docs/openapi.json`` and print the relative path."""
    path = write_openapi()
    print(f"Wrote {path.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
