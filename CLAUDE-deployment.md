# CLAUDE-deployment.md — Container Contract & Inert SHIP-HATS Pipeline (§10)

Adopted from `wshyang/greenfield` `GREENFIELD.md §10`.

## 10.1 Sandbox Container Contract

- `Dockerfile`: Multi-stage build using pinned `node:22.12.0-alpine3.20`, deterministic `npm ci --ignore-scripts`, static bundle serving on `0.0.0.0:3000`, numeric non-root user `USER 1001:1001`, and `HEALTHCHECK`.
- `Dockerfile.dev`: Cloud development container preserving the `viper-agent/` contract (`PORT=3000`, `VIPER_APP_PORT=3001`, `VIPER_AGENT_PORT=9111`, numeric non-root user `1001`).
- `Dockerfile.cloudflared`: Pinned `cloudflare/cloudflared:2024.12.2` running `tunnel --no-autoupdate run`.
- `.dockerignore`: Excludes `.git`, `node_modules`, `dist`, `.env*`, while keeping `viper-agent/` permitted.

## 10.2–10.4 Inert SHIP-HATS Pipeline & Bash 3.2 Scripts

- Inert pipeline templates (`*.shiphats`) live in the repository from day one:
  - `.gitlab-ci.yml.shiphats`
  - `.gitlab/ci/pipeline.gitlab-ci.yml.shiphats`
  - `sonar-project.properties.shiphats`
  - `.gitlab/CODEOWNERS.shiphats`
  - `.gitlab/merge_request_templates/Default.md.shiphats`
- `activate-shiphats.sh` is Bash 3.2-compatible, supports `--non-interactive`, `--force`, and `--keep-inert`, validates all `@@SHIPHATS_*@@` placeholders before writing, and is verified by automated tests in a scratch directory.
