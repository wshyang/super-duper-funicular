#!/bin/bash
# Bash 3.2-compatible SHIP-HATS activator per GREENFIELD.md §10.3 & §10.4
set -eu

NON_INTERACTIVE=0
FORCE_OVERWRITE=0
KEEP_INERT=0
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

while [ $# -gt 0 ]; do
  case "$1" in
    --non-interactive)
      NON_INTERACTIVE=1
      ;;
    --force)
      FORCE_OVERWRITE=1
      ;;
    --keep-inert)
      KEEP_INERT=1
      ;;
    --root)
      shift
      ROOT_DIR="$1"
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
  shift
done

prompt_or_env() {
  var_name="$1"
  default_val="$2"
  prompt_label="$3"
  eval "current_val=\${$var_name:-}"
  if [ -n "$current_val" ]; then
    printf "%s" "$current_val"
    return 0
  fi
  if [ "$NON_INTERACTIVE" -eq 1 ]; then
    printf "%s" "$default_val"
    return 0
  fi
  printf "%s [%s]: " "$prompt_label" "$default_val" >&2
  read -r user_input || user_input=""
  if [ -z "$user_input" ]; then
    printf "%s" "$default_val"
  else
    printf "%s" "$user_input"
  fi
}

PROJECT_NAME="$(prompt_or_env SHIPHATS_PROJECT_NAME "super-duper-funicular" "SHIP-HATS project name")"
AGENCY_NAMESPACE="$(prompt_or_env SHIPHATS_AGENCY_NAMESPACE "govtech/sprite-motion" "SHIP-HATS agency group namespace")"
SONAR_PROJECT_KEY="$(prompt_or_env SHIPHATS_SONAR_PROJECT_KEY "govtech_super_duper_funicular" "SonarQube project key")"
CODEOWNER_HANDLE="$(prompt_or_env SHIPHATS_CODEOWNER_HANDLE "@wshyang" "GitLab CODEOWNERS handle")"

INERT_FILES="
.gitlab-ci.yml.shiphats
.gitlab/ci/pipeline.gitlab-ci.yml.shiphats
sonar-project.properties.shiphats
.gitlab/CODEOWNERS.shiphats
.gitlab/merge_request_templates/Default.md.shiphats
"

for rel_inert in $INERT_FILES; do
  src_file="$ROOT_DIR/$rel_inert"
  if [ ! -f "$src_file" ]; then
    echo "Missing inert template: $src_file" >&2
    exit 1
  fi
  dest_rel="${rel_inert%.shiphats}"
  dest_file="$ROOT_DIR/$dest_rel"
  if [ -f "$dest_file" ] && [ "$FORCE_OVERWRITE" -eq 0 ]; then
    echo "Refusing to overwrite existing active file: $dest_file (use --force)" >&2
    exit 1
  fi
  rendered="$(sed \
    -e "s|@@SHIPHATS_PROJECT_NAME@@|$PROJECT_NAME|g" \
    -e "s|@@SHIPHATS_AGENCY_NAMESPACE@@|$AGENCY_NAMESPACE|g" \
    -e "s|@@SHIPHATS_SONAR_PROJECT_KEY@@|$SONAR_PROJECT_KEY|g" \
    -e "s|@@SHIPHATS_CODEOWNER_HANDLE@@|$CODEOWNER_HANDLE|g" \
    "$src_file")"
  if printf "%s" "$rendered" | grep -q '@@SHIPHATS_'; then
    echo "Unresolved placeholder found in $src_file" >&2
    exit 1
  fi
done

for rel_inert in $INERT_FILES; do
  src_file="$ROOT_DIR/$rel_inert"
  dest_rel="${rel_inert%.shiphats}"
  dest_file="$ROOT_DIR/$dest_rel"
  mkdir -p "$(dirname "$dest_file")"
  sed \
    -e "s|@@SHIPHATS_PROJECT_NAME@@|$PROJECT_NAME|g" \
    -e "s|@@SHIPHATS_AGENCY_NAMESPACE@@|$AGENCY_NAMESPACE|g" \
    -e "s|@@SHIPHATS_SONAR_PROJECT_KEY@@|$SONAR_PROJECT_KEY|g" \
    -e "s|@@SHIPHATS_CODEOWNER_HANDLE@@|$CODEOWNER_HANDLE|g" \
    "$src_file" > "$dest_file"
  if [ "$KEEP_INERT" -eq 0 ]; then
    rm -f "$src_file"
  fi
done

echo "SHIP-HATS pipeline files activated in $ROOT_DIR"
echo "Required GitLab CI/CD settings (configure in GitLab UI):"
echo "  - CF_LEVEL=4"
echo "  - SONAR_PROJECTKEY=$SONAR_PROJECT_KEY"
echo "  - Masked variables: SONAR_TOKEN, NEXUS_IQ_USERNAME, NEXUS_IQ_PASSWORD, COSIGN_PASSWORD, FOD_PAT"
