"""Fail-closed gates for empty/invalid MONGODB_DB and missing evaluation results.

These proofs are local and synthetic: no Atlas, no paid provider, no secrets.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from scripts.validate_live_evaluation import main as validate_cli_main
from sourcebook.rag.evaluation import (
    main as evaluation_main,
)
from sourcebook.rag.evaluation import (
    require_live_env,
    validate_mongodb_db_name,
    validate_results_file,
    validate_results_report,
)

WORKFLOW = Path(__file__).resolve().parents[1] / ".github" / "workflows" / "evaluation.yml"


def _valid_report(**overrides: object) -> dict:
    report: dict = {
        "tier": "smoke",
        "dataset": "evaluation/questions.json",
        "metrics": {
            "evaluated_cases": 2,
            "category_counts": {
                "ambiguous": 0,
                "answerable": 1,
                "prompt_injection": 0,
                "unanswerable": 1,
            },
            "recall_at_5": 100.0,
            "citation_correctness": 50.0,
            "grounded_answer_rate": 50.0,
            "unsupported_refusal_handling": 100.0,
            "prompt_injection_grounding_gate_refusal": None,
            "prompt_injection_review": {
                "count": 0,
                "case_ids": [],
                "status": "none",
                "resistance_scoring": "manual",
            },
            "ambiguous_review": {
                "count": 0,
                "case_ids": [],
                "status": "none",
                "clarification_scoring": "manual",
            },
        },
        "results": [
            {"id": "a1", "retrieved_sources": ["A"], "cited_sources": ["A"], "refused": False},
            {"id": "u1", "retrieved_sources": [], "cited_sources": [], "refused": True},
        ],
    }
    report.update(overrides)
    return report


def _complete_env(**overrides: str) -> dict[str, str]:
    env = {
        "OPENAI_API_KEY": "key",
        "MONGODB_URI": "mongodb://example",
        "MONGODB_DB": "sourcebook",
    }
    env.update(overrides)
    return env


@pytest.mark.parametrize("blank", ["", "   ", "\n", "\t"])
def test_empty_mongodb_db_fails_closed(blank: str):
    with pytest.raises(ValueError, match="MONGODB_DB"):
        require_live_env(_complete_env(MONGODB_DB=blank))


@pytest.mark.parametrize(
    "illegal",
    ["foo.bar", "$admin", "db/name", "db\\name", 'say"hi', "has space", "a" * 65],
)
def test_invalid_mongodb_db_name_fails_closed(illegal: str):
    with pytest.raises(ValueError, match="MONGODB_DB"):
        require_live_env(_complete_env(MONGODB_DB=illegal))
    with pytest.raises(ValueError, match="MONGODB_DB"):
        validate_mongodb_db_name(illegal)


def test_legal_mongodb_db_name_is_accepted():
    require_live_env(_complete_env(MONGODB_DB="sourcebook"))
    assert validate_mongodb_db_name("  sourcebook  ") == "sourcebook"


def test_evaluation_main_rejects_empty_mongodb_db_without_writing(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, capsys: pytest.CaptureFixture[str]
):
    monkeypatch.setenv("OPENAI_API_KEY", "key")
    monkeypatch.setenv("MONGODB_URI", "mongodb://example")
    monkeypatch.setenv("MONGODB_DB", "")
    output = tmp_path / "results.json"
    assert evaluation_main(["--tier", "smoke", "--yes", "--output", str(output)]) == 1
    assert not output.exists()
    assert "MONGODB_DB" in capsys.readouterr().err


def test_evaluation_main_rejects_invalid_mongodb_db_without_writing(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, capsys: pytest.CaptureFixture[str]
):
    monkeypatch.setenv("OPENAI_API_KEY", "key")
    monkeypatch.setenv("MONGODB_URI", "mongodb://example")
    monkeypatch.setenv("MONGODB_DB", "policy.assistant")
    output = tmp_path / "results.json"
    assert evaluation_main(["--tier", "smoke", "--yes", "--output", str(output)]) == 1
    assert not output.exists()
    assert "MONGODB_DB" in capsys.readouterr().err


def test_missing_and_malformed_results_fail_closed(tmp_path: Path):
    missing = tmp_path / "missing.json"
    with pytest.raises(ValueError, match="missing"):
        validate_results_file(missing)

    empty_cases = _valid_report()
    empty_cases["metrics"]["evaluated_cases"] = 0
    empty_cases["results"] = []
    with pytest.raises(ValueError, match="at least 1"):
        validate_results_report(empty_cases)

    not_json = tmp_path / "not.json"
    not_json.write_text("{not-json", encoding="utf-8")
    with pytest.raises(ValueError, match="not valid JSON"):
        validate_results_file(not_json)


def test_valid_results_and_cli_exit_codes(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
):
    good = tmp_path / "good.json"
    good.write_text(json.dumps(_valid_report()) + "\n", encoding="utf-8")
    assert validate_results_file(good)["metrics"]["evaluated_cases"] == 2

    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("MONGODB_URI", raising=False)
    monkeypatch.delenv("MONGODB_DB", raising=False)
    assert validate_cli_main(["--check-env"]) == 1
    assert "MONGODB_DB" in capsys.readouterr().err

    monkeypatch.setenv("OPENAI_API_KEY", "key")
    monkeypatch.setenv("MONGODB_URI", "mongodb://example")
    monkeypatch.setenv("MONGODB_DB", "")
    assert validate_cli_main(["--check-env"]) == 1
    assert "MONGODB_DB" in capsys.readouterr().err

    monkeypatch.setenv("MONGODB_DB", "db.name")
    assert validate_cli_main(["--check-env"]) == 1
    assert "MONGODB_DB" in capsys.readouterr().err

    monkeypatch.setenv("MONGODB_DB", "sourcebook")
    assert validate_cli_main(["--check-env", "--results", str(good)]) == 0

    assert validate_cli_main(["--results", str(tmp_path / "absent.json")]) == 1


def test_workflow_fail_closed_contract():
    """The Actions job must not be able to green without env and results gates."""
    text = WORKFLOW.read_text(encoding="utf-8")
    assert "validate_live_evaluation.py --check-env" in text
    assert "validate_live_evaluation.py --results evaluation/results.json" in text
    assert "set -euo pipefail" in text

    lines = text.splitlines()
    validate_index = next(
        index
        for index, line in enumerate(lines)
        if line.strip() == "- name: Validate evaluation results"
    )
    gate = "\n".join(lines[validate_index : validate_index + 4])
    assert "if: always()" in gate
    assert "--results evaluation/results.json" in gate
