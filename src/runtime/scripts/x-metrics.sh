#!/usr/bin/env bash
# x-metrics.sh - 获取账号指标和帖子 engagement 数据
# Usage: x-metrics.sh [--tweet-id ID]

set -euo pipefail

if [[ -z "${X_API_BEARER_TOKEN:-}" ]]; then
  echo '{"error": "X_API_BEARER_TOKEN not set"}' >&2
  exit 1
fi

if [[ -z "${X_USER_ID:-}" ]]; then
  echo '{"error": "X_USER_ID not set"}' >&2
  exit 1
fi

TWEET_ID=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --tweet-id)
      TWEET_ID="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

if [[ -n "$TWEET_ID" ]]; then
  # 获取单条推文的 engagement 数据
  RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
    "https://api.twitter.com/2/tweets/${TWEET_ID}?tweet.fields=public_metrics,created_at,organic_metrics" \
    -H "Authorization: Bearer ${X_API_BEARER_TOKEN}")
else
  # 获取账号级别指标
  RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
    "https://api.twitter.com/2/users/${X_USER_ID}?user.fields=public_metrics,created_at,description" \
    -H "Authorization: Bearer ${X_API_BEARER_TOKEN}")
fi

HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 300 ]]; then
  echo "$HTTP_BODY"
  exit 0
else
  echo "$HTTP_BODY" >&2
  exit 1
fi
