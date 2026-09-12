# Documentation

Narrative docs live here. Setup and usage are in the [README](../README.md),
development in [CONTRIBUTING.md](../CONTRIBUTING.md), and reporting a
vulnerability in [SECURITY.md](../SECURITY.md).

| Page | What it covers |
| --- | --- |
| [team.md](team.md) | individual contributions, mailmapped identities, and the row each member checks |
| [design.md](design.md) | the paper-and-ink design system for `web/`: tokens, type, layout, motion, and the mark |
| [evaluation.md](evaluation.md) | the labeled question sets in `evaluation/`, the metrics, and how to run the live evaluation |
| [load-testing.md](load-testing.md) | synthetic throughput measurements from `scripts/loadtest/` and the `THREADPOOL_TOKENS` decision |
| [releases/](releases/) | one folder per tagged release |

## Releases

Each release folder holds the handoff that names the verified commit, the
release notes used as the GitHub release body, the measurements taken against
the deployed system, and the evidence behind them.

| Release | Handoff | Notes |
| --- | --- | --- |
| [v0.1.0-alpha.1](https://github.com/CMSC495-GROUP3/Sourcebook/releases/tag/v0.1.0-alpha.1) | [handoff.md](releases/v0.1.0-alpha.1/handoff.md) | [release-notes.md](releases/v0.1.0-alpha.1/release-notes.md) |

## Conventions

- Lowercase kebab-case file names. `README.md` is used only as a folder index.
- Release material goes under `releases/<tag>/`, with screenshots and logs in
  its `evidence/` folder, numbered in the order the steps ran.
- Brand source images live in `../assets/brand/`; the served copies are in
  `web/public/`.
