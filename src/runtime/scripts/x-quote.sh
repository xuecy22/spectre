#!/usr/bin/env bash
# x-quote.sh - 引用转发
# Usage: x-quote.sh <tweet_id> "comment"

set -euo pipefail

if [[ -z "${X_API_BEARER_TOKEN:-}" ]]; then
  echo '{"error": "X_API_BEARER_TOKEN not set"}' >&2
  exit 1
fi

TWEET_ID="${1:-}"
COMMENT="${2:-}"

if [[ -z "$TWEET_ID" || -z "$COMMENT" ]]; then
  echo '{"error": "Usage: x-quote.sh <tweet_id> \"comment\""}' >&2
  exit 1
fi

QUOTE_URL="https://twitter.com/i/web/status/${TWEET_ID}"

REQUEST_BODY=$(jq -n \
  --arg text "$COMMENT" \
  --arg url "$QUOTE_URL" \
  '{text: $text, quote_tweet_id: $url}')

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "https://api.twitter.com/2/tweets" \
  -H "Authorization: Bearer ${X_API_BEARER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$REQUEST_BODY")

HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 300 ]]; then
  echo "$HTTP_BODY"
  exit 0
else
  echo "$HTTP_BODY" >&2
  exit 1
fi
