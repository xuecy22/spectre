#!/usr/bin/env bash
# x-post.sh - 发推文
# Usage: x-post.sh "tweet content" [--media image_path]

set -euo pipefail

# 检查环境变量
if [[ -z "${X_API_BEARER_TOKEN:-}" ]]; then
  echo '{"error": "X_API_BEARER_TOKEN not set"}' >&2
  exit 1
fi

# 解析参数
CONTENT=""
MEDIA_PATH=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --media)
      MEDIA_PATH="$2"
      shift 2
      ;;
    *)
      CONTENT="$1"
      shift
      ;;
  esac
done

if [[ -z "$CONTENT" ]]; then
  echo '{"error": "Tweet content is required"}' >&2
  exit 1
fi

# 构建请求体
REQUEST_BODY=$(jq -n --arg text "$CONTENT" '{text: $text}')

# 调用 X API v2
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "https://api.twitter.com/2/tweets" \
  -H "Authorization: Bearer ${X_API_BEARER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$REQUEST_BODY")

# 分离响应体和状态码
HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

# 检查状态码
if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 300 ]]; then
  echo "$HTTP_BODY"
  exit 0
else
  echo "$HTTP_BODY" >&2
  exit 1
fi
