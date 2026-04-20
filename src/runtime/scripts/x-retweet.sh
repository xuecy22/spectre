#!/usr/bin/env bash
# x-retweet.sh - 纯转发
# Usage: x-retweet.sh <tweet_id>

set -euo pipefail

if [[ -z "${X_API_BEARER_TOKEN:-}" ]]; then
  echo '{"error": "X_API_BEARER_TOKEN not set"}' >&2
  exit 1
fi

if [[ -z "${X_USER_ID:-}" ]]; then
  echo '{"error": "X_USER_ID not set"}' >&2
  exit 1
fi

TWEET_ID="${1:-}"

if [[ -z "$TWEET_ID" ]]; then
  echo '{"error": "Usage: x-retweet.sh <tweet_id>"}' >&2
  exit 1
fi

REQUEST_BODY=$(jq -n --arg id "$TWEET_ID" '{tweet_id: $id}')

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "https://api.twitter.com/2/users/${X_USER_ID}/retweets" \
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
