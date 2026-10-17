#!/usr/bin/env bash
set -euo pipefail
[ -d node_modules ] || npm install
exec npm run dev
