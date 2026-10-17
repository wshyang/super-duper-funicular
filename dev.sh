#!/usr/bin/env bash
# One command from clone to running studio. Bash 3.2 compatible.
set -eu
cd "$(dirname "$0")"

echo "==> Installing pinned dependencies"
npm ci --ignore-scripts

echo "==> Regenerating extracted sprites, manifests and the flaw analysis"
npm run pipeline

echo "==> Tracing every extracted frame to pure SVG"
npm run vectors:build

echo "==> Running the full gate (typecheck, tests, build)"
npm run validate

echo "==> Starting Vite on 0.0.0.0:3000"
exec npm run dev
