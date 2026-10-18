#!/usr/bin/env bash
# Activate the inert SHIP-HATS files by rendering @@SHIPHATS_*@@ placeholders.
# Bash 3.2 compatible: no associative arrays, no line-array reads, no case-lowering expansions.
set -eu
cd "$(dirname "$0")"

INTERACTIVE=1
FORCE=0
KEEP_INERT=0
for argument in "$@"; do
  case "$argument" in
    --non-interactive) INTERACTIVE=0 ;;
    --force) FORCE=1 ;;
    --keep-inert) KEEP_INERT=1 ;;
    -h|--help)
      printf '%s\n' "Usage: ./activate-shiphats.sh [--non-interactive] [--force] [--keep-inert]"
      exit 0
      ;;
    *) printf '%s\n' "Unknown option: $argument" >&2; exit 2 ;;
  esac
done

FILES=".gitlab-ci.yml.shiphats .gitlab/ci/pipeline.gitlab-ci.yml.shiphats .gitlab/CODEOWNERS.shiphats .gitlab/merge_request_templates/Default.md.shiphats"

ask() {
  name=$1
  default=$2
  if [ "$INTERACTIVE" -eq 0 ]; then
    eval "value=\${SHIPHATS_$name:-$default}"
    printf '%s' "$value"
    return 0
  fi
  printf '%s [%s]: ' "$name" "$default" >&2
  read -r answer
  if [ -z "$answer" ]; then answer=$default; fi
  printf '%s' "$answer"
}

PROJECT_PATH=$(ask PROJECT_PATH "group/project")
DEFAULT_BRANCH=$(ask DEFAULT_BRANCH "main")
NEXUS_DOCKER=$(ask NEXUS_DOCKER "nexus-docker.ship.gov.sg")
NEXUS_NPM=$(ask NEXUS_NPM "https://nexus.ship.gov.sg/repository/npm-proxy/")
CF_LEVEL=$(ask CF_LEVEL "4")
TEMPLATES_REF=$(ask TEMPLATES_REF "v1.1.12")

# Render everything into a scratch directory before writing anything.
SCRATCH=$(mktemp -d)
trap 'rm -rf "$SCRATCH"' EXIT
for file in $FILES; do
  if [ ! -f "$file" ]; then
    printf '%s\n' "Missing inert file: $file" >&2
    exit 1
  fi
  target=$SCRATCH/$file
  mkdir -p "$(dirname "$target")"
  sed \
    -e "s|@@SHIPHATS_PROJECT_PATH@@|$PROJECT_PATH|g" \
    -e "s|@@SHIPHATS_DEFAULT_BRANCH@@|$DEFAULT_BRANCH|g" \
    -e "s|@@SHIPHATS_NEXUS_DOCKER@@|$NEXUS_DOCKER|g" \
    -e "s|@@SHIPHATS_NEXUS_NPM@@|$NEXUS_NPM|g" \
    -e "s|@@SHIPHATS_CF_LEVEL@@|$CF_LEVEL|g" \
    -e "s|@@SHIPHATS_TEMPLATES_REF@@|$TEMPLATES_REF|g" \
    "$file" > "$target"
  if grep -q '@@SHIPHATS_' "$target"; then
    printf '%s\n' "Unknown placeholder remains in $file" >&2
    grep -o '@@SHIPHATS_[A-Z_]*@@' "$target" | sort -u >&2
    exit 1
  fi
done

for file in $FILES; do
  output=${file%.shiphats}
  if [ -e "$output" ] && [ "$FORCE" -eq 0 ]; then
    printf '%s\n' "Refusing to overwrite $output (use --force)" >&2
    exit 1
  fi
  cp "$SCRATCH/$file" "$output"
  printf '%s\n' "Activated $output"
done

if [ "$KEEP_INERT" -eq 0 ]; then
  for file in $FILES; do rm -f "$file"; done
  printf '%s\n' "Removed inert copies (use --keep-inert to retain them)."
fi

cat <<'NOTES'
Configure these in GitLab, not in files:
  CI/CD variables : CF_LEVEL, SONAR_PROJECTKEY, SONAR_TOKEN, NEXUS_IQ_APP_ID,
                    NEXUS_IQ_USERNAME, NEXUS_IQ_PASSWORD, COSIGN_PASSWORD, FOD_PAT
  Compliance      : Pipeline Execution Policy from the WOG Security Policy Project
  Branch rules    : owners manage approval rules; protect the default branch
  Access          : HTTPS needs a PAT or SSH key; tokens expire within 180 days
NOTES
