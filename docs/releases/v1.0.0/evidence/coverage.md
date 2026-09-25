# Coverage for the v1.0.0 candidate

Pending. After the Monday 28 September freeze, the green push-to-`main` CI
run on the candidate uploads two SHA-named artifacts, kept for 90 days
([#261](https://github.com/CMSC495-GROUP3/Sourcebook/pull/261),
[#275](https://github.com/CMSC495-GROUP3/Sourcebook/pull/275)):

- `python-coverage-<sha>`: `coverage.xml` and `coverage-table.md`
- `web-coverage-<sha>`: `coverage-table.md`, `coverage-summary.json`, and
  `coverage-final.json`

Paste each pack's `coverage-table.md` into its section below, and fill in the
commit and run link. The steps are in
[docs/quality.md](../../../quality.md#where-the-release-coverage-comes-from).
Web coverage is measured on the source files listed in `web/vitest.config.ts`,
not all of `web/src`. Say so wherever the figure is quoted.

| Field | Value |
| --- | --- |
| Candidate commit | Pending |
| CI run | Pending |

## Python

Pending: the table from `python-coverage-<sha>/coverage-table.md`. CI fails
below 80%.

## Web

Pending: the table from `web-coverage-<sha>/coverage-table.md`, one row per
file with a total. CI fails below 80% on statements, branches, functions, or
lines.
