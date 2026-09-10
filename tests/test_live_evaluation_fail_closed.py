"""Fail-closed gates for live evaluation env and results integrity."""

from __future__ import annotations

import json

import pytest

from policy_assistant.rag.evaluation import (
    _validate_rate_metric,
    require_live_env,
    validate_results_file,
    validate_results_report,
)
from scripts.validate_live_evaluation import main as validate_cli_main


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


def test_require_live_env_rejects_missing_and_blank_values():
    with pytest.raises(ValueError, match="MONGODB_DB"):
        require_live_env(
            {
                "OPENAI_API_KEY": "key",
                "MONGODB_URI": "mongodb://example",
                "MONGODB_DB": "",
            }
        )

    with pytest.raises(ValueError, match="OPENAI_API_KEY, MONGODB_URI, MONGODB_DB"):
        require_live_env({})

    require_live_env(
        {
            "OPENAI_API_KEY": "key",
            "MONGODB_URI": "mongodb://example",
            "MONGODB_DB": "policy_assistant",
        }
    )


def test_validate_results_report_accepts_complete_fixture():
    report = validate_results_report(_valid_report())
    assert report["metrics"]["evaluated_cases"] == 2


def test_validate_results_report_rejects_missing_metrics_and_empty_cases():
    with pytest.raises(ValueError, match="missing a metrics object"):
        validate_results_report({"results": []})

    bad = _valid_report()
    bad["metrics"]["evaluated_cases"] = 0
    bad["results"] = []
    with pytest.raises(ValueError, match="at least 1"):
        validate_results_report(bad)

    missing_key = _valid_report()
    del missing_key["metrics"]["recall_at_5"]
    with pytest.raises(ValueError, match="recall_at_5"):
        validate_results_report(missing_key)


def test_validate_results_report_rejects_malformed_rates_and_length_mismatch():
    bad_rate = _valid_report()
    bad_rate["metrics"]["citation_correctness"] = 150
    with pytest.raises(ValueError, match="citation_correctness"):
        validate_results_report(bad_rate)

    mismatch = _valid_report()
    mismatch["metrics"]["evaluated_cases"] = 3
    mismatch["metrics"]["category_counts"] = {
        "ambiguous": 0,
        "answerable": 2,
        "prompt_injection": 0,
        "unanswerable": 1,
    }
    with pytest.raises(ValueError, match="does not match evaluated_cases"):
        validate_results_report(mismatch)


@pytest.mark.parametrize(
    "bad_value",
    [float("nan"), float("inf"), float("-inf")],
)
def test_validate_rate_metric_rejects_non_finite(bad_value):
    """NaN / ±inf must fail closed (comparisons alone miss NaN)."""
    with pytest.raises(ValueError, match="finite"):
        _validate_rate_metric("citation_correctness", bad_value)


@pytest.mark.parametrize(
    "metric_key,bad_value",
    [
        ("citation_correctness", float("nan")),
        ("recall_at_5", float("inf")),
        ("grounded_answer_rate", float("-inf")),
    ],
)
def test_validate_results_report_rejects_non_finite_rates(metric_key, bad_value):
    bad = _valid_report()
    bad["metrics"][metric_key] = bad_value
    with pytest.raises(ValueError, match="finite"):
        validate_results_report(bad)


def test_validate_results_file_rejects_nan_metric(tmp_path):
    """Synthetic results.json with NaN recall must fail closed (RoNUO repro)."""
    report = _valid_report()
    report["metrics"]["recall_at_5"] = float("nan")
    path = tmp_path / "nan_results.json"
    # Python json allows NaN literals; live Actions must not treat them as green.
    path.write_text(json.dumps(report) + "\n", encoding="utf-8")
    with pytest.raises(ValueError, match="finite"):
        validate_results_file(path)


def test_validate_results_file_and_cli(tmp_path, capsys, monkeypatch):
    missing = tmp_path / "missing.json"
    with pytest.raises(ValueError, match="missing"):
        validate_results_file(missing)

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
    monkeypatch.setenv("MONGODB_DB", "policy_assistant")
    assert validate_cli_main(["--check-env", "--results", str(good)]) == 0
    out = capsys.readouterr().out
    assert "present" in out
    assert "evaluated_cases=2" in out

    bad = tmp_path / "bad.json"
    bad.write_text(json.dumps({"metrics": {"evaluated_cases": 0}, "results": []}) + "\n")
    assert validate_cli_main(["--results", str(bad)]) == 1
