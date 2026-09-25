# Load-test harness

`server.py` runs the app with its external services stubbed and `run.py` drives
it. `live_benchmark.py` and `pilot_load.py` run against the deployed pilot with
the real model, capped; `host_stats.sh` samples the host while they do. The measurements and the reasoning behind `THREADPOOL_TOKENS` are in
[docs/load-testing.md](../../docs/load-testing.md).
