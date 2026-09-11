#!/bin/bash
# Add or remove this machine's public IP on a MongoDB Atlas project IP access
# list, through the Atlas Administration API v2 with an API key pair.
#
#   scripts/atlas_access_list.sh add            prints the admitted IP
#   scripts/atlas_access_list.sh remove <ip>    idempotent; a missing entry is fine
#
# Needs ATLAS_PUBLIC_KEY, ATLAS_PRIVATE_KEY, and ATLAS_PROJECT_ID in the
# environment. The key needs the "Project IP Access List Admin" role or
# higher, and if the organization requires an access list for API keys, the
# key's own list must admit the caller (0.0.0.0/0 for a GitHub-hosted runner).
#
# The Live evaluation workflow calls `add` before the paid evaluator and
# `remove` afterwards, even on failure, so a GitHub-hosted runner is on the
# cluster's list only for the minutes it needs. Entries carry a comment naming
# the run, so a leftover from a killed job is easy to spot in the console.
set -euo pipefail

API="https://cloud.mongodb.com/api/atlas/v2"
ACCEPT="application/vnd.atlas.2023-01-01+json"

usage() {
  echo "usage: $0 add | remove <ip>" >&2
  exit 2
}

require_env() {
  local missing=0
  for name in ATLAS_PUBLIC_KEY ATLAS_PRIVATE_KEY ATLAS_PROJECT_ID; do
    if [ -z "${!name:-}" ]; then
      echo "::error::$name is empty; the Atlas access-list step needs it" >&2
      missing=1
    fi
  done
  [ "$missing" -eq 0 ] || exit 1
}

# curl with digest auth; prints the body and puts the HTTP status last.
atlas() {
  curl --silent --show-error --digest \
    --user "${ATLAS_PUBLIC_KEY}:${ATLAS_PRIVATE_KEY}" \
    --header "Accept: ${ACCEPT}" \
    --write-out '\n%{http_code}' \
    "$@"
}

public_ip() {
  local ip
  ip=$(curl --silent --show-error --fail --max-time 10 https://checkip.amazonaws.com \
    || curl --silent --show-error --fail --max-time 10 https://api.ipify.org)
  ip=${ip//[[:space:]]/}
  if ! [[ "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "::error::could not determine this runner's public IPv4 address (got '$ip')" >&2
    exit 1
  fi
  echo "$ip"
}

add() {
  require_env
  local ip comment body status
  ip=$(public_ip)
  comment="github-actions run ${GITHUB_RUN_ID:-local} ($(date -u +%FT%TZ))"
  body=$(atlas --request POST \
    --header "Content-Type: application/json" \
    --data "[{\"ipAddress\":\"${ip}\",\"comment\":\"${comment}\"}]" \
    "${API}/groups/${ATLAS_PROJECT_ID}/accessList")
  status=${body##*$'\n'}
  if [ "$status" != "201" ]; then
    echo "::error::Atlas refused the access-list entry (HTTP $status): ${body%$'\n'*}" >&2
    exit 1
  fi
  # The entry is PENDING until every cloud provider has it; the evaluator
  # would fail its first query in that window.
  local attempt state
  for attempt in $(seq 1 24); do
    body=$(atlas "${API}/groups/${ATLAS_PROJECT_ID}/accessList/${ip}/status")
    state=$(printf '%s' "${body%$'\n'*}" | sed -n 's/.*"STATUS" *: *"\([A-Z]*\)".*/\1/p')
    case "$state" in
      ACTIVE) echo "$ip"; return 0 ;;
      FAILED) echo "::error::Atlas reports the access-list entry for $ip as FAILED" >&2; exit 1 ;;
    esac
    echo "access-list entry for $ip is ${state:-unknown}; waiting (attempt $attempt of 24)" >&2
    sleep 5
  done
  echo "::error::access-list entry for $ip did not become ACTIVE within two minutes" >&2
  exit 1
}

remove() {
  require_env
  local ip=$1 body status
  body=$(atlas --request DELETE "${API}/groups/${ATLAS_PROJECT_ID}/accessList/${ip}")
  status=${body##*$'\n'}
  case "$status" in
    204) echo "removed $ip from the access list" ;;
    404) echo "$ip was not on the access list; nothing to remove" ;;
    *) echo "::error::Atlas did not remove $ip (HTTP $status): ${body%$'\n'*}" >&2; exit 1 ;;
  esac
}

case "${1:-}" in
  add) [ $# -eq 1 ] || usage; add ;;
  remove) [ $# -eq 2 ] || usage; remove "$2" ;;
  *) usage ;;
esac
