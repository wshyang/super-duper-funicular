#!/usr/bin/env bash
# activate-shiphats.sh — render the inert *.shiphats files into live GitLab CI
# (GREENFIELD §10.3). Bash 3.2 compatible: no associative arrays, no mapfile,
# no ${var,,}; possibly-empty arrays expanded as ${a[@]+"${a[@]}"}.
set -eu

cd "$(dirname "$0")" || exit 1

NON_INTERACTIVE=0
KEEP_INERT=0
FORCE=0
OUT_DIR="."
if [ $# -gt 0 ]; then OUT_DIR="$1"; fi
for arg in "$@"; do
  case "$arg" in
    --non-interactive) NON_INTERACTIVE=1 ;;
    --keep-inert) KEEP_INERT=1 ;;
    --force) FORCE=1 ;;
  esac
done

INERT_FILES=".gitlab-ci.yml .gitlab/ci/pipeline.gitlab-ci.yml sonar-project.properties .gitlab/CODEOWNERS .gitlab/merge_request_templates/Default.md"

ask() {
  # ask NAME PROMPT DEFAULT
  name="$1"; prompt="$2"; default="$3"
  existing=$(printenv "SHIPHATS_$name" 2>/dev/null || true)
  if [ -n "$existing" ]; then printf '%s\n' "$existing"; return; fi
  if [ "$NON_INTERACTIVE" -eq 1 ]; then printf '%s\n' "$default"; return; fi
  printf '%s [%s]: ' "$prompt" "$default" >/dev/tty
  read -r answer </dev/tty || answer=""
  if [ -z "$answer" ]; then printf '%s\n' "$default"; else printf '%s\n' "$answer"; fi
}

VALUES=""
collect() {
  gitlab_url=$(ask GITLAB_URL "GitLab Dedicated URL" "https://sgts.gitlab-dedicated.com")
  templates_ref=$(ask TEMPLATES_REF "SHIP-HATS templates release tag" "v1.1.12")
  cf_level=$(ask CF_LEVEL "Compliance level (1-4)" "4")
  registry=$(ask REGISTRY "Container registry host" "nexus-docker.ship.gov.sg")
  image_name=$(ask IMAGE_NAME "Image repository name" "stride-harmonised-lab")
  VALUES="SHIPHATS_GITLAB_URL=$gitlab_url
SHIPHATS_TEMPLATES_REF=$templates_ref
SHIPHATS_CF_LEVEL=$cf_level
SHIPHATS_REGISTRY=$registry
SHIPHATS_IMAGE_NAME=$image_name"
}

render_one() {
  src="$1"; dst="$2"
  content=$(cat "$src.shiphats")
  for pair in $VALUES; do
    key=${pair%%=*}
    val=${pair#*=}
    content=$(printf '%s' "$content" | sed "s|@@${key}@@|$val|g")
  done
  if printf '%s' "$content" | grep -q '@@SHIPHATS_'; then
    echo "refusing to write $dst: unknown placeholder remains" >&2
    exit 1
  fi
  printf '%s\n' "$content" >"$dst"
}

main() {
  collect
  rendered=""
  for base in $INERT_FILES; do
    [ -f "$base.shiphats" ] || continue
    target="$OUT_DIR/$base"
    mkdir -p "$(dirname "$target")"
    if [ -e "$target" ] && [ "$FORCE" -ne 1 ]; then
      echo "refusing to overwrite existing $target (use --force)" >&2
      exit 1
    fi
    rendered="$rendered $target"
  done
  for base in $INERT_FILES; do
    [ -f "$base.shiphats" ] || continue
    target="$OUT_DIR/$base"
    render_one "$base" "$target"
  done
  if [ "$KEEP_INERT" -ne 1 ]; then
    for base in $INERT_FILES; do rm -f "$base.shiphats"; done
  fi
  cat <<'NOTES'
Rendered. Remaining settings live in GitLab, not in files:
- CI/CD variables (masked): SONAR_TOKEN, NEXUS_IQ_USERNAME, NEXUS_IQ_PASSWORD, COSIGN_PASSWORD, FOD_PAT
- Project CI/CD variables: CF_LEVEL, SONAR_PROJECTKEY, NEXUS_IQ_APP_ID
- Compliance framework from the WOG Security Policy Project; branch protection; code owners.
NOTES
  echo "rendered:${rendered}"
}

main
