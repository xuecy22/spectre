#!/usr/bin/env bash
# db-query.sh — SQLite query helper
# Usage: db-query.sh "SELECT * FROM metrics ORDER BY measured_at DESC LIMIT 5"
#
# Executes a read-only SQL query against the Spectre database.

set -euo pipefail

DB_PATH="${SPECTRE_DB_PATH:-data/spectre.db}"

if [ $# -eq 0 ]; then
  echo "Usage: db-query.sh \"SQL query\"" >&2
  echo "" >&2
  echo "Tables: wakes, posts, metrics, interactions, wake_snapshots" >&2
  echo "" >&2
  echo "Examples:" >&2
  echo "  db-query.sh \"SELECT * FROM posts ORDER BY posted_at DESC LIMIT 5\"" >&2
  echo "  db-query.sh \"SELECT * FROM metrics ORDER BY measured_at DESC LIMIT 5\"" >&2
  echo "  db-query.sh \"SELECT * FROM wake_snapshots ORDER BY timestamp DESC LIMIT 3\"" >&2
  echo "  db-query.sh \".schema\"" >&2
  exit 1
fi

if ! command -v sqlite3 &>/dev/null; then
  echo "Error: sqlite3 not found. Install it first." >&2
  exit 1
fi

if [ ! -f "$DB_PATH" ]; then
  echo "Error: Database not found at $DB_PATH" >&2
  exit 1
fi

QUERY="$1"

# Execute query in read-only mode with headers and column mode
sqlite3 -readonly -header -column "$DB_PATH" "$QUERY"
