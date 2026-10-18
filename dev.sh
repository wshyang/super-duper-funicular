#!/bin/bash
# Bash 3.2-compatible one-command local dev script per GREENFIELD.md §9 & §10.4
set -eu

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

if [ ! -d "node_modules" ]; then
  npm install
fi

npm run pipeline

if [ "${1:-}" = "--check-only" ]; then
  npm run typecheck
  npm test
  exit 0
fi

exec npm run dev
