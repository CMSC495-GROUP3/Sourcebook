# Coverage for the v1.0.0 candidate

Pending. After the Monday 28 September freeze, the green push-to-`main` CI
run on the candidate uploads two SHA-named artifacts, kept for 90 days
([#261](https://github.com/CMSC495-GROUP3/Sourcebook/pull/261)):

- `python-coverage-<sha>`: `coverage.xml` and `coverage-table.md`
- `web-coverage-<sha>`: `coverage-summary.json` and `coverage-final.json`

Copy the Python table from `coverage-table.md` and the web totals from
`coverage-summary.json` into the tables below, with the run link. Web
coverage is measured on the source files listed in `web/vitest.config.ts`,
not all of `web/src`. Say so wherever the figure is quoted.

| Field | Value |
| --- | --- |
| Candidate commit | Pending |
| CI run | Pending |

## Python

Pending: the table from `coverage-table.md`. CI fails below 80%.

## Web

| Statements | Branches | Functions | Lines |
| ---: | ---: | ---: | ---: |
| Pending | Pending | Pending | Pending |
