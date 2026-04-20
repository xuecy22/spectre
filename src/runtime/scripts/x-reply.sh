#!/usr/bin/env bash
# x-reply.sh - 回复推文（仅限 mention/quote 的回复）
# Usage: x-reply.sh <tweet_id> "reply content"

set -euo pipefail

if [[ -z "${X_API_BEARER_TOKEN:-}" ]]; then
  echo '{"error": "X_API_BEARER_TOKEN not set"}' >&2
  exit 1
fi

TWEET_ID="${1:-}"
CONTENT="${2:-}"

if [[ -z "$TWEET_ID" || -z "$CONTENT" ]]; then
  echo '{"error": "Usage: x-reply.sh <tweet_id> \"reply content\""}' >&2
  exit 1
fi

REQUEST_BODY=$(jq -n \
  --arg text "$CONTENT" \
  --arg reply_to "$TWEET_ID" \
  '{text: $text, reply: {in_reply_to_tweet_id: $reply_to}}')

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
