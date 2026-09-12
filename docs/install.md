# Installation

Three routes, one page. Use this if you have never run the project. The
[README](../README.md) and [CONTRIBUTING.md](../CONTRIBUTING.md) keep the
longer procedures; this page does not repeat them.

| Route | When to use it | Paid key needed |
| --- | --- | --- |
| [1. Reviewer stub](#1-reviewer-with-nothing-configured) | look at the UI, login, refusal, and escalation path | no |
| [2. Real services](#2-real-services) | judge retrieval quality, ingest, or call the provider | yes |
| [3. Deployment](#3-deployment) | run the Compose stack on a host | yes |

Never commit `.env`, an API key, a bcrypt hash, or a real policy document.

## 1. Reviewer with nothing configured

No cloud account, no `.env`, no paid key. This runs the real application
against a fake model and an in-memory database.

Prerequisites: Python 3.11+, Node 22+, and `make`. Docker is not required.

```bash
git clone https://github.com/CMSC495-GROUP3/Sourcebook.git
cd Sourcebook
make setup    # .venv, Python deps, npm install
make stub     # terminal 1: API on :8000
make web      # terminal 2: React on :5173
```

Open <http://localhost:5173> and sign in with the password `dev`.

`make stub` hashes `dev` at start (override with `DEV_PASSWORD=...`) and
launches `scripts/loadtest/server.py`, which patches the real app from
outside. What is fake:

- **Model.** Every answer is the same canned PTO text. Follow-ups are canned.
  Retrieval scores are fixed, so every question answers or every question
  refuses. `make stub REFUSE=1` flips it to refuse, which is how you see the
  refusal card and the escalation control.
- **Database.** Conversations, escalations, and caches live in memory and
  vanish when the API stops.
- **Vector search.** Canned passages. Atlas Vector Search does not run here.

Do not use this mode to judge retrieval quality or to tune
`SIMILARITY_THRESHOLD`. The fake embeddings are noise.

Same commands, shorter: [README Quick start](../README.md#quick-start) and
[CONTRIBUTING, ten minutes](../CONTRIBUTING.md#ten-minutes-to-a-running-app).

### Native Windows

The `Makefile` already branches on `OS=Windows_NT`: the venv tools are
`.venv/Scripts` instead of `.venv/bin`, the interpreter default is `py -3`,
and `make help` is a PowerShell one-liner. Git Bash also sets
`OS=Windows_NT`, so `setup` uses a Make `wildcard` check rather than
`if not exist` — see the comment on that target.

CONTRIBUTING's real-services one-liners still show the Unix
`.venv/bin/python` form. On a Windows venv the interpreter is
`.venv\Scripts\python.exe`.

A native Windows stub walk-through has not been signed off on this page.
That check is pending human validation.

## 2. Real services

Needed for anything that touches retrieval quality, ingestion, or the
provider. Prerequisites are an OpenAI API key, a MongoDB Atlas deployment
with Vector Search, an S3 bucket, and AWS credentials that can read and
write that bucket. Docker is required only for `make compose`.

Do not paste secret values into issues, pull requests, or this file.
Copy `.env.example` to `.env` and fill the names below in an editor.

```bash
cp .env.example .env
```

The API refuses to start without `JWT_SECRET_KEY`, `MONGODB_URI`, and
`APP_PASSWORD_HASH`. Generate the signing secret and the password hash as
in the README [Configure](../README.md#1-configure) section. A bcrypt hash
contains `$`; paste it with an editor, not `echo`. How a second password
(`APP_PASSWORD_HASH_2`) behaves is also there — read it before handing one
out.

Then load the sample corpus and create the Atlas Vector Search index named
`vector_index` (the driver cannot create a search index). Commands and the
index JSON: README [Load the corpus](../README.md#2-load-the-corpus).
CONTRIBUTING's [real-services](../CONTRIBUTING.md#running-against-the-real-services)
section is the shorter checklist.

Run it either way:

| Mode | Command | URL |
| --- | --- | --- |
| Dev (hot reload) | `uvicorn sourcebook.api.main:app --reload` plus `make web` | API <http://localhost:8000>, UI <http://localhost:5173>, OpenAPI <http://localhost:8000/docs> |
| Full stack | `make compose` or `docker compose up --build` | <http://localhost>, health <http://localhost/api/health> |

Compose does not publish the API port. With `SITE_ADDRESS` unset, Caddy
serves plain HTTP on localhost.

### Environment variables

Every name `.env.example` sets or documents, listed once. Values and
defaults live in that file and in `sourcebook/rag/config.py`. This table
names them only.

#### Required to boot the API

| Name | What it is for | Where it comes from |
| --- | --- | --- |
| `JWT_SECRET_KEY` | signs login tokens | generate locally (`openssl rand -hex 32`) |
| `MONGODB_URI` | Atlas connection string | Atlas cluster |
| `APP_PASSWORD_HASH` | bcrypt hash of the shared login password | generate locally; see README Configure |
| `MONGODB_DB` | database name | you choose; `.env.example` suggests one |

#### Required to call the provider and ingest

| Name | What it is for | Where it comes from |
| --- | --- | --- |
| `LLM_PROVIDER` | which `LLMProvider` subclass to use | `sourcebook/rag/llm.py`; only `openai` ships |
| `OPENAI_API_KEY` | provider credentials | OpenAI |
| `S3_BUCKET_NAME` | raw document bucket | AWS |
| `AWS_ACCESS_KEY_ID` | S3 access | AWS IAM |
| `AWS_SECRET_ACCESS_KEY` | S3 secret | AWS IAM |
| `AWS_REGION` | S3 region | AWS |

#### Optional host settings

| Name | What it is for | Where it comes from |
| --- | --- | --- |
| `APP_PASSWORD_HASH_2` | second accepted password hash | generate the same way as `APP_PASSWORD_HASH` |
| `SITE_ADDRESS` | public hostname Caddy serves and gets a certificate for | DNS; leave unset for local Compose |
| `APP_ENV` | environment label; `LLM_PROVIDER=fake` refuses to start when this is `production` | operator |
| `CORS_ORIGINS` | comma-separated origins allowed in local development | you |
| `APP_NAME` | product name (also change `web/src/config.ts` and `web/index.html`) | you |
| `ESCALATION_CONTACT` | label shown when handing a question to a person | you |
| `ESCALATION_WEBHOOK_URL` | optional JSON webhook for each escalation | Slack/Teams incoming webhook, or empty |
| `ESCALATION_WEBHOOK_TIMEOUT_SECONDS` | webhook HTTP timeout | operator |
| `ESCALATION_WEBHOOK_MAX_ATTEMPTS` | initial attempt plus authenticated retries | operator |
| `ESCALATION_WEBHOOK_LEASE_SECONDS` | claim lease; must exceed the webhook timeout | operator |

#### Optional provider, retrieval, and capacity knobs

Defaults live in `sourcebook/rag/config.py` and `sourcebook/rag/llm.py`.
Leave them unset unless you are changing a default.

| Name | What it is for |
| --- | --- |
| `OPENAI_ANSWER_MODEL` | grounded-answer model |
| `OPENAI_UTILITY_MODEL` | rewrite and follow-up model |
| `OPENAI_EMBEDDING_MODEL` | ingestion and query embeddings; changing it changes vector dimensions |
| `OPENAI_TIMEOUT_SECONDS` | idle timeout per provider call |
| `OPENAI_MAX_RETRIES` | SDK retries |
| `OPENAI_STREAM_DEADLINE_SECONDS` | wall-clock bound on a trickling stream |
| `OPENAI_MAX_CONCURRENT_REQUESTS` | in-flight provider cap |
| `OPENAI_CAPACITY_WAIT_SECONDS` | how long to wait for a provider slot |
| `MONGO_MAX_POOL_SIZE` | connections held per process; see `sourcebook/rag/mongo.py` |
| `SIMILARITY_THRESHOLD` | refuse when the best passage scores below this; tune from `query_logs`, never from the stub |
| `RETRIEVAL_K` | passages fed to the model |
| `CHUNK_SIZE` | ingestion chunk length |
| `CHUNK_OVERLAP` | ingestion overlap |
| `THREADPOOL_TOKENS` | chat stream thread pool; measured in [load-testing.md](load-testing.md) |
| `LOGIN_THREADPOOL_TOKENS` | dedicated login pool so bcrypt still answers when chat is saturated |
| `CHAT_RATE_LIMIT` | per-address chat cap |
| `REINDEX_RATE_LIMIT` | per-address reindex cap |

#### Stub-only names in `.env.example`

These belong to `make stub` / the fake provider, not a real-service host.

| Name | What it is for |
| --- | --- |
| `FAKE_STREAM_DELAY_MS` | fake answer token delay |
| `FAKE_UTILITY_DELAY_MS` | fake utility-call delay |

`make stub` also sets `FAKE_PASSAGE_SCORE` and `FAKE_DB_LATENCY_MS` itself.
Compose sets `FORWARDED_ALLOW_IPS` in `docker-compose.yml`; do not put `*`
in the host `.env`. The deploy timer reads `AUTO_DEPLOY_MAX_FAILURES` from
the environment on the host (`scripts/auto_deploy.sh`); it is not in
`.env.example`.

## 3. Deployment

The pilot is the same Compose file as local `make compose`, plus
`SITE_ADDRESS` so Caddy can fetch a Let's Encrypt certificate. The host
setup — Elastic IP, DNS, security group, clone path, timer units, root-disk
resize, deploy checks, and changing the public name — is in the README
[Deployment](../README.md#deployment) section. Do not follow this route
from memory; use that page.

What this route is, in order:

1. Configure `.env` as in [Real services](#2-real-services), then set
   `SITE_ADDRESS` to the public hostname. Caddy obtains the certificate on
   the first request once DNS already points at the instance. Details:
   [Certificates and the public address](../README.md#certificates-and-the-public-address).
2. `docker compose up -d --build`. Only Caddy publishes ports 80 and 443.
3. Enable the auto-deploy and docker-prune systemd timers. The instance
   polls upstream `main` and rebuilds only what changed. Path table,
   health probe, and failure cap: [Automatic deploys](../README.md#automatic-deploys).
4. Hosts that already run the older timer need the one-time
   `refs/deployed/main` seed before the retry-aware script's first tick:
   [Upgrading an existing install](../README.md#upgrading-an-existing-install).

After editing `.env` on the host, recreate the affected service yourself;
the timer only reacts to git. `scripts/deploy.sh` starts the same unit over
SSH when two minutes is too long. Neither script is a substitute for
reading the README first.

A production-host walk-through of this route has not been signed off on
this page. That check is pending human validation.

## Related

| Read | For |
| --- | --- |
| [README Quick start](../README.md#quick-start) | the same stub commands in the project intro |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | checks, conventions, and the things that bite |
| [`.env.example`](../.env.example) | the comments behind every name above |
| [docs/README.md](README.md) | the rest of `docs/` |
| [evaluation.md](evaluation.md) | scoring the live system after real services are up |
