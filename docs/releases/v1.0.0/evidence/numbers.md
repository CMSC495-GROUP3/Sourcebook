# Shared evidence sheet (position papers)

One table of figures for the Unit 8 individual position papers
([issue #217](https://github.com/CMSC495-GROUP3/Sourcebook/issues/217)).
Every filled cell names the artifact or GitHub search it came from. Cells
without a committed artifact use
`Pending — requires <named artifact/gate>` and do not invent a number.

**Tag status:** `v1.0.0` is not cut. This sheet may sit beside the empty
evidence scaffold from [pull request #230](https://github.com/CMSC495-GROUP3/Sourcebook/pull/230)
(`docs/releases/v1.0.0/evidence/README.md`). Do not treat Pending rows as
final release claims.

**GitHub metadata observation:** merged-pull-request and review totals below
reuse the committed snapshot in [docs/quality.md](../../../quality.md)
(captured **2026-09-18T06:58:39Z**, `main` at
[`88e8a13`](https://github.com/CMSC495-GROUP3/Sourcebook/commit/88e8a134d16e092b2307c51b4e2a5fd7a9af39be)).
Closed-issue totals are a separate live search observation at
**2026-09-22T00:12:02Z**. Re-run the linked searches before freezing the tag.

## Evidence table

| Figure | Value | Source |
| --- | --- | --- |
| Python coverage % | Pending — requires [issue #210](https://github.com/CMSC495-GROUP3/Sourcebook/issues/210) committed table in `docs/releases/v1.0.0/evidence/coverage.md` from the tagged final CI run | Floor today: `--cov-fail-under=80` in [`.github/workflows/ci.yml`](../../../../.github/workflows/ci.yml); see [quality.md § Coverage](../../../quality.md#coverage) |
| Web coverage % | Pending — requires [issue #211](https://github.com/CMSC495-GROUP3/Sourcebook/issues/211) React component tests plus a committed web coverage artifact | `tsc` / ESLint are not coverage ([quality.md](../../../quality.md#what-the-suite-covers-and-what-it-does-not)) |
| Merged pull requests (total) | 122 | [quality.md](../../../quality.md#live-pr-and-review-totals); [`is:pr is:merged`](https://github.com/search?q=repo%3ACMSC495-GROUP3%2FSourcebook+is%3Apr+is%3Amerged&type=pullrequests) |
| Human reviews (total review events) | Pending — requires a review-event ledger (GitHub `reviewed-by` search counts pull requests per reviewer, not review events, and double-counts multi-reviewer PRs) | Per-reviewer PR counts in the member table below |
| Closed issues (total) | 85 | Live search **2026-09-22T00:12:02Z**; [`is:issue is:closed`](https://github.com/search?q=repo%3ACMSC495-GROUP3%2FSourcebook+is%3Aissue+is%3Aclosed&type=issues) |
| Merged PRs by @t-shahan | 57 | [quality.md](../../../quality.md#live-pr-and-review-totals); [`author:t-shahan is:merged`](https://github.com/search?q=repo%3ACMSC495-GROUP3%2FSourcebook+author%3At-shahan+is%3Amerged&type=pullrequests) |
| Merged PRs by @threshi-art | 41 | [quality.md](../../../quality.md#live-pr-and-review-totals); [`author:threshi-art is:merged`](https://github.com/search?q=repo%3ACMSC495-GROUP3%2FSourcebook+author%3Athreshi-art+is%3Amerged&type=pullrequests) |
| Merged PRs by app/dependabot | 18 | [quality.md](../../../quality.md#live-pr-and-review-totals); [`author:app/dependabot is:merged`](https://github.com/search?q=repo%3ACMSC495-GROUP3%2FSourcebook+author%3Aapp%2Fdependabot+is%3Amerged&type=pullrequests) |
| Merged PRs by @Lazzy-dev | 3 | [quality.md](../../../quality.md#live-pr-and-review-totals) |
| Merged PRs by @RoNUO | 2 | [quality.md](../../../quality.md#live-pr-and-review-totals) |
| Merged PRs by @DanielTsang26 | 1 | [quality.md](../../../quality.md#live-pr-and-review-totals) |
| Merged PRs by @gavinwathen | 0 | [quality.md](../../../quality.md#live-pr-and-review-totals) (no search hits at that snapshot) |
| Merged PRs by @fudgepop01 | 0 | [quality.md](../../../quality.md#live-pr-and-review-totals) (no search hits at that snapshot) |
| PRs reviewed by @t-shahan | 55 | [quality.md](../../../quality.md#live-pr-and-review-totals); [`reviewed-by:t-shahan`](https://github.com/search?q=repo%3ACMSC495-GROUP3%2FSourcebook+reviewed-by%3At-shahan&type=pullrequests) |
| PRs reviewed by @threshi-art | 6 | [quality.md](../../../quality.md#live-pr-and-review-totals) |
| PRs reviewed by @Lazzy-dev | 3 | [quality.md](../../../quality.md#live-pr-and-review-totals) |
| PRs reviewed by @RoNUO | 2 | [quality.md](../../../quality.md#live-pr-and-review-totals) |
| PRs reviewed by @DanielTsang26 | 1 | [quality.md](../../../quality.md#live-pr-and-review-totals) |
| PRs reviewed by @gavinwathen / @fudgepop01 | 0 | [quality.md](../../../quality.md#live-pr-and-review-totals) |
| Closed issues authored by @t-shahan | 60 | Live search **2026-09-22T00:12:02Z**; [`author:t-shahan is:issue is:closed`](https://github.com/search?q=repo%3ACMSC495-GROUP3%2FSourcebook+author%3At-shahan+is%3Aissue+is%3Aclosed&type=issues) |
| Closed issues authored by @threshi-art | 24 | Live search **2026-09-22T00:12:02Z** |
| Closed issues authored by @Lazzy-dev | 1 | Live search **2026-09-22T00:12:02Z** |
| Closed issues authored by @RoNUO / @DanielTsang26 / @gavinwathen / @fudgepop01 | 0 | Live search **2026-09-22T00:12:02Z** |
| Contribution statement text per member | Pending — requires `docs/team.md` (not on `main`; use [README Team](../../../../README.md#team) roles until that file lands) | Issue #217 names `docs/team.md` |
| Alpha smoke evaluation | Recall@5 100%; citation correctness 100%; grounded answer rate 100% (12 answerable); unsupported refusal 0% (2 cases); prompt-injection gate refusal 0% (3 cases); both commits `9871e3e` and `4e90382` | [live-evaluation.md](../../v0.1.0-alpha.1/live-evaluation.md), [results JSON](../../v0.1.0-alpha.1/live-evaluation-results.json) |
| Alpha full-tier evaluation | Pending — requires [issue #213](https://github.com/CMSC495-GROUP3/Sourcebook/issues/213) full-tier run and committed results | Smoke page states the full tier has not been run |
| Beta smoke / full evaluation | Pending — requires beta release folder with `live-evaluation.md` | No `docs/releases/v0.*-beta*` on `main` |
| Final smoke / full evaluation | Pending — requires [issue #215](https://github.com/CMSC495-GROUP3/Sourcebook/issues/215) `v1.0.0` freeze artifacts after the tag | [pull request #230](https://github.com/CMSC495-GROUP3/Sourcebook/pull/230) scaffolds the empty evidence directory only |
| Alpha live benchmark targets | generated TTFT p50 ≤ 4.0s; generated total max ≤ 30.0s; cached TTFT max ≤ 1.5s; refused total max ≤ 3.0s; error rate 0.0 | [live-benchmark.md § Targets](../../v0.1.0-alpha.1/live-benchmark.md#targets) |
| Alpha live benchmark results | All five targets **pass** (generated TTFT p50 1.21s n=5; generated total max 4.69s; cached TTFT 0.04s; refused 0.31s; error rate 0.00 n=7) | [live-benchmark.md § Results](../../v0.1.0-alpha.1/live-benchmark.md#against-the-agreed-targets), [results JSON](../../v0.1.0-alpha.1/live-benchmark-results.json) |
| Beta / final live-benchmark.md | Pending — requires beta/final release folders ([issue #203](https://github.com/CMSC495-GROUP3/Sourcebook/issues/203), [issue #215](https://github.com/CMSC495-GROUP3/Sourcebook/issues/215)) | Alpha is the only committed live-benchmark folder |
| Deployed / pilot load-run figures | Pending — requires [issue #212](https://github.com/CMSC495-GROUP3/Sourcebook/issues/212) deployed load-run artifact | Synthetic laptop figures (not pilot): [load-testing.md](../../../load-testing.md) — e.g. 40 tokens → 14.9 req/s; refusal path ~700 req/s |
| Lighthouse scores (per theme) | Pending — requires [issue #214](https://github.com/CMSC495-GROUP3/Sourcebook/issues/214) Lighthouse run | [quality.md](../../../quality.md#performance-and-reliability): not run |
| Deployed uptime | Pending — requires host uptime journal / monitoring export sanitized into this folder at freeze | Named in [issue #217](https://github.com/CMSC495-GROUP3/Sourcebook/issues/217); not on `main` |
| Auto-deploy count since alpha | Pending — requires sanitized `auto-deploy-journal.txt` (and optional green screenshot) from the pilot host | Gate text in [docs/ci-cd.md](../../../ci-cd.md); path `docs/releases/v1.0.0/evidence/auto-deploy-journal.txt` |

### Per-member contribution pointer

| Member | Role (README) | Merged PRs (quality.md snapshot) | PRs reviewed (`reviewed-by`) | Closed issues authored (2026-09-22 search) |
| --- | --- | ---: | ---: | ---: |
| [@t-shahan](https://github.com/t-shahan) | Lead Architect | 57 | 55 | 60 |
| [@DanielTsang26](https://github.com/DanielTsang26) | Interface Designer | 1 | 1 | 0 |
| [@threshi-art](https://github.com/threshi-art) | Integration Lead | 41 | 6 | 24 |
| [@gavinwathen](https://github.com/gavinwathen) | React / design | 0 | 0 | 0 |
| [@fudgepop01](https://github.com/fudgepop01) | React / design | 0 | 0 | 0 |
| [@Lazzy-dev](https://github.com/Lazzy-dev) | Admin / locks / MongoDB | 3 | 3 | 1 |
| [@RoNUO](https://github.com/RoNUO) | Corpus / passage index | 2 | 2 | 0 |

Role prose: [README § Team](../../../../README.md#team). Copy the author's row from
`docs/team.md` into each paper when that file exists; until then cite the README
row and the counts above.

## Position-paper section → repo evidence and standards

| Paper section | Draw from (repo) | Named standards / external comparisons |
| --- | --- | --- |
| Section 1 — product / release narrative | [README](../../../../README.md), alpha [handoff.md](../../v0.1.0-alpha.1/handoff.md) / [release-notes.md](../../v0.1.0-alpha.1/release-notes.md), and (after merge) the `v1.0.0` portfolio/handoff pages from [pull request #230](https://github.com/CMSC495-GROUP3/Sourcebook/pull/230) | Course Unit 8 portfolio brief; keep claims bounded to tagged or committed evidence |
| Section 2 — quality / process | [docs/quality.md](../../../quality.md), [docs/evaluation.md](../../../evaluation.md), [docs/ci-cd.md](../../../ci-cd.md), this sheet | Compare practice areas to **SEI CMMI** (e.g. verification, measurement) or **IEEE 730** (SQA) and **IEEE 12207** (software life-cycle processes) — cite the standard edition your paper uses |
| Section 3 — industry / labor context | Contribution counts above; [README § Team](../../../../README.md#team); open-source process notes in CONTRIBUTING | **Stack Overflow Developer Survey**, **GitHub Octoverse**, or **IEEE Computer Society** reports — use the edition year your paper cites |

Do not invent coverage percentages, Lighthouse scores, uptime, auto-deploy
counts, or beta/final evaluation PASS from this sheet. Fill Pending rows only
when the named issue or host artifact lands, then re-point the Source column.
