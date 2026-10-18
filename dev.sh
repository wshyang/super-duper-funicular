#!/usr/bin/env bash
# dev.sh — one-command local environment (GREENFIELD §9). Bash 3.2 compatible:
# no associative arrays, no mapfile, no ${var,,}; empty arrays expanded safely.
set -eu

cd "$(dirname "$0")" || exit 1

log() { printf 'dev.sh: %s\n' "$1"; }

if ! command -v node >/dev/null 2>&1; then
  log "node is required but was not found on PATH"
  exit 1
fi

if [ ! -d node_modules ]; then
  log "installing pinned dependencies (npm ci when a lockfile exists)"
  if [ -f package-lock.json ]; then
    npm ci --no-audit --no-fund
  else
    npm install --no-audit --no-fund
  fi
else
  log "node_modules present; skipping install (delete it to force a clean install)"
fi

log "regenerating reproducible artefacts (extraction + analysis + filmstrips + audit + svg)"
npm run pipeline

log "running the full local gate (typecheck + tests + build)"
npm run validate

log "starting the dev server on 0.0.0.0:3000"
exec npm run dev
