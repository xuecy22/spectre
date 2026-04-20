#!/usr/bin/env bash
# x-mentions.sh - 获取提及/通知
# Usage: x-mentions.sh [--max-results N]

set -euo pipefail

if [[ -z "${X_API_BEARER_TOKEN:-}" ]]; then
  echo '{"error": "X_API_BEARER_TOKEN not set"}' >&2
  exit 1
fi

if [[ -z "${X_USER_ID:-}" ]]; then
  echo '{"error": "X_USER_ID not set"}' >&2
  exit 1
fi

MAX_RESULTS=10

while [[ $# -gt 0 ]]; do
  case $1 in
    --max-results)
      MAX_RESULTS="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "https://api.twitter.com/2/users/${X_USER_ID}/mentions?max_results=${MAX_RESULTS}&tweet.fields=created_at,public_metrics,author_id,in_reply_to_user_id" \
  -H "Authorization: Bearer ${X_API_BEARER_TOKEN}")

HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 300 ]]; then
  echo "$HTTP_BODY"
  exit 0
else
  echo "$HTTP_BODY" >&2
  exit 1
fi
