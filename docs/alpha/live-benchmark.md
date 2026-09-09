# Alpha performance benchmark against the real services

Unit 5 asks whether the pilot meets minimum acceptable performance. The
existing [load-test results](../../scripts/loadtest/RESULTS.md) answer a
different question. They ran on a laptop with a fake model, an in-memory
database, canned retrieval, and the chat limiter switched off, and they measure
what the thread pool can sustain. This page covers the deployed pilot with
OpenAI, Atlas, Caddy, Nginx, rate limits, and provider bounds all on, on a
sample small enough to stay within a few cents. Tracking issue:
[#183](https://github.com/CMSC495-GROUP3/Sourcebook/issues/183).

Status on 2026-09-09: **protocol and harness ready, run not yet performed.**
The results section below is empty on purpose. Running the benchmark needs the
pilot password and the operator's agreement on the cap; both are recorded on
this page when the run happens.

## What the run does

`scripts/loadtest/live_benchmark.py` logs in once, then sends a scripted
workload over the public address, through Caddy and Nginx to the API, the
same path a user's browser takes. Each request records the path the server
reports in its `done` event next to the path the step expected, so the
results say which code path ran rather than assuming it.

| Step | Question | Expected path | What it checks |
| --- | --- | --- | --- |
| uncached answer | a PTO question with a per-run tag in the text | generated | retrieval, grounding gate, model streaming, follow-up call |
| cached repeat | the identical text in a new session | cached | the answer cache serves a first-turn repeat without a model call |
| follow-up | "Does that change after five years of service?" in the first session | generated | the history path, which pays an extra condense call and skips the cache |
| refusal | a question no policy covers | refused | the grounding gate declines before any model call |
| burst 1..N | N distinct tagged questions at once | generated | a small concurrent load with the limiter on; 429s are counted on their own |

The per-run tag (`[bench <run id>]`) keeps the first ask out of the answer
cache so the run measures a real generation even if someone asked that
question yesterday. The cached repeat sends the same tagged text. The refusal
question is fixed, so a cached refusal still counts as a refusal.

The client holds every stream open through the follow-up event. Hanging up at
`done` is a legitimate client behaviour, but it exercises the
generator-close path that RESULTS.md finding 4 describes rather than the
ordinary one, and this run is about the ordinary one.

## Caps and stop conditions

These are the defaults in the script. The operator can lower them; raising
them needs a reason recorded here.

| Control | Default | Why |
| --- | --- | --- |
| `--max-requests` | 8 | hard cap on chat requests; the plan is trimmed to fit |
| `--burst` | 3 | concurrent uncached questions after the sequential steps |
| `--max-errors` | 2 | stop the sequential steps and skip the burst once this many errors occur |
| `--pause` | 2.0s | gap between sequential requests, so one client stays under `CHAT_RATE_LIMIT` (30/minute) |
| `--cost-per-generation` | $0.01 | the README's estimate; used only for the cost line |

The default run is eight chat requests. Five of them generate, at roughly a
cent each, so a full run is under ten cents. The login route's limit is
10/minute and the script logs in once. Production settings are not changed
for the run; if the burst trips the limiter, the 429s are the result.

## Targets

Proposed targets, to agree with the deployment operator before the run and
to record as agreed or amended here. They describe what a pilot user should
find acceptable, not the 10,000-user requirement, which a run this size
cannot address.

| Target | Limit | Reasoning |
| --- | --- | --- |
| `generated_ttft_p50_s` | 4.0s | median time to first token on the generated path; retrieval plus the provider's first token |
| `generated_total_max_s` | 30.0s | slowest completed generation; the provider timeout is 30s and the stream deadline 90s |
| `cached_ttft_max_s` | 1.5s | a cache hit makes no model call |
| `refused_total_max_s` | 3.0s | a refusal is an embedding call and a vector search, nothing else |
| `error_rate_max` | 0.0 | no failed answers in a run this small; rate limiting is excluded from this rate |

Agreed on: _pending_. Agreed by: _pending_. Amendments: _none_.

A sample of eight cannot support a p95, so the script reports p50 and max
only, with the sample size beside each. Treat a single slow request as a
finding to investigate, not as a percentile.

## Running it

From any machine with the repository's virtualenv. The client's network adds
to every number, so record where it ran.

```bash
BENCH_PASSWORD='the pilot password' ./.venv/bin/python scripts/loadtest/live_benchmark.py \
  --url https://sourcebook.duckdns.org \
  --deployed-sha "$(ssh ubuntu@sourcebook.duckdns.org git -C CMSC495-CAP rev-parse refs/deployed/main)" \
  --client-location 'home, Maryland' \
  --out docs/alpha/live-benchmark-results.json
```

Without `--yes` the script says how many paid requests it will send and asks
before the first one. Without `BENCH_PASSWORD` it prompts, so the password
never lands in shell history. Answer text is not written to the JSON unless
`--keep-answers` is given; the committed results must be the sanitized form.

The script prints two markdown tables at the end. Paste them into the
results section below, together with the fields listed there.

To read the requests from the server side afterwards, the query log has one
row per request. `docs/alpha/handoff.md` links the query-log report work in
#160 / PR #171; until that merges, `docker logs cmsc495-cap-api-1` on the host
shows the refusal and generation lines with their session ids, which all
start with `bench-<run id>`.

## Results

_Not yet run._ When it is, replace this line with the following, in this
order, and commit the sanitized JSON beside this page.

- Date and time (UTC), operator, client location, client platform line from
  the JSON.
- Deployed commit SHA (full), and the non-secret settings in force:
  `THREADPOOL_TOKENS`, `CHAT_RATE_LIMIT`, `OPENAI_TIMEOUT_SECONDS`,
  `OPENAI_MAX_CONCURRENT_REQUESTS`, `SIMILARITY_THRESHOLD`, the chat and
  embedding model names.
- The per-step table from the script.
- The target table from the script, with a sentence for each FAIL and a link
  to the issue that tracks it. Provider-busy responses belong under
  [#118](https://github.com/CMSC495-GROUP3/Sourcebook/issues/118); open a new
  defect only for a failure nothing tracks.
- Rate-limited count and error count, each on its own line.
- Estimated cost from the script, and the measured cost from the OpenAI usage
  page for the run window if the operator can read it.
- Limitations of the run, at minimum: sample size, one client, one network
  location, one point in time.

## What this does and does not establish

A passing run shows that the deployed path works end to end for a single
user and a burst of three, within the agreed limits, on that day. It says
nothing about 10,000 concurrent users. That claim rests on the synthetic
measurements in RESULTS.md plus the caveats listed there, and a pilot run of
this size does not change it either way. The handoff page records the
original requirement, the synthetic evidence, this run, and the gap between
them without redefining the requirement.
