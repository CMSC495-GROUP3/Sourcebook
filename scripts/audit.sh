#!/usr/bin/env bash
# Scan both dependency trees for known vulnerabilities. `make audit` and the
# Security workflow run this same script, so an exception lives in one place.
#
# Usage: ./scripts/audit.sh            (from the repo root, with .venv set up)
set -euo pipefail

cd "$(dirname "$0")/.."

# Advisories accepted for now. Each entry needs a reason and a way out. The
# list is empty since python-jose (and its unfixable ecdsa advisory,
# PYSEC-2026-1325) was replaced with PyJWT.
IGNORED_ADVISORIES=()

# ${arr[@]+"${arr[@]}"} expands to nothing for an empty array without
# tripping `set -u` on the bash 3.2 that macOS ships.
ignore_flags=()
for advisory in ${IGNORED_ADVISORIES[@]+"${IGNORED_ADVISORIES[@]}"}; do
  ignore_flags+=(--ignore-vuln "$advisory")
done

pip_audit="${PIP_AUDIT:-.venv/bin/pip-audit}"
if [[ ! -x "$pip_audit" ]]; then
  pip_audit="pip-audit"
fi

echo "== Python"
"$pip_audit" \
  -r requirements/dev.txt \
  --progress-spinner off ${ignore_flags[@]+"${ignore_flags[@]}"}

echo "== npm"
(cd web && npm audit --audit-level=high)
