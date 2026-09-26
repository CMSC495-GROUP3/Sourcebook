# Final performance benchmark against the real services

The same bounded workload as the alpha and beta, against the deployed pilot
with OpenAI, Atlas, Caddy, Nginx, rate limits, and provider bounds all on. The
protocol, the caps, and the targets are unchanged and are in
[../v0.1.0-alpha.1/live-benchmark.md](../v0.1.0-alpha.1/live-benchmark.md).
The alpha and beta results are the before.

This is a bounded check that the deployed path works for one user and a burst
of three. Load against the deployed system is a separate measurement,
[#212](https://github.com/CMSC495-GROUP3/Sourcebook/issues/212).

Status: **Pending.** The run needs an operator with the reviewer password,
from a machine that can reach the pilot, after the Monday 28 September freeze
has deployed.

## Running it

Run `scripts/loadtest/live_benchmark.py` with the alpha's defaults (8 requests
at most, a burst of 3, stop after 2 errors), then save the sanitized output as
`live-benchmark-results.json` beside this page and fill the tables below.
Record the deployed commit from `HEAD` and `refs/deployed/main` on the host.

## Results

| Field | Value |
| --- | --- |
| Date (UTC) | Pending |
| Deployed commit | Pending |
| Operator | Pending |

| Target | Agreed | Alpha, `4352966` | Beta, `231e652` | Final |
| --- | --- | --- | --- | --- |
| Generated time to first token, p50 | ≤ 4.0s | 1.21s, pass | 1.21s, pass | Pending |
| Generated total, max | ≤ 30.0s | 4.69s, pass | 4.35s, pass | Pending |
| Cached time to first token, max | ≤ 1.5s | 0.04s, pass | 0.04s, pass | Pending |
| Refused total, max | ≤ 3.0s | 0.31s, pass | 0.08s, pass | Pending |
| Error rate | 0.0 | 0.00, pass | 0.00, pass | Pending |
