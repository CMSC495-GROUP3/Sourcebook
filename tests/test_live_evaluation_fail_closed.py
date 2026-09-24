"""Fail-closed gates for live evaluation env and results integrity."""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

import pytest
import yaml

from scripts.validate_live_evaluation import main as validate_cli_main
from sourcebook.rag.evaluation import (
    _validate_rate_metric,
    require_commit_ancestor_of_ref,
    require_exact_checkout_sha,
    require_live_env,
    require_nonempty_commit_sha,
    resolve_evaluation_shas,
    validate_mongodb_db_name,
    validate_results_file,
    validate_results_report,
)
from sourcebook.rag.evaluation import (
    main as evaluation_main,
)

# main() looks these up on its own module at call time, so the patches go by
# dotted path rather than through a second import of the module.
RUN_EVALUATION = "sourcebook.rag.evaluation.run_evaluation"
SCORE_RESULTS = "sourcebook.rag.evaluation.score_results"
GET_CORPUS_VERSION = "sourcebook.rag.cache.get_corpus_version"

WORKFLOW = Path(__file__).resolve().parents[1] / ".github" / "workflows" / "evaluation.yml"

_FAKE_SHA_A = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
_FAKE_SHA_B = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"


def _valid_report(**overrides: object) -> dict:
    report: dict = {
        "requested_sha": _FAKE_SHA_A,
        "tested_sha": _FAKE_SHA_A,
        "tier": "smoke",
        "dataset": "evaluation/questions.json",
        "corpus_version": "test-corpus-version",
        "llm_provider": "openai",
        "answer_model": "gpt-4o",
        "utility_model": "gpt-4o-mini",
        "embedding_model": "text-embedding-3-small",
        "prompt_version": "v2",
        "scoring_mode": "measurement_only",
        "pass_fail_thresholds": None,
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


def test_require_exact_checkout_sha_accepts_match_and_rejects_mismatch():
    assert require_exact_checkout_sha(_FAKE_SHA_A, _FAKE_SHA_A) == _FAKE_SHA_A
    with pytest.raises(ValueError, match="Checkout SHA mismatch"):
        require_exact_checkout_sha(_FAKE_SHA_A, _FAKE_SHA_B)
    with pytest.raises(ValueError, match="required"):
        require_nonempty_commit_sha("")
    with pytest.raises(ValueError, match="required"):
        require_nonempty_commit_sha("   ")


@pytest.mark.parametrize(
    ("value", "needle"),
    [
        ("abc123", "short SHA"),
        ("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "short SHA"),  # 39
        ("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "malformed length"),  # 41
        ("AAAAAAAAAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "lowercase"),  # mixed case 40
        ("main", "branch, tag, or ref"),
        ("HEAD", "branch, tag, or ref"),
        ("refs/heads/main", "branch, tag, or ref"),
        ("origin/main", "branch, tag, or ref"),
        ("v1.0.0", "branch, tag, or ref"),
        ("feature/eval", "branch, tag, or ref"),
        (f"  {_FAKE_SHA_B}  ", "malformed"),
        ("not a sha!!!", "malformed"),
    ],
)
def test_require_nonempty_commit_sha_rejects_non_40_hex(value: str, needle: str):
    with pytest.raises(ValueError, match=needle):
        require_nonempty_commit_sha(value)


def test_require_nonempty_commit_sha_accepts_exact_40_hex():
    assert require_nonempty_commit_sha(_FAKE_SHA_A) == _FAKE_SHA_A
    assert require_nonempty_commit_sha(_FAKE_SHA_B) == _FAKE_SHA_B


def test_require_commit_ancestor_of_ref_accepts_main_ancestors(tmp_path: Path):
    """Historical merged main commits pass; tip-only is not required."""
    repo = tmp_path / "repo"
    repo.mkdir()
    env = {
        **os.environ,
        "GIT_AUTHOR_NAME": "t",
        "GIT_AUTHOR_EMAIL": "t@example.com",
        "GIT_COMMITTER_NAME": "t",
        "GIT_COMMITTER_EMAIL": "t@example.com",
    }

    def git(*args: str) -> str:
        completed = subprocess.run(
            ["git", *args],
            cwd=repo,
            check=True,
            capture_output=True,
            text=True,
            env=env,
        )
        return completed.stdout.strip()

    git("init", "-b", "main")
    (repo / "a.txt").write_text("a\n", encoding="utf-8")
    git("add", "a.txt")
    git("commit", "-m", "root")
    root = git("rev-parse", "HEAD")
    (repo / "b.txt").write_text("b\n", encoding="utf-8")
    git("add", "b.txt")
    git("commit", "-m", "second")
    tip = git("rev-parse", "HEAD")
    git("update-ref", "refs/remotes/origin/main", tip)

    assert require_commit_ancestor_of_ref(root, "origin/main", cwd=repo) == root
    assert require_commit_ancestor_of_ref(tip, "origin/main", cwd=repo) == tip


def test_require_commit_ancestor_of_ref_rejects_non_ancestor_and_missing(tmp_path: Path):
    repo = tmp_path / "repo"
    repo.mkdir()
    env = {
        **os.environ,
        "GIT_AUTHOR_NAME": "t",
        "GIT_AUTHOR_EMAIL": "t@example.com",
        "GIT_COMMITTER_NAME": "t",
        "GIT_COMMITTER_EMAIL": "t@example.com",
    }

    def git(*args: str) -> str:
        completed = subprocess.run(
            ["git", *args],
            cwd=repo,
            check=True,
            capture_output=True,
            text=True,
            env=env,
        )
        return completed.stdout.strip()

    git("init", "-b", "main")
    (repo / "a.txt").write_text("a\n", encoding="utf-8")
    git("add", "a.txt")
    git("commit", "-m", "root")
    main_tip = git("rev-parse", "HEAD")
    git("update-ref", "refs/remotes/origin/main", main_tip)

    git("checkout", "-b", "feature")
    (repo / "f.txt").write_text("f\n", encoding="utf-8")
    git("add", "f.txt")
    git("commit", "-m", "fork-only tip")
    feature_tip = git("rev-parse", "HEAD")

    with pytest.raises(ValueError, match="not an ancestor of origin/main"):
        require_commit_ancestor_of_ref(feature_tip, "origin/main", cwd=repo)

    missing = "cccccccccccccccccccccccccccccccccccccccc"
    with pytest.raises(ValueError, match="not a known commit object"):
        require_commit_ancestor_of_ref(missing, "origin/main", cwd=repo)

    with pytest.raises(ValueError, match="short SHA"):
        require_commit_ancestor_of_ref(feature_tip[:7], "origin/main", cwd=repo)

    with pytest.raises(ValueError, match="branch, tag, or ref"):
        require_commit_ancestor_of_ref("main", "origin/main", cwd=repo)


def test_resolve_evaluation_shas_fail_closed_under_actions(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("GITHUB_ACTIONS", "true")
    monkeypatch.delenv("EVAL_REQUESTED_SHA", raising=False)
    monkeypatch.delenv("EVAL_TESTED_SHA", raising=False)
    with pytest.raises(ValueError, match="EVAL_REQUESTED_SHA"):
        resolve_evaluation_shas()

    monkeypatch.setenv("EVAL_REQUESTED_SHA", _FAKE_SHA_A)
    monkeypatch.setenv("EVAL_TESTED_SHA", _FAKE_SHA_B)
    with pytest.raises(ValueError, match="Checkout SHA mismatch"):
        resolve_evaluation_shas()

    monkeypatch.setenv("EVAL_TESTED_SHA", _FAKE_SHA_A)
    assert resolve_evaluation_shas() == (_FAKE_SHA_A, _FAKE_SHA_A)


def test_validate_results_report_accepts_complete_fixture():
    report = validate_results_report(_valid_report())
    assert report["metrics"]["evaluated_cases"] == 2
    assert report["requested_sha"] == _FAKE_SHA_A
    assert report["tested_sha"] == _FAKE_SHA_A
    assert report["pass_fail_thresholds"] is None


def test_validate_results_report_rejects_missing_requested_or_tested_sha():
    missing_requested = _valid_report()
    del missing_requested["requested_sha"]
    with pytest.raises(ValueError, match="requested_sha"):
        validate_results_report(missing_requested)

    missing_tested = _valid_report()
    del missing_tested["tested_sha"]
    with pytest.raises(ValueError, match="tested_sha"):
        validate_results_report(missing_tested)

    blank = _valid_report(requested_sha="", tested_sha="")
    with pytest.raises(ValueError, match="requested_sha"):
        validate_results_report(blank)

    mismatch = _valid_report(requested_sha=_FAKE_SHA_A, tested_sha=_FAKE_SHA_B)
    with pytest.raises(ValueError, match="Checkout SHA mismatch"):
        validate_results_report(mismatch)


def test_validate_results_report_rejects_missing_metrics_and_empty_cases():
    with pytest.raises(ValueError, match="required identity keys"):
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

    missing_metrics = _valid_report()
    del missing_metrics["metrics"]
    with pytest.raises(ValueError, match="missing a metrics object"):
        validate_results_report(missing_metrics)


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


def _complete_env(**overrides: str) -> dict[str, str]:
    env = {
        "OPENAI_API_KEY": "key",
        "MONGODB_URI": "mongodb://example",
        "MONGODB_DB": "policy_assistant",
    }
    env.update(overrides)
    return env


@pytest.mark.parametrize("blank", ["", "   ", "\n", "\t"])
def test_empty_mongodb_db_fails_closed(blank: str):
    with pytest.raises(ValueError, match="MONGODB_DB"):
        require_live_env(_complete_env(MONGODB_DB=blank))


@pytest.mark.parametrize(
    "illegal",
    [
        "foo.bar",
        "$admin",
        "db/name",
        "db\\name",
        'say"hi',
        "has space",
        "has\ttab",
        "nul\x00byte",
        # Padding is checked as-is because get_db hands the raw value to PyMongo,
        # and a trailing newline would silently select a different database.
        " policy_assistant ",
        "policy_assistant\n",
        # The server rule is fewer than 64 bytes, so 64 is already illegal.
        "a" * 64,
        "a" * 65,
    ],
)
def test_invalid_mongodb_db_name_fails_closed(illegal: str):
    with pytest.raises(ValueError, match="MONGODB_DB"):
        require_live_env(_complete_env(MONGODB_DB=illegal))
    with pytest.raises(ValueError, match="MONGODB_DB"):
        validate_mongodb_db_name(illegal)


def test_legal_mongodb_db_name_is_returned_unchanged():
    require_live_env(_complete_env(MONGODB_DB="policy_assistant"))
    assert validate_mongodb_db_name("policy_assistant") == "policy_assistant"
    assert validate_mongodb_db_name("a" * 63) == "a" * 63


@pytest.mark.parametrize("bad", ["", "db.name", " policy_assistant "])
def test_check_env_cli_rejects_bad_mongodb_db(
    bad: str, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
):
    for key, value in _complete_env(MONGODB_DB=bad).items():
        monkeypatch.setenv(key, value)
    assert validate_cli_main(["--check-env"]) == 1
    assert "MONGODB_DB" in capsys.readouterr().err


@pytest.mark.parametrize("bad", ["", "policy.assistant", " policy_assistant "])
def test_evaluation_main_rejects_bad_mongodb_db_without_writing(
    bad: str, monkeypatch: pytest.MonkeyPatch, tmp_path: Path, capsys: pytest.CaptureFixture[str]
):
    monkeypatch.delenv("GITHUB_ACTIONS", raising=False)
    for key, value in _complete_env(MONGODB_DB=bad).items():
        monkeypatch.setenv(key, value)
    monkeypatch.setenv("EVAL_REQUESTED_SHA", _FAKE_SHA_A)
    monkeypatch.setenv("EVAL_TESTED_SHA", _FAKE_SHA_A)
    output = tmp_path / "results.json"
    assert evaluation_main(["--tier", "smoke", "--yes", "--output", str(output)]) == 1
    assert not output.exists()
    assert "MONGODB_DB" in capsys.readouterr().err


def test_evaluation_main_rejects_sha_mismatch_before_results_or_paid_path(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, capsys: pytest.CaptureFixture[str]
):
    """SHA mismatch must exit before writing results and before run_evaluation."""
    called = {"run": False, "corpus": False}

    def boom_run(cases):
        called["run"] = True
        raise AssertionError("paid path must not run on SHA mismatch")

    def boom_corpus():
        called["corpus"] = True
        raise AssertionError("corpus lookup must not run on SHA mismatch")

    monkeypatch.delenv("GITHUB_ACTIONS", raising=False)
    for key, value in _complete_env().items():
        monkeypatch.setenv(key, value)
    monkeypatch.setenv("EVAL_REQUESTED_SHA", _FAKE_SHA_A)
    monkeypatch.setenv("EVAL_TESTED_SHA", _FAKE_SHA_B)
    monkeypatch.setattr(RUN_EVALUATION, boom_run)
    monkeypatch.setattr(GET_CORPUS_VERSION, boom_corpus)
    output = tmp_path / "results.json"
    assert evaluation_main(["--tier", "smoke", "--yes", "--output", str(output)]) == 1
    assert not output.exists()
    assert called == {"run": False, "corpus": False}
    assert "Checkout SHA mismatch" in capsys.readouterr().err


def test_evaluation_main_rejects_empty_sha_under_actions_without_writing(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, capsys: pytest.CaptureFixture[str]
):
    monkeypatch.setenv("GITHUB_ACTIONS", "true")
    for key, value in _complete_env().items():
        monkeypatch.setenv(key, value)
    monkeypatch.setenv("EVAL_REQUESTED_SHA", "")
    monkeypatch.setenv("EVAL_TESTED_SHA", "")
    output = tmp_path / "results.json"
    assert evaluation_main(["--tier", "smoke", "--yes", "--output", str(output)]) == 1
    assert not output.exists()
    assert "EVAL_REQUESTED_SHA" in capsys.readouterr().err


def _run_main_with_live_env(monkeypatch: pytest.MonkeyPatch, output: Path) -> int:
    monkeypatch.delenv("GITHUB_ACTIONS", raising=False)
    for key, value in _complete_env().items():
        monkeypatch.setenv(key, value)
    monkeypatch.setenv("EVAL_REQUESTED_SHA", _FAKE_SHA_A)
    monkeypatch.setenv("EVAL_TESTED_SHA", _FAKE_SHA_A)
    monkeypatch.setattr(GET_CORPUS_VERSION, lambda: "test-corpus-version")
    return evaluation_main(["--tier", "smoke", "--yes", "--output", str(output)])


def test_evaluation_main_reports_runner_failure_without_writing(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, capsys: pytest.CaptureFixture[str]
):
    def explode(cases):
        raise RuntimeError("provider exploded")

    monkeypatch.setattr(RUN_EVALUATION, explode)
    output = tmp_path / "results.json"
    assert _run_main_with_live_env(monkeypatch, output) == 1
    assert not output.exists()
    err = capsys.readouterr().err
    assert "Traceback" in err
    assert "RuntimeError: provider exploded" in err


def test_evaluation_main_names_argumentless_exception(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, capsys: pytest.CaptureFixture[str]
):
    def explode(cases):
        raise RuntimeError()

    monkeypatch.setattr(RUN_EVALUATION, explode)
    output = tmp_path / "results.json"
    assert _run_main_with_live_env(monkeypatch, output) == 1
    assert not output.exists()
    # The traceback alone ends in a bare "RuntimeError" line, so check the
    # summary line specifically: it must name the type even with no message.
    assert (
        "Live evaluation failed before trustworthy results were produced: RuntimeError:"
        in capsys.readouterr().err
    )


def test_evaluation_main_rejects_unscoreable_report_without_writing(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, capsys: pytest.CaptureFixture[str]
):
    empty_metrics = {**_valid_report()["metrics"], "evaluated_cases": 0}
    monkeypatch.setattr(RUN_EVALUATION, lambda cases: [])
    monkeypatch.setattr(SCORE_RESULTS, lambda cases, results: empty_metrics)
    output = tmp_path / "results.json"
    assert _run_main_with_live_env(monkeypatch, output) == 1
    assert not output.exists()
    assert "at least 1" in capsys.readouterr().err


def test_workflow_fail_closed_contract():
    """The Actions job cannot go green without the env gate and the results gate."""
    workflow = yaml.safe_load(WORKFLOW.read_text(encoding="utf-8"))
    steps = workflow["jobs"]["evaluate"]["steps"]
    by_name = {step.get("name"): step for step in steps}
    # PyYAML turns the workflow key `on` into boolean True.
    inputs = workflow[True]["workflow_dispatch"]["inputs"]
    text = WORKFLOW.read_text(encoding="utf-8")

    assert "commit_sha" in inputs
    assert inputs["commit_sha"]["required"] is True
    assert "default" not in inputs["commit_sha"]

    format_step = by_name["Require exact 40-hex commit_sha input"]
    assert r"^[0-9a-f]{40}$" in format_step["run"]
    assert "short SHA" in format_step["run"]
    assert "branch, tag, or ref" in format_step["run"]
    assert "%%[![:space:]]" not in format_step["run"]

    checkouts = [
        step for step in steps if str(step.get("uses", "")).startswith("actions/checkout@")
    ]
    assert len(checkouts) == 1
    assert checkouts[0]["name"] == "Checkout canonical main for ancestry check"
    assert checkouts[0]["with"]["fetch-depth"] == 0
    assert "ref" not in checkouts[0].get("with", {})
    assert "inputs.commit_sha" not in str(checkouts[0])

    ancestry = by_name["Require commit_sha is ancestor of origin/main"]
    assert "git merge-base --is-ancestor" in ancestry["run"]
    assert "origin/main" in ancestry["run"]
    assert "not an ancestor of origin/main" in ancestry["run"]
    assert "%%[![:space:]]" not in ancestry["run"]

    detach = by_name["Checkout requested evaluation SHA"]
    assert "git checkout --detach" in detach["run"]
    assert "steps.ancestry.outputs.requested_sha" in detach["env"]["REQUESTED_SHA"]

    sha_step = by_name["Require exact checkout SHA"]
    assert "Checkout SHA mismatch" in sha_step["run"]
    assert "git rev-parse HEAD" in sha_step["run"]

    format_index = next(
        i
        for i, step in enumerate(steps)
        if step.get("name") == "Require exact 40-hex commit_sha input"
    )
    main_checkout_index = next(
        i
        for i, step in enumerate(steps)
        if step.get("name") == "Checkout canonical main for ancestry check"
    )
    ancestry_index = next(
        i
        for i, step in enumerate(steps)
        if step.get("name") == "Require commit_sha is ancestor of origin/main"
    )
    detach_index = next(
        i for i, step in enumerate(steps) if step.get("name") == "Checkout requested evaluation SHA"
    )
    sha_index = next(
        i for i, step in enumerate(steps) if step.get("name") == "Require exact checkout SHA"
    )
    setup_index = next(
        i
        for i, step in enumerate(steps)
        if str(step.get("uses", "")).startswith("actions/setup-python@")
    )
    pip_index = next(
        i
        for i, step in enumerate(steps)
        if step.get("run") == "pip install -r requirements/api.txt -r requirements/ingest.txt"
    )
    secrets_index = next(
        i for i, step in enumerate(steps) if step.get("name") == "Require live evaluation secrets"
    )
    atlas_index = next(
        i
        for i, step in enumerate(steps)
        if step.get("name") == "Admit this runner to the Atlas IP access list"
    )
    assert (
        format_index
        < main_checkout_index
        < ancestry_index
        < detach_index
        < sha_index
        < setup_index
        < pip_index
        < secrets_index
        < atlas_index
    )

    assert "merged canonical-main history only" in text
    assert "host procedure" in text.lower() or "host" in text

    assert "--check-env" in by_name["Require live evaluation secrets"]["run"]
    assert "set -euo pipefail" in by_name["Run the evaluation"]["run"]
    assert "EVAL_REQUESTED_SHA" in by_name["Run the evaluation"]["env"]
    assert "EVAL_TESTED_SHA" in by_name["Run the evaluation"]["env"]

    results_step = by_name["Validate evaluation results"]
    assert results_step["if"] == "always()"
    assert "--results evaluation/results.json" in results_step["run"]

    # A step that tolerates its own failure would turn the gates above into
    # advisories. None may, so the always() on the results step stays defence
    # in depth rather than load-bearing.
    assert [step.get("name") for step in steps if "continue-on-error" in step] == []
