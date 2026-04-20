#!/usr/bin/env bash
# image-gen.sh - 生成图片（调用 DALL-E 或其他 API）
# Usage: image-gen.sh "prompt" [--output path]

set -euo pipefail

if [[ -z "${OPENAI_API_KEY:-}" ]]; then
  echo '{"error": "OPENAI_API_KEY not set"}' >&2
  exit 1
fi

PROMPT=""
OUTPUT_PATH="generated-image.png"

while [[ $# -gt 0 ]]; do
  case $1 in
    --output)
      OUTPUT_PATH="$2"
      shift 2
      ;;
    *)
      PROMPT="$1"
      shift
      ;;
  esac
done

if [[ -z "$PROMPT" ]]; then
  echo '{"error": "Image prompt is required"}' >&2
  exit 1
fi

# 调用 DALL-E 3 API
REQUEST_BODY=$(jq -n \
  --arg prompt "$PROMPT" \
  '{model: "dall-e-3", prompt: $prompt, n: 1, size: "1024x1024"}')

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "https://api.openai.com/v1/images/generations" \
  -H "Authorization: Bearer ${OPENAI_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$REQUEST_BODY")

HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 300 ]]; then
  # 提取图片 URL
  IMAGE_URL=$(echo "$HTTP_BODY" | jq -r '.data[0].url')

  if [[ "$IMAGE_URL" != "null" && -n "$IMAGE_URL" ]]; then
    # 下载图片
    curl -s -o "$OUTPUT_PATH" "$IMAGE_URL"

    # 返回结果
    echo "$HTTP_BODY" | jq --arg path "$OUTPUT_PATH" '. + {local_path: $path}'
    exit 0
  else
    echo '{"error": "Failed to extract image URL"}' >&2
    exit 1
  fi
else
  echo "$HTTP_BODY" >&2
  exit 1
fi
