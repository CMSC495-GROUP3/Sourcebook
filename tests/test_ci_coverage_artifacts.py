"""Contract checks for CI coverage artifact retention (issue #210)."""

from __future__ import annotations

from pathlib import Path

import yaml

WORKFLOW = Path(__file__).resolve().parents[1] / ".github" / "workflows" / "ci.yml"


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
    assert main_upload["with"]["path"] == "web/node_modules/.tmp/coverage"
    assert main_upload["with"]["retention-days"] == 90


def test_web_failure_still_uploads_vitest_coverage():
    """A red web job keeps Vitest coverage when the reporter produced files."""
    uploads = _upload_steps("web")
    failure_upload = next(
        step
        for step in uploads
        if step.get("with", {}).get("name") == "web-coverage-failure-${{ github.sha }}"
    )
    assert failure_upload["if"] == "failure()"
    assert failure_upload["with"]["path"] == "web/node_modules/.tmp/coverage"
    assert failure_upload["with"]["retention-days"] == 14
    assert failure_upload["with"]["if-no-files-found"] == "ignore"


def test_web_dist_main_upload_is_preserved():
    """Deployable dist retention on main is unrelated and must stay."""
    uploads = _upload_steps("web")
    dist_upload = next(step for step in uploads if step.get("with", {}).get("name") == "web-dist")
    assert dist_upload["if"] == ("github.event_name == 'push' && github.ref == 'refs/heads/main'")
    assert dist_upload["with"]["path"] == "web/dist"
