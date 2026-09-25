"""Contract checks for CI coverage artifact retention (issue #210)."""

from __future__ import annotations

import json
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github" / "workflows" / "ci.yml"
VITEST_CONFIG = ROOT / "web" / "vitest.config.ts"
WEB_PACKAGE = ROOT / "web" / "package.json"
WEB_COVERAGE_DIR = "web/node_modules/.tmp/coverage"
COVERAGE_SUMMARY_PATH = f"{WEB_COVERAGE_DIR}/coverage-summary.json"
COVERAGE_FINAL_PATH = f"{WEB_COVERAGE_DIR}/coverage-final.json"
COVERAGE_TABLE_PATH = f"{WEB_COVERAGE_DIR}/coverage-table.md"


def _steps(job: str) -> list[dict]:
    workflow = yaml.safe_load(WORKFLOW.read_text(encoding="utf-8"))
    return workflow["jobs"][job]["steps"]


def _upload_steps(job: str) -> list[dict]:
    return [
        step for step in _steps(job) if step.get("uses", "").startswith("actions/upload-artifact@")
    ]


def test_python_coverage_markdown_is_written_to_a_file():
    """The job summary is ephemeral; the table must also land on disk."""
    by_name = {step.get("name"): step for step in _steps("python-tests")}
    summary = by_name["Coverage summary"]
    assert summary["if"] == "always()"
    run = summary["run"]
    assert "coverage report --format=markdown" in run
    assert "coverage-table.md" in run
    assert "tee" in run


def test_python_failure_and_matrix_artifacts_still_upload():
    """Red jobs and the 3.12 matrix cell keep the existing evidence bundle."""
    uploads = _upload_steps("python-tests")
    failure_upload = next(
        step
        for step in uploads
        if step.get("with", {}).get("name") == "python-test-results-py${{ matrix.python }}"
    )
    assert "always()" in str(failure_upload["if"])
    assert "failure()" in str(failure_upload["if"])
    assert "matrix.python == '3.12'" in str(failure_upload["if"])
    paths = failure_upload["with"]["path"]
    assert "coverage.xml" in paths
    assert "coverage-table.md" in paths
    assert "junit.xml" in paths
    assert failure_upload["with"]["retention-days"] == 14


def test_python_main_success_uploads_sha_named_coverage_pack():
    """Successful main pushes retain XML + markdown under a commit SHA name."""
    uploads = _upload_steps("python-tests")
    main_upload = next(
        step
        for step in uploads
        if step.get("with", {}).get("name") == "python-coverage-${{ github.sha }}"
    )
    condition = str(main_upload["if"])
    assert "success()" in condition
    assert "github.event_name == 'push'" in condition
    assert "github.ref == 'refs/heads/main'" in condition
    assert "matrix.python == '3.12'" in condition
    paths = main_upload["with"]["path"]
    assert "coverage.xml" in paths
    assert "coverage-table.md" in paths
    assert main_upload["with"]["retention-days"] == 90


def test_web_job_runs_vitest_with_coverage():
    """The web job must execute Vitest coverage before any coverage upload."""
    pkg = json.loads(WEB_PACKAGE.read_text(encoding="utf-8"))
    assert "--coverage" in pkg["scripts"]["test"]

    runs = [step.get("run") for step in _steps("web") if isinstance(step.get("run"), str)]
    assert "npm test" in runs


def test_web_vitest_emits_json_summary_for_release_totals():
    """#210 needs statement/branch/function/line totals, not only per-statement JSON."""
    config = VITEST_CONFIG.read_text(encoding="utf-8")
    assert "json-summary" in config
    assert "reportsDirectory: './node_modules/.tmp/coverage'" in config


def test_web_main_success_uploads_sha_named_vitest_coverage():
    """Successful main pushes retain Vitest coverage under a commit SHA name."""
    uploads = _upload_steps("web")
    main_upload = next(
        step
        for step in uploads
        if step.get("with", {}).get("name") == "web-coverage-${{ github.sha }}"
    )
    condition = str(main_upload["if"])
    assert "success()" in condition
    assert "github.event_name == 'push'" in condition
    assert "github.ref == 'refs/heads/main'" in condition
    paths = main_upload["with"]["path"]
    assert COVERAGE_SUMMARY_PATH in paths
    assert COVERAGE_FINAL_PATH in paths
    assert COVERAGE_TABLE_PATH in paths
    assert main_upload["with"]["retention-days"] == 90
    assert main_upload["with"]["if-no-files-found"] == "error"


def test_web_failure_still_uploads_vitest_coverage():
    """A red web job keeps Vitest coverage when the reporter produced files."""
    uploads = _upload_steps("web")
    failure_upload = next(
        step
        for step in uploads
        if step.get("with", {}).get("name") == "web-coverage-failure-${{ github.sha }}"
    )
    assert failure_upload["if"] == "failure()"
    paths = failure_upload["with"]["path"]
    assert COVERAGE_SUMMARY_PATH in paths
    assert COVERAGE_FINAL_PATH in paths
    assert COVERAGE_TABLE_PATH in paths
    assert failure_upload["with"]["retention-days"] == 14
    assert failure_upload["with"]["if-no-files-found"] == "ignore"


def test_web_dist_main_upload_is_preserved():
    """Deployable dist retention on main is unrelated and must stay."""
    uploads = _upload_steps("web")
    dist_upload = next(step for step in uploads if step.get("with", {}).get("name") == "web-dist")
    assert dist_upload["if"] == ("github.event_name == 'push' && github.ref == 'refs/heads/main'")
    assert dist_upload["with"]["path"] == "web/dist"


def test_web_coverage_markdown_is_written_next_to_the_vitest_json():
    """The web table lands in the coverage folder so the artifact root stays flat."""
    by_name = {step.get("name"): step for step in _steps("web")}
    summary = by_name["Coverage summary"]
    assert summary["if"] == "always()"
    assert summary["shell"] == "bash"
    assert "tee node_modules/.tmp/coverage/coverage-table.md" in summary["run"]


def test_main_runs_are_never_cancelled_by_a_newer_push():
    """Only pull requests cancel superseded runs; main keeps a finished run per commit."""
    for name in ("ci.yml", "security.yml"):
        workflow = yaml.safe_load((WORKFLOW.parent / name).read_text(encoding="utf-8"))
        cancel = workflow["concurrency"]["cancel-in-progress"]
        assert cancel == "${{ github.event_name == 'pull_request' }}", name
