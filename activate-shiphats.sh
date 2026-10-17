#!/usr/bin/env bash
# The inert starter has no agency-specific values or secrets to interpolate.
set -eu
cd "$(dirname "$0")"
force=0
keep=0
for arg in "$@"; do
  case "$arg" in
    --force) force=1 ;;
    --keep-inert) keep=1 ;;
    --non-interactive) : ;;
    *) echo "Unknown argument: $arg" >&2; exit 1 ;;
  esac
done
if [ -f .gitlab-ci.yml ] && [ "$force" -eq 0 ]; then
  echo 'Refusing to overwrite .gitlab-ci.yml; pass --force.' >&2
  exit 1
fi
cp .gitlab-ci.yml.shiphats .gitlab-ci.yml
if [ "$keep" -eq 0 ]; then rm .gitlab-ci.yml.shiphats; fi
printf '%s\n' 'Activated LOCAL QUALITY GATES ONLY.' \
  'Before SHIP-HATS use: configure agency templates, compliance policy, masked scanner variables,' \
  'protected branches, code owners, registry, signing, container smoke tests and gated promotion.'
