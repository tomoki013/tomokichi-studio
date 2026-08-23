#!/usr/bin/env bash
#
# Smoke test for Remeet's three API surfaces, in the order they matter after a
# deploy: health, invitations, moderation, reports.
#
# Run it against a local dev server before deploying, and against production
# straight after:
#
#   pnpm dev &                                   # http://localhost:8787
#   ./scripts/remeet-smoke.sh http://localhost:8787
#   ./scripts/remeet-smoke.sh https://api.tmkch.io
#
# What it deliberately does *not* do:
#
#   * create a real CKShare — that needs two iCloud accounts and a device, and
#     is covered by the manual checks in Remeet's docs/invite-flow.md;
#   * send a real report — that produces mail and an object in R2. The report
#     route is checked for reachability and for refusing a malformed body, and
#     the full E2E stays the deliberate manual step in docs/ugc-safety.md.
#
# What it does check is the thing a deploy can break: that each route is
# wired, answers the shape it should, and — for the invitation change in this
# release — that an invitation is consumed by the first resolve and refuses a
# second joiner.
set -uo pipefail

BASE="${1:-http://localhost:8787}"
CLIENT_KEY="${REMEET_INVITE_CLIENT_KEY:-e7537cab8122e1ddf56125f966c340da2e33017774bcaa81}"
SHARE_URL="https://www.icloud.com/share/0smoketestsmoketestsmoketest"

pass=0
fail=0

check() {
  local label="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    printf '  \033[32mok\033[0m   %-52s %s\n' "$label" "$actual"
    pass=$((pass + 1))
  else
    printf '  \033[31mFAIL\033[0m %-52s expected %s, got %s\n' "$label" "$expected" "$actual"
    fail=$((fail + 1))
  fi
}

status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

echo "Remeet API smoke test — $BASE"
echo

echo "health"
check "GET /api/v1/health" 200 "$(status "$BASE/api/v1/health")"

echo
echo "moderation"
# 404 until the first manifest is published, and that is correct: an absence is
# not the same claim as an empty list. The app treats both the same way — it
# changes nothing and keeps every tombstone it already has.
manifest_status="$(status "$BASE/remeet/v1/moderation/manifest.json")"
case "$manifest_status" in
  200|404) printf '  \033[32mok\033[0m   %-52s %s\n' "GET manifest.json (200 published / 404 not yet)" "$manifest_status"; pass=$((pass + 1)) ;;
  *)       printf '  \033[31mFAIL\033[0m %-52s expected 200 or 404, got %s\n' "GET manifest.json" "$manifest_status"; fail=$((fail + 1)) ;;
esac
# The operator routes must be shut to anybody without the token. An unset
# REMEET_MODERATION_ADMIN_TOKEN closes them rather than opening them, so 403 is
# the right answer whether or not the secret has been set yet.
check "POST actions without a token" 403 \
  "$(status -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/remeet/v1/moderation/actions")"
check "POST actions with a wrong token" 403 \
  "$(status -X POST -H 'Authorization: Bearer wrong' -H 'Content-Type: application/json' -d '{}' "$BASE/remeet/v1/moderation/actions")"
check "PUT manifest without a token" 403 \
  "$(status -X PUT -H 'Content-Type: application/json' -d '{}' "$BASE/remeet/v1/moderation/manifest")"

if [ -n "${REMEET_MODERATION_TOKEN:-}" ]; then
  check "POST actions with the token (empty body → 400)" 400 \
    "$(status -X POST -H "Authorization: Bearer $REMEET_MODERATION_TOKEN" -H 'Content-Type: application/json' -d '{}' "$BASE/remeet/v1/moderation/actions")"
else
  printf '  \033[33mskip\033[0m %s\n' "authenticated moderation routes (set REMEET_MODERATION_TOKEN)"
fi

echo
echo "reports"
# 403 where `REMEET_INVITE_CLIENT_KEY` is configured — production — and 400
# where it is not, because an unset key deliberately lets traffic through so the
# key can be rotated without locking out builds already in people's hands
# (`fromRemeet`). A local dev server usually has no key, so both are correct;
# what would be wrong is a 2xx.
reports_unkeyed="$(status -X POST "$BASE/remeet/v1/reports")"
case "$reports_unkeyed" in
  403) printf '  \033[32mok\033[0m   %-52s %s (client key enforced)\n' "POST reports without the client key" "$reports_unkeyed"; pass=$((pass + 1)) ;;
  400) printf '  \033[32mok\033[0m   %-52s %s (no client key set on this env)\n' "POST reports without the client key" "$reports_unkeyed"; pass=$((pass + 1)) ;;
  *)   printf '  \033[31mFAIL\033[0m %-52s expected 403 or 400, got %s\n' "POST reports without the client key" "$reports_unkeyed"; fail=$((fail + 1)) ;;
esac
check "POST reports with a malformed body" 400 \
  "$(status -X POST -H "X-Remeet-Client: $CLIENT_KEY" -F 'report=not-json' "$BASE/remeet/v1/reports")"

echo
echo "invitations — single consumption"
created="$(curl -s -X POST -H "X-Remeet-Client: $CLIENT_KEY" -H 'Content-Type: application/json' \
  -d "{\"ckShareUrl\":\"$SHARE_URL\"}" "$BASE/remeet/v1/invites")"
token="$(printf '%s' "$created" | sed -n 's/.*"inviteUrl":"[^"]*\/\([^"\/]*\)".*/\1/p')"
management="$(printf '%s' "$created" | sed -n 's/.*"managementToken":"\([^"]*\)".*/\1/p')"

if [ -z "$token" ]; then
  printf '  \033[31mFAIL\033[0m %-52s %s\n' "POST /remeet/v1/invites" "$created"
  fail=$((fail + 1))
else
  printf '  \033[32mok\033[0m   %-52s minted\n' "POST /remeet/v1/invites"
  pass=$((pass + 1))

  first="$(curl -s -X POST -H "X-Remeet-Client: $CLIENT_KEY" -H 'Content-Type: application/json' \
    -d "{\"token\":\"$token\",\"resolveAttemptId\":\"smoke-attempt-a\"}" "$BASE/remeet/v1/invites/resolve")"
  case "$first" in
    *"$SHARE_URL"*) printf '  \033[32mok\033[0m   %-52s share URL returned\n' "first resolve (attempt A)"; pass=$((pass + 1)) ;;
    *) printf '  \033[31mFAIL\033[0m %-52s %s\n' "first resolve (attempt A)" "$first"; fail=$((fail + 1)) ;;
  esac

  # The whole point of migration 0006: a forwarded link is refused.
  second="$(curl -s -X POST -H "X-Remeet-Client: $CLIENT_KEY" -H 'Content-Type: application/json' \
    -d "{\"token\":\"$token\",\"resolveAttemptId\":\"smoke-attempt-b\"}" "$BASE/remeet/v1/invites/resolve")"
  case "$second" in
    *INVITE_UNAVAILABLE*) printf '  \033[32mok\033[0m   %-52s refused\n' "second resolve, different attempt (B)"; pass=$((pass + 1)) ;;
    *) printf '  \033[31mFAIL\033[0m %-52s expected INVITE_UNAVAILABLE, got %s\n' "second resolve, different attempt (B)" "$second"; fail=$((fail + 1)) ;;
  esac

  # And the ordinary case a naive single-use rule would break.
  retry="$(curl -s -X POST -H "X-Remeet-Client: $CLIENT_KEY" -H 'Content-Type: application/json' \
    -d "{\"token\":\"$token\",\"resolveAttemptId\":\"smoke-attempt-a\"}" "$BASE/remeet/v1/invites/resolve")"
  case "$retry" in
    *"$SHARE_URL"*) printf '  \033[32mok\033[0m   %-52s still works\n' "retry from the same attempt (A)"; pass=$((pass + 1)) ;;
    *) printf '  \033[31mFAIL\033[0m %-52s expected the share URL, got %s\n' "retry from the same attempt (A)" "$retry"; fail=$((fail + 1)) ;;
  esac

  # Clean up after ourselves so the smoke test leaves no live invitation.
  if [ -n "$management" ]; then
    revoked="$(status -X POST -H "X-Remeet-Client: $CLIENT_KEY" -H 'Content-Type: application/json' \
      -d "{\"token\":\"$token\",\"managementToken\":\"$management\"}" "$BASE/remeet/v1/invites/revoke")"
    check "revoke the smoke-test invitation" 200 "$revoked"
  fi
fi

echo
if [ "$fail" -eq 0 ]; then
  printf '\033[32m%d passed\033[0m\n' "$pass"
  exit 0
fi
printf '\033[31m%d failed\033[0m, %d passed\n' "$fail" "$pass"
exit 1
