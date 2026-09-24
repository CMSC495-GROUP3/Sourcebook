# Beta performance benchmark against the real services

The same bounded workload as the alpha, against the deployed pilot with
OpenAI, Atlas, Caddy, Nginx, rate limits, and provider bounds all on. The
protocol, the caps, and the targets are unchanged and are in
[../v0.1.0-alpha.1/live-benchmark.md](../v0.1.0-alpha.1/live-benchmark.md).
The alpha's result is the before.

Status: **Pending.** The run needs an operator with the reviewer password,
from a machine that can reach the pilot.

## Running it

```bash
python scripts/loadtest/live_benchmark.py --help   # flags and the defaults the alpha used
```

Run it with the alpha's defaults (8 requests at most, a burst of 3, stop after
2 errors), then save the sanitized output as `live-benchmark-results.json`
beside this page and fill the tables below. Record the deployed commit from
`refs/deployed/main` on the host.

## Results

| Field | Value |
| --- | --- |
| Date (UTC) | Pending |
| Deployed commit | Pending |
| Operator | Pending |

| Target | Agreed | Alpha, `4352966` | Beta |
| --- | --- | --- | --- |
| Generated time to first token, p50 | ≤ 4.0s | 1.21s, pass | Pending |
| Generated total, max | ≤ 30.0s | 4.69s, pass | Pending |
| Cached time to first token, max | ≤ 1.5s | 0.04s, pass | Pending |
| Refused total, max | ≤ 3.0s | 0.31s, pass | Pending |
| Error rate | 0.0 | 0.00, pass | Pending |

The refused path now includes the coverage judge from PR #253 whenever the
cosine gate clears, so a refusal of that kind makes one utility-model call
that the alpha's refusals did not. The refusal step asks "What is the boiling
point of mercury at sea level?", which scored 59% against the 0.62 threshold
in the alpha's browser pass, so it is expected to refuse at the cosine gate
without that call. Record the refused time either way; if it is slower than
the alpha's, say whether the judge ran.
