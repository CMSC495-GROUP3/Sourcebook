# Code quality evidence

This page points a grader at the review, coverage, and performance artifacts that already exist. Every number names the file, pull request, or Actions run it came from. It does not invent a committed coverage percentage, a live-evaluation PASS, Lighthouse scores, or a beta/final release folder that is not on `main`.

Sibling pages own adjacent evidence and are not duplicated here:

- CI/CD workflow inventory and deploy screenshots: [issue #207](https://github.com/CMSC495-GROUP3/Sourcebook/issues/207).
- Committed coverage table for the tagged final: [issue #210](https://github.com/CMSC495-GROUP3/Sourcebook/issues/210).
- React component tests: [issue #211](https://github.com/CMSC495-GROUP3/Sourcebook/issues/211).
- Deployed-pilot load run: [issue #212](https://github.com/CMSC495-GROUP3/Sourcebook/issues/212).
- Full evaluation tier: [issue #213](https://github.com/CMSC495-GROUP3/Sourcebook/issues/213).
- Lighthouse per theme: [issue #214](https://github.com/CMSC495-GROUP3/Sourcebook/issues/214).
- `v1.0.0` freeze scaffold: [issue #215](https://github.com/CMSC495-GROUP3/Sourcebook/issues/215).

## Code review

### What the repository requires

[`.github/CODEOWNERS`](../.github/CODEOWNERS) requests [@DanielTsang26](https://github.com/DanielTsang26), [@t-shahan](https://github.com/t-shahan), and [@Lazzy-dev](https://github.com/Lazzy-dev) on every path. Branch protection is supposed to require a code-owner approval and the aggregate check named **CI status** ([CONTRIBUTING.md](../CONTRIBUTING.md#what-ci-runs)).

Every pull request also runs [PR checks](https://github.com/CMSC495-GROUP3/Sourcebook/blob/main/.github/workflows/pr-checks.yml): the title must be `type: what changed`, and the description must include a filled **What and why**. The Security workflow (CodeQL, dependency audit, gitleaks) is a separate signal from review.

### Counts on current `main`

Snapshot against [`7d028ef`](https://github.com/CMSC495-GROUP3/Sourcebook/commit/7d028efd37ca738cff51bf001961021a1ff6ef90) on 2026-09-12, from `gh` search on `CMSC495-GROUP3/Sourcebook`:

| Signal | Count | Source |
| --- | ---: | --- |
| Pull requests (all states, first 128 returned by `gh pr list`) | 128 | `gh pr list --state all` |
| Merged pull requests in that list | 101 | same list, `state == MERGED` |
| Merged PRs authored by @t-shahan | 47 | `author:t-shahan is:merged` |
| Merged PRs authored by @threshi-art | 36 | `author:threshi-art is:merged` |
| Merged PRs authored by dependabot | 15 | `author:app/dependabot is:merged` |
| Merged PRs authored by @Lazzy-dev | 2 | `author:Lazzy-dev is:merged` |
| Merged PRs authored by @RoNUO | 1 | `author:RoNUO is:merged` |
| PRs reviewed by @t-shahan | 45 | `reviewed-by:t-shahan` |
| PRs reviewed by @threshi-art | 6 | `reviewed-by:threshi-art` |
| PRs reviewed by @RoNUO | 2 | `reviewed-by:RoNUO` |
| PRs reviewed by @Lazzy-dev | 2 | `reviewed-by:Lazzy-dev` |
| PRs reviewed by @DanielTsang26 | 1 | `reviewed-by:DanielTsang26` |
| PRs reviewed by @gavinwathen or @fudgepop01 | 0 | same search, no hits |

These are GitHub search totals, not a hand-counted review-event ledger. [Issue #201](https://github.com/CMSC495-GROUP3/Sourcebook/issues/201) earlier cited 100 merged PRs and 73 human reviews; this page uses the 2026-09-12 query instead of repeating that older pair.

### Threads where review changed the code

| Thread | What review changed | Link |
| --- | --- | --- |
| httpx lock outage | The API lock installs `httpx2` via OpenAI and does not install the `httpx` import [PR #163](https://github.com/CMSC495-GROUP3/Sourcebook/pull/163) used for timeouts. Taylor reproduced `ModuleNotFoundError: No module named 'httpx'` in a fresh 3.12 venv from `requirements/api.lock.txt` and the fix stopped importing `httpx` directly. [PR #164](https://github.com/CMSC495-GROUP3/Sourcebook/pull/164) then constructed the provider inside the built image so CI sees the same failure mode. | [#163](https://github.com/CMSC495-GROUP3/Sourcebook/pull/163), [#164](https://github.com/CMSC495-GROUP3/Sourcebook/pull/164) |
| Grounding-gate / clarify prompt | On [PR #138](https://github.com/CMSC495-GROUP3/Sourcebook/pull/138) Taylor's review rewrote the clarifying-question rules, stopped labelling the server's own citation titles as untrusted, dropped hard-coded `PROMPT_VERSION == v3` asserts, and set the default to `v2`. Chris applied those on `d15a348`. | [#138](https://github.com/CMSC495-GROUP3/Sourcebook/pull/138) |
| Passage index | [PR #176](https://github.com/CMSC495-GROUP3/Sourcebook/pull/176) is still open. Taylor's reviews required a merge of the `sourcebook` package rename and called out migration evidence; George stated he will copy the database before approving. Review is blocking merge, not rubber-stamping it. | [#176](https://github.com/CMSC495-GROUP3/Sourcebook/pull/176), [#158](https://github.com/CMSC495-GROUP3/Sourcebook/issues/158) |
| pip-compile names and lock check | On [PR #157](https://github.com/CMSC495-GROUP3/Sourcebook/pull/157) Taylor's review asked for a `pip-compile` staleness check and a Makefile `lock` target that survives the #135 venv rewrite. Those landed as follow-up commits on that PR (`31d36f1`). [PR #178](https://github.com/CMSC495-GROUP3/Sourcebook/pull/178) then named inputs `.in` and outputs `.txt` so Dependabot recompiles locks. | [#157](https://github.com/CMSC495-GROUP3/Sourcebook/pull/157), [#178](https://github.com/CMSC495-GROUP3/Sourcebook/pull/178) |
| Live-evaluation NaN | On [PR #181](https://github.com/CMSC495-GROUP3/Sourcebook/pull/181) Rob requested changes: `_validate_rate_metric` accepted `NaN`. The follow-up rejected non-finite rates; Rob approved after re-review. | [#181](https://github.com/CMSC495-GROUP3/Sourcebook/pull/181) |

## Coverage

### What is enforced today

CI runs pytest with `--cov-fail-under=80` on Python 3.11 through 3.14 ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)). Locally that is `make cov` / `make check` ([CONTRIBUTING.md](../CONTRIBUTING.md#checking-a-change)). A job that lands under 80% is red. That is a floor, not a published percentage.

The 3.12 job writes a markdown table into the Actions job summary and uploads `coverage.xml` for 14 days. Those artifacts expire with the run. Nothing on `main` commits that table. [Issue #210](https://github.com/CMSC495-GROUP3/Sourcebook/issues/210) is the follow-up that will copy the **tagged final** table into `docs/releases/v1.0.0/evidence/coverage.md`. This page will cite that file when it exists; it does not pretend the file is here.

Latest green CI on this snapshot: [run 34653615835](https://github.com/CMSC495-GROUP3/Sourcebook/actions/runs/34653615835) at `7d028ef`. Open that run's Python-test job summary for the table from that SHA. Do not treat the badge as a coverage number.

### What the suite covers, and what it does not

From the README [Tests and CI](../README.md#tests-and-ci) section, which matches `tests/` on `main`:

**Covered (stubbed suite):** the grounding gate and its best-not-mean rule, server-side history filtering, the SSE protocol, first-turn caching and invalidation, query logging, escalations end to end, ingestion without real services, the labeled evaluation set and its metrics, and bookkeeping after a client hangs up mid-stream.

**Not covered:** live calls to AWS, Atlas, or OpenAI, and the React components. `tsc` and ESLint check `web/`; there are no component unit tests until [issue #211](https://github.com/CMSC495-GROUP3/Sourcebook/issues/211).

The suite is the real application with Mongo, the model, and vector search replaced (`tests/conftest.py`, `scripts/loadtest/fakemongo.py`). A green `make check` does not measure retrieval quality.

## Performance and reliability

| Artifact | What it measures | What it does not measure | Link |
| --- | --- | --- | --- |
| Synthetic chat throughput | Thread-pool ceiling with fake model, in-memory Mongo, canned retrieval, limiter off. 40 tokens → 14.9 req/s; 320 tokens → 98.7 req/s; refusal path ~700 req/s; cache hits 210–522 req/s. | Deployed-pilot latency, real OpenAI/Atlas, or the 10,000-user claim under live load. | [docs/load-testing.md](load-testing.md) |
| Alpha live benchmark | Bounded public-URL run on 2026-09-10 against the pilot with real OpenAI and Atlas. Operator-agreed targets (generated TTFT p50 ≤ 4.0s, generated total max ≤ 30s, cached TTFT max ≤ 1.5s, refused total max ≤ 3.0s, error rate 0). Status on that page: **run performed, every target met.** Sample is eight chat requests. | 10,000 concurrent users, p95, or a beta/final repeat. | [live-benchmark.md](releases/v0.1.0-alpha.1/live-benchmark.md), [results JSON](releases/v0.1.0-alpha.1/live-benchmark-results.json) |
| Deployed load run | Not on `main`. | — | [issue #212](https://github.com/CMSC495-GROUP3/Sourcebook/issues/212) |
| Alpha smoke evaluation | Two host runs of the 20-case smoke tier (`9871e3e` vs `4e90382`). Recall@5, citation correctness, and grounded-answer rate are 100% of 12 answerable cases on both commits. Unsupported-refusal handling and prompt-injection grounding-gate refusal are **0%** of their cases on both commits. | A product-quality PASS. The zeros are [issue #192](https://github.com/CMSC495-GROUP3/Sourcebook/issues/192). The full tier has not been run ([issue #213](https://github.com/CMSC495-GROUP3/Sourcebook/issues/213)). | [live-evaluation.md](releases/v0.1.0-alpha.1/live-evaluation.md), [results JSON](releases/v0.1.0-alpha.1/live-evaluation-results.json), [docs/evaluation.md](evaluation.md) |
| Live evaluation workflow | Manual Actions job against real secrets. The workflow and `scripts/validate_live_evaluation.py` are the measuring instrument. Fail-closed repairs for empty or illegal `MONGODB_DB` are tracked in [issue #223](https://github.com/CMSC495-GROUP3/Sourcebook/issues/223) / [PR #226](https://github.com/CMSC495-GROUP3/Sourcebook/pull/226) and [PR #229](https://github.com/CMSC495-GROUP3/Sourcebook/pull/229) and are **not merged** on this snapshot. Until that lands, treat a green workflow badge as execution status, not answer quality. | Refusal-quality PASS. [Issue #192](https://github.com/CMSC495-GROUP3/Sourcebook/issues/192) remains open. | [evaluation.yml](https://github.com/CMSC495-GROUP3/Sourcebook/blob/main/.github/workflows/evaluation.yml), [PR #181](https://github.com/CMSC495-GROUP3/Sourcebook/pull/181) |
| Lighthouse | Not run. | — | [issue #214](https://github.com/CMSC495-GROUP3/Sourcebook/issues/214) |
| Beta / final live-benchmark.md | Not on `main`. Alpha is the only committed live-benchmark folder. | — | [issue #203](https://github.com/CMSC495-GROUP3/Sourcebook/issues/203), [issue #215](https://github.com/CMSC495-GROUP3/Sourcebook/issues/215) |

### Local quality loop

```bash
make fmt      # ruff --fix and ruff format; version pinned in requirements/lint.txt
make check    # pytest, ruff, ESLint, tsc, Vite build; what CI's main path runs
make cov      # pytest --cov; still fails under 80%
make audit    # pip-audit and npm audit; accepted advisories in scripts/audit.sh
```

`make stub` is not a quality measurement. Fake embeddings are noise; do not tune `SIMILARITY_THRESHOLD` or judge refusal quality from the stub ([CONTRIBUTING.md](../CONTRIBUTING.md#things-that-will-bite-you)).

## What this page will gain later

When #210 commits the tagged coverage table, replace the floor-only paragraph with that number and the run link. When #212, #213, and #214 produce artifacts, add rows to the table above. When #223 / #226 merge, drop the fail-closed caveat if the merged workflow actually fail-closes on the empty-database case. None of those replacements are this PR.
