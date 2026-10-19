#!/usr/bin/env bash
#
# One-shot pose-material run: audit -> harvest -> demo -> verify -> report.
# Stops at the first failure. Every step writes a machine-readable artifact so
# the report can be re-derived without re-rendering.
#
# Usage:
#   bash .claude/skills/harvest-pose-material/scripts/run-pipeline.sh [--skip-demo] [--report=<path>]
#
# Environment:
#   PR1_ROOT    path to the PR #1 worktree            (default /tmp/pr1)
#   DEMO_DIR    output directory for the cycle render (default /tmp/pose-material-demo)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"
SKILL_DIR="${SCRIPT_DIR}/.."
PR1_ROOT="${PR1_ROOT:-/tmp/pr1}"
DEMO_DIR="${DEMO_DIR:-/tmp/pose-material-demo}"
REPORT="${REPORT:-docs/POSE_MATERIAL_RUN.md}"
SKIP_DEMO=0

for arg in "$@"; do
  case "${arg}" in
    --skip-demo) SKIP_DEMO=1 ;;
    --report=*) REPORT="${arg#*=}" ;;
    *) echo "Unknown argument: ${arg}" >&2; exit 2 ;;
  esac
done

cd "${REPO_ROOT}"
echo "== repo   ${REPO_ROOT} ($(git rev-parse --short HEAD))"
echo "== pr1    ${PR1_ROOT} $( [ -d "${PR1_ROOT}" ] && echo '(mounted)' || echo '(MISSING - corpus will be 19 sources)' )"

echo "== [1/4] audit"
npm run --silent pose-material:audit -- --pr1-root="${PR1_ROOT}"

echo "== [2/4] harvest"
npm run --silent pose-material:harvest -- --pr1-root="${PR1_ROOT}"

if [ "${SKIP_DEMO}" -eq 1 ]; then
  echo "== [3/4] demo skipped"
  VERIFY_ARGS=(--skip-demo)
else
  echo "== [3/4] demo"
  npm run --silent pose-material:demo -- "${DEMO_DIR}"
  VERIFY_ARGS=()
fi

echo "== [4/4] verify"
npx tsx "${SKILL_DIR}/scripts/verify-run.ts" "${VERIFY_ARGS[@]}"

npx tsx "${SKILL_DIR}/scripts/summarize-run.ts" --out="${REPORT}"

echo
echo "Run complete. Inspect ${DEMO_DIR}/contact-sheet-material.png before accepting."
