# Continuous integration, delivery, and release evidence

Sourcebook uses five GitHub Actions workflows and a timer-driven deployment on
the pilot host. This page explains what starts each path, what it proves, and
what it does **not** prove. The final `v1.0.0` evidence belongs under
`docs/releases/v1.0.0/evidence/`; the labeled placeholders below must be
replaced only with evidence from the commit that is actually tagged.

## Integration path at a glance

```text
pull request
  |-- CI -------------------- test, lint, build, Compose, acceptance
  |-- Security -------------- CodeQL, advisories, dependency review, secrets
  |-- PR checks ------------- title and description contract
  `-- PR path labels -------- metadata-only area labels
             |
             v
        review + merge
             |
             v
    origin/main moves
             |
             v
  systemd timer -> auto_deploy.sh -> selective Compose rebuild/recreate
             |                         |
             |                         `-- health probe fails: do not advance
             v
  refs/deployed/main advances only after a successful probe

Live evaluation is a separate, manual measurement against real services.
```

The protected-branch gate is the aggregate check named **CI status**. It
requires every job in the CI workflow to report `success`, including jobs that
could otherwise be skipped. Security and human review remain separate signals;
a green CI badge alone is not permission to merge or proof of answer quality.

## CI

Workflow: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) ·
[Actions history](https://github.com/CMSC495-GROUP3/Sourcebook/actions/workflows/ci.yml)

**Trigger.** Every pull request, every push to `main`, and a manual
`workflow_dispatch`. A newer run on the same ref cancels the older one.

**What it gates.** The final `CI status` job succeeds only when all of these
jobs succeed:

- Ruff lint and format checks, plus regeneration checks for the committed
  Python lock files.
- Pytest with an 80% coverage floor on Python 3.11, 3.12, 3.13, and 3.14. The
  3.12 run always retains coverage and JUnit artifacts for 14 days; failing
  matrix versions retain them too.
- Synthetic fail-closed checks for the Live evaluation result validator.
- Validation of the smoke and full evaluation datasets.
- ESLint, TypeScript, and the Vite production build. A successful push to
  `main` retains `web-dist` for seven days.
- API and web Docker builds, an API import smoke test, provider construction,
  Compose validation, and the live Caddy-to-Nginx-to-Uvicorn proxy-chain
  acceptance test.
- Secret/generated-file guards, ShellCheck, the auto-deploy synthetic suite,
  Hadolint, and Actionlint.

The workflow needs no project secrets, so it also runs on pull requests from
forks. Locally, `make check` covers the main test, lint, and build path; Docker
and repository checks add evidence that exists only in CI.

> **FINAL EVIDENCE PENDING — `v1.0.0`:** Add a screenshot of the green CI run
> for the exact tagged commit as
> `docs/releases/v1.0.0/evidence/ci-green.png`, then link the workflow run and
> record its full SHA here.

## Security

Workflow: [`.github/workflows/security.yml`](../.github/workflows/security.yml) ·
[Actions history](https://github.com/CMSC495-GROUP3/Sourcebook/actions/workflows/security.yml)

**Trigger.** Every pull request, every push to `main`, Mondays at 06:17 UTC,
and a manual `workflow_dispatch`. A newer run on the same ref cancels the older
one.

**What it checks.** CodeQL analyzes Python and JavaScript/TypeScript using the
`security-and-quality` query set. Dependency audits check the locked Python and
npm trees. Pull requests additionally receive GitHub dependency review, which
rejects newly introduced advisories at high severity or above. A pinned,
checksum-verified Gitleaks CLI scans the full Git history for leaked secrets.

Security is deliberately separate from CI so that a newly published upstream
advisory can appear in the scheduled workflow without turning an unrelated
change into a false claim about its code. A finding still requires triage; a
green CI run does not override it.

> **FINAL EVIDENCE PENDING — `v1.0.0`:** Add a screenshot of the green Security
> run for the tagged commit as
> `docs/releases/v1.0.0/evidence/security-green.png`, link the run, and record
> any accepted advisory disposition rather than hiding it. Because dependency
> review runs only on pull requests, also link its successful check from the
> final release-candidate PR; the tagged commit's push run cannot reproduce
> that PR-only gate.

## PR checks

Workflow: [`.github/workflows/pr-checks.yml`](../.github/workflows/pr-checks.yml) ·
[Actions history](https://github.com/CMSC495-GROUP3/Sourcebook/actions/workflows/pr-checks.yml)

**Trigger.** Pull requests when opened, edited, synchronized, reopened, or
marked ready for review. A newer metadata run for the same PR cancels the older
one.

**What it gates.** The title must follow `type: what changed`, using one of the
repository's accepted change types and a lower-case subject. Except for
Dependabot PRs, the body must retain `## What and why` and contain real prose
before `## How to check it`. These checks validate review metadata; they do not
test the implementation.

> **FINAL EVIDENCE PENDING — `v1.0.0`:** Capture the successful PR checks on
> the final release PR as
> `docs/releases/v1.0.0/evidence/pr-checks-green.png` and link that PR here.

## PR path labels

Workflow: [`.github/workflows/pr-labels.yml`](../.github/workflows/pr-labels.yml) ·
[Actions history](https://github.com/CMSC495-GROUP3/Sourcebook/actions/workflows/pr-labels.yml)

**Trigger.** Pull requests when opened, synchronized, or reopened.

**What it does.** GitHub's labeler applies and synchronizes area labels from
the changed-file metadata. Because `pull_request_target` supplies a token that
can update PR metadata, this workflow intentionally uses the base branch's
configuration, does not check out the proposed branch, and never imports or
executes PR content. Labels help route review; this workflow is not a code or
merge gate.

> **FINAL EVIDENCE PENDING — `v1.0.0`:** Capture the successful label workflow
> and the resulting labels on the final release PR as
> `docs/releases/v1.0.0/evidence/pr-path-labels-green.png`.

## Live evaluation

Workflow: [`.github/workflows/evaluation.yml`](../.github/workflows/evaluation.yml) ·
[Actions history](https://github.com/CMSC495-GROUP3/Sourcebook/actions/workflows/evaluation.yml) ·
[method and metric definitions](evaluation.md)

**Trigger.** A maintainer starts `workflow_dispatch` and selects the `smoke` or
`full` tier. The job uses the protected `evaluation` environment because it
calls the real model provider and MongoDB Atlas and therefore costs money and
needs secrets.

**What it measures.** The job validates its required configuration, temporarily
admits the GitHub runner's address to the Atlas project, runs the labeled set,
validates the produced metrics, removes the temporary address after a completed
admission step even when later evaluation fails, and retains the results
artifact for 90 days. Empty secrets, a nonzero evaluator exit, missing results,
or malformed metrics fail closed. If admission creates an entry but is
interrupted or times out before returning its address, the cleanup step cannot
identify that entry; an Atlas operator must verify and remove it.

This workflow reports measurements; it is not the protected merge gate. A
green job means the evaluator exited successfully and its result structure
passed validation. Human review of the cited passages, ambiguous cases, and
prompt-injection behavior is still required before publishing quality claims.

> **FINAL EVIDENCE PENDING — `v1.0.0`:** After the final full-tier run, add a
> screenshot as `docs/releases/v1.0.0/evidence/live-evaluation-green.png`, link
> the run and retained artifact, record the tagged SHA and dataset tier, and
> link the human-reviewed metrics. Do not substitute a smoke run or a workflow
> badge for that evidence.

## From merge to the pilot containers

The pilot uses polling rather than a deployment webhook. The systemd unit
[`scripts/systemd/auto-deploy.timer`](../scripts/systemd/auto-deploy.timer)
starts [`auto-deploy.service`](../scripts/systemd/auto-deploy.service) two
minutes after boot and every two minutes thereafter. The oneshot service runs
[`scripts/auto_deploy.sh`](../scripts/auto_deploy.sh) as `ubuntu`, waits for
network and Docker, and has a 15-minute start timeout. A separate weekly timer
prunes the Docker build cache while retaining 300 MB; the deploy script also
prunes when the root filesystem has less than 1 GiB free.

Each deploy tick follows this sequence:

1. Take a non-blocking `flock` on the checkout, so a manual deployment cannot
   overlap the timer.
2. Refuse to run unless the checkout is on `main`, then fetch `origin/main`.
3. Refuse to continue if the checkout has tracked or untracked local changes,
   then compare upstream with `refs/deployed/main`, the last commit
   whose deployment passed health verification. `HEAD` is not the success
   marker because it is fast-forwarded before the build completes.
4. If the ref already matches upstream, probe `/api/health` anyway. An idle
   tick therefore remains red while the running stack is unhealthy.
5. Diff the successful commit against the new upstream tip and select work:

   | Changed input | Deployment action |
   | --- | --- |
   | `sourcebook/`, `requirements/`, or API `Dockerfile` | build and recreate `api` |
   | `web/` | build and recreate `web` |
   | `docker-compose.yml` | build both images and allow Compose to recreate affected services, including Caddy |
   | `Caddyfile` | reload Caddy in place |
   | anything else | health-check and advance the deployed ref without rebuilding containers |

6. Fast-forward the host checkout, build selected services with refreshed base
   images, and recreate them with `--no-deps` so an API- or web-only change does
   not restart Caddy.
7. Probe `/api/health` through the web container every two seconds for up to 60
   seconds. This exercises Nginx, Uvicorn, and the connection between them.
8. Only after a successful probe, prune unused dangling images and advance
   `refs/deployed/main`. A build, Compose, reload, or health failure leaves the
   ref behind so the same change is retried on the next tick.

Failures are counted per target SHA in `.git/auto-deploy-failures`. After five
consecutive failures by default (`AUTO_DEPLOY_MAX_FAILURES`), later ticks stay
red but skip another expensive rebuild. Setting the limit to `0` allows
unbounded retries. Deleting `refs/deployed/main` clears the retry state and
forces both images to rebuild on the next tick.

The health gate prevents a failed attempt from advancing `refs/deployed/main`,
but it does not automatically restore the previous containers. Recovery still
requires a corrected `main` or an operator action. Changes made only in the
host's `.env` are also outside the Git diff and therefore do not select a
service for rebuild or recreation; those require an explicit operator-driven
service recreation.

[`scripts/deploy.sh`](../scripts/deploy.sh) is the on-demand route. It connects
over SSH, starts the same systemd service, prints only that invocation's
journal, and returns the deployment status. It does not deploy a tag or an
arbitrary branch; the deployment script always follows `origin/main`.

> **FINAL EVIDENCE PENDING — real `v1.0.0` deployment:** Store a sanitized
> journal excerpt as `docs/releases/v1.0.0/evidence/auto-deploy-journal.txt`
> and a screenshot as
> `docs/releases/v1.0.0/evidence/auto-deploy-green.png`. The excerpt must show
> the target SHA, selected services, healthy Compose state, and successful
> completion. Remove host addresses, usernames, environment values, tokens,
> and credentials. Only an authorized pilot-host operator can supply this
> evidence.

## Checking a deployment

Follow the README's [Checking a deploy](../README.md#checking-a-deploy)
procedure. It verifies all three of these boundaries:

1. the public site serves HTTPS and `/api/health` returns 200;
2. the Compose networks fall within the proxy's trusted pools and the API has
   the expected forwarded-address setting; and
3. a forged `X-Forwarded-For` value is discarded while the API logs the real
   external client address.

The deployed commit is the host's `refs/deployed/main`. Record that full SHA
beside the verification evidence; the public site follows `main` and may move
past a release tag later.

## Tag and release path

The repository currently has an alpha release. The final `v1.0.0` tag does
**not** exist merely because this page describes its procedure. The final path
is:

1. Prepare `docs/releases/v1.0.0/` with the handoff, release notes,
   measurements, and evidence index. Leave commit- and run-specific fields
   visibly pending.
2. Merge the final release PR to `main` through the normal CI, Security, and
   review gates.
3. Choose that verified `main` commit, record its full SHA, and confirm the CI
   and Security runs attached to the same SHA are green. Complete the live and
   deployment evidence without overstating their scope.
4. Create and push an **annotated** `v1.0.0` tag on that exact commit. Create
   the GitHub release from `docs/releases/v1.0.0/release-notes.md` so the
   repository and release page use the same account of the release.
5. Open a follow-up documentation PR against `main` that writes the immutable
   tagged SHA, tag/release URL, workflow-run URLs, screenshot links, and
   sanitized deployment-journal link back into this page and the final handoff.
   That documentation commit comes after the tag and is not part of the tagged
   artifact; it records evidence about it.

Before the tag is pushed, verify that the tag target—not merely the newest
`main` at the time someone reads the page—is the commit covered by every final
claim. A later deployment can move past it; the tag remains the reproducible
portfolio artifact.

> **FINAL EVIDENCE PENDING — release:** Replace this note in the follow-up PR
> with the annotated tag URL, GitHub release URL, full tagged SHA, final release
> PR, and links to the exact CI, Security, Live evaluation, and deployment
> evidence described above.
