# Load test against the deployed pilot

**Status: Pending.** The run happens on the `v1.0.0` candidate after the
Monday 28 September freeze
([plan on #215](https://github.com/CMSC495-GROUP3/Sourcebook/issues/215#issuecomment-5824613941),
issue [#212](https://github.com/CMSC495-GROUP3/Sourcebook/issues/212)). This
page holds the protocol now so the run is mechanical; every figure below stays
Pending until it is measured.

## What this measures, and what it does not

Three measurements answer different questions:

| Page | System | Load | Answers |
| --- | --- | --- | --- |
| [load-testing.md](load-testing.md) | laptop, model faked, database in memory, limiter off | up to 320 concurrent | where the thread pool saturates |
| `live-benchmark.md` in each release folder | the deployed pilot, real model | 7 or 8 requests, a burst of 3 | whether each path works for one user |
| this page | the deployed pilot, real model | a few concurrency levels, 80 requests at most | what the deployed system sustains under concurrent load |

The capacity claim for 10,000 users rests on the synthetic page's
multiplication. This run replaces that with a measured figure for the
deployed system. It does not measure 10,000 users: the pilot is one small
instance with one API worker, and a paid model makes a large run a budget
decision rather than a test.

## Mode: the real model, capped

#212 offers two modes. This run uses the real OpenAI model with a hard cap on
requests, because it measures what a pilot user waits for. The other mode, a
second Compose profile with `LLM_PROVIDER=fake`, would measure the server
without the provider, but the fake provider refuses to start with
`APP_ENV=production`, and its embeddings make every retrieval score noise.

| Setting | Value | Why |
| --- | --- | --- |
| Levels | 5, 10, 20, 40 concurrent | 75 requests in all |
| Request cap | 80 (`--max-requests`) | the script refuses to start if the levels add up to more |
| Estimated cost | about $0.75 at $0.01 a generation | confirmed at the prompt before any request |
| Error stop | 5 errors in a level ends the run | a failing system is not measured by more load |
| Questions | the 8 answerable questions `live_benchmark.py` uses, each virtual user in its own session | known to retrieve a policy |

## Settings that decide the result

Four pilot settings shape the numbers. Record each one as it was during the
run, in the table under Results.

- **`CHAT_RATE_LIMIT`**, default `30/minute`, is per client address. From
  one client it would cap the whole run at 30 requests a minute, so the run
  window raises it and restores it afterwards. A 429 is counted apart from
  errors.
- **`CACHE_ENABLED`**. The answer cache serves a repeated first-turn
  question without a model call. With the cache on, most of this run would
  measure cache hits, so the window turns it off and every request generates.
  That is the worst case, as in the synthetic page's Finding 1.
- **`OPENAI_MAX_CONCURRENT_REQUESTS`**, default 20, with
  `OPENAI_CAPACITY_WAIT_SECONDS` of 1. Past 20 concurrent generations, the
  extra requests wait a second for a slot, then get HTTP 503 with
  `Retry-After` (provider busy). The 40 level is expected to show this. It is
  the provider bound doing its job, and the script lists those failures as
  `HTTP 503`, apart from any other error.
- **One API worker, `THREADPOOL_TOKENS` 100.** The API container runs a
  single uvicorn worker. Leave both unchanged: they are what the pilot runs.

## Running it

Two people or two shells: one on the pilot host, one on a client outside it.
Pick a time when nobody else is using the pilot.

**1. On the host, open the window.**

```bash
cd ~/Sourcebook
sudo systemctl stop auto-deploy.timer          # no redeploy mid-run
git rev-parse refs/deployed/main               # record: the deployed SHA
cp .env .env.before-load-test
printf '\nCHAT_RATE_LIMIT=600/minute\nCACHE_ENABLED=0\n' >> .env
docker compose up -d api                       # recreate the API with the window settings
scripts/loadtest/host_stats.sh 2 > /tmp/pilot-load-host.csv
```

Leave the sampler running.

**2. On the client, run the levels.**

```bash
BENCH_PASSWORD=... ./.venv/bin/python -m scripts.loadtest.pilot_load \
  --url https://sourcebook.duckdns.org --levels 5 10 20 40 \
  --deployed-sha <sha from step 1> --client-location "<where>" \
  --setting CHAT_RATE_LIMIT=600/minute --setting CACHE_ENABLED=0 \
  --out docs/releases/v1.0.0/evidence/pilot-load.json
```

The script asks for confirmation with the request count and the estimated
cost, then prints one line per level and the results table.

**3. On the host, close the window.** Do this even if the run failed.

```bash
# Ctrl-C the sampler, then:
mv .env.before-load-test .env
docker compose up -d api
sudo systemctl start auto-deploy.timer
curl -fsS https://sourcebook.duckdns.org/api/health
```

Ask one question in the browser to confirm the pilot answers with the cache
back on.

**4. Commit the evidence.** Commit the JSON report, then copy the host
samples to `docs/releases/v1.0.0/evidence/pilot-load-host.csv`. Neither
holds a password, token, or answer text. Check the CSV's container names
before committing it.

## Results

Pending.

| Field | Value |
| --- | --- |
| Date (UTC) | Pending |
| Deployed commit | Pending |
| Client location | Pending |
| `CHAT_RATE_LIMIT` during the run | Pending |
| `CACHE_ENABLED` during the run | Pending |
| `OPENAI_MAX_CONCURRENT_REQUESTS` | Pending |
| API workers, `THREADPOOL_TOKENS` | Pending |
| Report | Pending: `releases/v1.0.0/evidence/pilot-load.json` |

Paste the table the script prints:

| Concurrent | Completed | Generated / cached / refused | 429 | Errors | req/s | TTFT p50 | TTFT p95 | Total p50 | Total p95 |
| ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 5 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| 10 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| 20 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| 40 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |

Host during the run, from the sampler:

| Measure | Value |
| --- | --- |
| API container CPU, peak | Pending |
| API container memory, peak | Pending |
| 1-minute load average, peak | Pending |
| Samples | Pending: `releases/v1.0.0/evidence/pilot-load-host.csv` |

## What the result means

Pending. After the run, say in plain terms:

- the highest level with no errors, and its requests per second and TTFT p95
- where failures started and of what kind (`HTTP 503`, provider busy, at 40
  is the expected first one)
- how the measured requests per second compare with the synthetic page's
  83 req/s target, and what that says about the 10,000-user claim for this
  deployment
- what the release's "does not establish" section should now say
