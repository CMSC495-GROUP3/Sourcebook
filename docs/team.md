# Team and individual contributions

CMSC 495 Group 3. This page is the per-person record that the README [Team](../README.md#team) section summarizes. Each member checks and edits their own row before this page is treated as final. Position-paper contribution statements should copy from here so the seven papers and the repository agree.

Counts below are a snapshot against canonical `origin/main` at
[`7d028ef`](https://github.com/CMSC495-GROUP3/Sourcebook/commit/7d028efd37ca738cff51bf001961021a1ff6ef90), taken on 2026-09-12. They are not a claim that later commits, open pull requests, or unmerged work "count" as merged history.

| How counted | Command or query |
| --- | --- |
| Author commits | `git shortlog -sn --no-merges` after `.mailmap` |
| Merged pull requests authored | `gh` search `repo:CMSC495-GROUP3/Sourcebook type:pr author:<login> is:merged` |
| Pull requests reviewed | `gh` search `repo:CMSC495-GROUP3/Sourcebook type:pr reviewed-by:<login>` |
| Issues assigned | `gh issue list --assignee <login> --state all` on this repository |

`.mailmap` folds public commit names that already appear in `git log`: `t-shahan` / `Taylor` / `Taylor Shahan` and the `Claude <noreply@anthropic.com>` author lines into **Taylor Shahan**; `Lokias` into **Chris**; `RoNUO` into **Rob**. It does not invent GitHub noreply addresses, and it does not map `dependabot[bot]`.

## Roster

| Member | GitHub | Role (Unit 5 pitch) | Author commits | Merged PRs authored | PRs reviewed |
| --- | --- | --- | ---: | ---: | ---: |
| Taylor Shahan | [@t-shahan](https://github.com/t-shahan) | Lead Architect | 109 | 47 | 45 |
| Chris | [@threshi-art](https://github.com/threshi-art) | Integration Lead | 85 | 36 | 6 |
| Daniel Tsang | [@DanielTsang26](https://github.com/DanielTsang26) | Interface Designer | 2 | 0 | 1 |
| George Struder | [@Lazzy-dev](https://github.com/Lazzy-dev) | Administration, locks, MongoDB | 10 | 2 | 2 |
| Rob | [@RoNUO](https://github.com/RoNUO) | Corpus availability and passage index | 1 | 1 | 2 |
| Gavin | [@gavinwathen](https://github.com/gavinwathen) | React components, design and styling | 0 | 0 | 0 |
| Dominick | [@fudgepop01](https://github.com/fudgepop01) | React components, design and styling | 0 | 0 | 0 |

`dependabot[bot]` has 15 author commits and 15 merged PRs on the same snapshot. It is not a team member.

Mailmapped `git shortlog -sn --no-merges` on that commit shows six human names plus Dependabot, not seven. Gavin and Dominick have no author commits on `main`. This page records that gap instead of inventing history.

## Taylor Shahan

**Owns, per the README.** Module boundaries in `sourcebook/`, the split between the API and `web/`, the deployment shape, and the architecture diagrams.

**What `main` shows.** The largest author and review share. Representative merged work:

- Initial groundwork, [PR #1](https://github.com/CMSC495-GROUP3/Sourcebook/pull/1).
- Package and web layout, [PR #24](https://github.com/CMSC495-GROUP3/Sourcebook/pull/24); later package rename to `sourcebook`, [PR #199](https://github.com/CMSC495-GROUP3/Sourcebook/pull/199).
- Host auto-deploy, [PR #71](https://github.com/CMSC495-GROUP3/Sourcebook/pull/71).
- Open-book web redesign, [PR #161](https://github.com/CMSC495-GROUP3/Sourcebook/pull/161); whole-document library, [PR #167](https://github.com/CMSC495-GROUP3/Sourcebook/pull/167).
- Alpha measurement and release writing: [PR #186](https://github.com/CMSC495-GROUP3/Sourcebook/pull/186), [PR #190](https://github.com/CMSC495-GROUP3/Sourcebook/pull/190), [PR #191](https://github.com/CMSC495-GROUP3/Sourcebook/pull/191), [PR #198](https://github.com/CMSC495-GROUP3/Sourcebook/pull/198).
- httpx lock-outage fix, [PR #163](https://github.com/CMSC495-GROUP3/Sourcebook/pull/163); pip-compile `.in` / `.txt` names, [PR #178](https://github.com/CMSC495-GROUP3/Sourcebook/pull/178); Atlas evaluation access list, [PR #197](https://github.com/CMSC495-GROUP3/Sourcebook/pull/197).

The 16 `Claude <noreply@anthropic.com>` commits on `main` (JWT `exp` work from [PR #154](https://github.com/CMSC495-GROUP3/Sourcebook/pull/154), facing-page icon fix [PR #202](https://github.com/CMSC495-GROUP3/Sourcebook/pull/202), lock-check follow-up on [PR #157](https://github.com/CMSC495-GROUP3/Sourcebook/pull/157), second-password and auto-deploy follow-ups) are mapped to Taylor because [issue #201](https://github.com/CMSC495-GROUP3/Sourcebook/issues/201) asked for that fold. Taylor should confirm that mapping on this row.

## Chris

**Owns, per the README.** Evaluation, verifying merged work as one system, and the evidence behind any release claim. Day-to-day integration.

**What `main` shows.** Second-largest author share. Git records the name `Lokias` with the public address already in `git log`; `.mailmap` prints **Chris**. Representative merged work:

- Offline ingestion tests, [PR #2](https://github.com/CMSC495-GROUP3/Sourcebook/pull/2).
- Forwarded-client IP trust, [PR #54](https://github.com/CMSC495-GROUP3/Sourcebook/pull/54).
- Provider timeout and a separate login pool, [PR #112](https://github.com/CMSC495-GROUP3/Sourcebook/pull/112).
- Citation measurement split from retrieval, [PR #111](https://github.com/CMSC495-GROUP3/Sourcebook/pull/111); evaluation by category, [PR #140](https://github.com/CMSC495-GROUP3/Sourcebook/pull/140).
- Clarify-and-escalate prompt, [PR #138](https://github.com/CMSC495-GROUP3/Sourcebook/pull/138); lifecycle corpus, [PR #139](https://github.com/CMSC495-GROUP3/Sourcebook/pull/139).
- Empty-corpus library cleanup, [PR #132](https://github.com/CMSC495-GROUP3/Sourcebook/pull/132); prompt-injection hygiene for retrieved text, [PR #155](https://github.com/CMSC495-GROUP3/Sourcebook/pull/155).

Open integration work that is **not** in the commit counts above includes query-log reports ([issue #160](https://github.com/CMSC495-GROUP3/Sourcebook/issues/160) / [PR #171](https://github.com/CMSC495-GROUP3/Sourcebook/pull/171)) and the grounding-gate defects ([issue #189](https://github.com/CMSC495-GROUP3/Sourcebook/issues/189), [issue #192](https://github.com/CMSC495-GROUP3/Sourcebook/issues/192)).

## Daniel Tsang

**Owns, per the README.** Endpoint shapes, streaming events, the `LLMProvider` interface, and stored record shapes. CODEOWNERS lists [@DanielTsang26](https://github.com/DanielTsang26) as a required reviewer on every path, with Taylor and George.

**What `main` shows.**

- `101df59` `Initial commit`.
- `c00b30c` facing-page topic-list alignment, the fix recorded on [issue #175](https://github.com/CMSC495-GROUP3/Sourcebook/issues/175).
- One review: [PR #170](https://github.com/CMSC495-GROUP3/Sourcebook/pull/170) (escalation contact rename).

No merged pull request is authored under `DanielTsang26`. Interface-contract work on `main` is also present in PRs Taylor or Chris authored; this row does not reassign those PRs. Daniel should name the contracts he wants cited here.

## George Struder

**Owns, per the README.** Administration, dependency locks, and the MongoDB deployment.

**What `main` shows.** Ten author commits, including lock generation and the Linux lock refresh, the pip-compile CI check, escalation contact from config, the People Operations to Human Resources rename, and the pydantic-core pin revert. Merged PRs:

- [PR #157](https://github.com/CMSC495-GROUP3/Sourcebook/pull/157) lock the Python dependencies.
- [PR #170](https://github.com/CMSC495-GROUP3/Sourcebook/pull/170) escalation contact rename.

Reviews: [PR #173](https://github.com/CMSC495-GROUP3/Sourcebook/pull/173) (Dependabot Python group) and [PR #197](https://github.com/CMSC495-GROUP3/Sourcebook/pull/197) (Atlas access-list admission). Open operations ownership includes the copied-database check on [PR #176](https://github.com/CMSC495-GROUP3/Sourcebook/pull/176) and Atlas scope notes on [issue #218](https://github.com/CMSC495-GROUP3/Sourcebook/issues/218) / [PR #219](https://github.com/CMSC495-GROUP3/Sourcebook/pull/219).

## Rob

**Owns, per the README.** Corpus availability and the passage index. The README used to say Robert; the name used here is Rob.

**What `main` shows.**

- Merged: [PR #150](https://github.com/CMSC495-GROUP3/Sourcebook/pull/150) / [issue #89](https://github.com/CMSC495-GROUP3/Sourcebook/issues/89), keep the live corpus available during re-ingestion (`8e8c36e`).
- Open: [PR #176](https://github.com/CMSC495-GROUP3/Sourcebook/pull/176) / [issue #158](https://github.com/CMSC495-GROUP3/Sourcebook/issues/158), unique `(source, chunk_index)` index. Not in the merged counts.
- Reviews: [PR #181](https://github.com/CMSC495-GROUP3/Sourcebook/pull/181) (requested the NaN rejection, then approved) and [PR #171](https://github.com/CMSC495-GROUP3/Sourcebook/pull/171).

## Gavin

**Owns, per the README.** React components, design, and styling, with Dominick.

**What GitHub shows on this snapshot.** Zero author commits, zero pull requests, zero `reviewed-by` results. Assigned on the design and frontend issues [#41](https://github.com/CMSC495-GROUP3/Sourcebook/issues/41) through [#53](https://github.com/CMSC495-GROUP3/Sourcebook/issues/53), plus [#83](https://github.com/CMSC495-GROUP3/Sourcebook/issues/83), [#159](https://github.com/CMSC495-GROUP3/Sourcebook/issues/159), [#174](https://github.com/CMSC495-GROUP3/Sourcebook/issues/174), [#189](https://github.com/CMSC495-GROUP3/Sourcebook/issues/189), and [#192](https://github.com/CMSC495-GROUP3/Sourcebook/issues/192). One issue comment, on [#41](https://github.com/CMSC495-GROUP3/Sourcebook/issues/41).

The merged open-book implementation on `main` is [PR #161](https://github.com/CMSC495-GROUP3/Sourcebook/pull/161) (Taylor). This row does not treat that merge as Gavin's commit history. Gavin should replace this paragraph with the work he wants the papers to cite.

## Dominick

**Owns, per the README.** React components, design, and styling, with Gavin.

**What GitHub shows on this snapshot.** Zero author commits, zero pull requests, zero reviews, and no issue comments found under `fudgepop01`. Assigned on the same design and frontend cluster ([#41](https://github.com/CMSC495-GROUP3/Sourcebook/issues/41)–[#53](https://github.com/CMSC495-GROUP3/Sourcebook/issues/53), [#84](https://github.com/CMSC495-GROUP3/Sourcebook/issues/84), [#159](https://github.com/CMSC495-GROUP3/Sourcebook/issues/159), [#174](https://github.com/CMSC495-GROUP3/Sourcebook/issues/174)). Same rule as Gavin's row: assignment is not authorship. Dominick should edit this row.

## What this page does not establish

- Work that exists only in a fork, a classroom write-up, or a chat is not listed.
- Review counts are pull requests GitHub marks `reviewed-by`, not every comment.
- Open PRs and issues are cited as ownership, not as merged evidence.
- The seven-name `git shortlog` goal in [issue #209](https://github.com/CMSC495-GROUP3/Sourcebook/issues/209) is met for everyone who has commits on `main`. It is not met for Gavin and Dominick until they have author commits, which this PR does not invent.
