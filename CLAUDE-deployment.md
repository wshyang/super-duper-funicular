# CLAUDE-deployment.md — Container Contract & Inert SHIP-HATS Pipeline (§10)

Adopted from `wshyang/greenfield` `GREENFIELD.md §10` (10.1–10.4).

## 10.1 Sandbox Container Contract

- **`Dockerfile`:** Multi-stage pinned `node:22.12.0-alpine3.20`, `npm ci --ignore-scripts`, `npm run build && npm prune --omit=dev`, `COPY --chown=1001:1001`, static `serve@14.2.4` on `0.0.0.0:3000`, numeric non-root `USER 1001:1001`, `HEALTHCHECK` via `wget`.
- **`Dockerfile.dev`:** Cloud dev image preserving `viper-agent/` contract (`PORT=3000`, `VIPER_APP_PORT=3001`, `VIPER_AGENT_PORT=9111`, numeric `1001`). Keep the agent contract (`COPY viper-agent/`, entrypoint, `PORT=3000`, `VIPER_APP_PORT=3001`) and configure dev server for forwarded `allowedHosts: true` behind HTTPS.
- **`Dockerfile.cloudflared`:** Pinned `cloudflare/cloudflared:2024.12.2`, `tunnel --no-autoupdate run`, `TUNNEL_TOKEN` at runtime only, routes to app service on port 3000.
- **Proxy trust:** Behind the platform's ingress/proxy, trust `X-Forwarded-For/-Proto` **by address** (loopback + link-local + private ranges), not by hop count. "Trust every hop" enables address spoofing; "trust nothing" collapses per-client limits.
- **`.dockerignore`** excludes `.git`, `node_modules`, `dist`, `.env*` while keeping `viper-agent/` permitted.
- **Test the contract:** Feed `ENV` through config loader in a unit test; in CI run the built image as a service and reach it by network alias on 3000; `hadolint` the Dockerfiles.

## 10.2 SHIP-HATS Platform (Research, Oct 2026)

- **Platform:** GitLab Dedicated `sgts.gitlab-dedicated.com` (Ultimate) + SonarQube, Nexus, Fortify on Demand; code up to CONFIDENTIAL (CLOUD-ELIGIBLE) / SENSITIVE-NORMAL.
- **Templates:** `include:` `innersource/sgts/ship-hats/ship-hats-templates` pinned to `v1.1.12` (Rekor decommission 2026-09-30); jobs `build-job`, `deploy-prod-manual-job` / `deploy-final-job`, stages `.pre`, `build`, `test`, `static-test`, `sign`, `runtime-test`, `deploy`.
- **Compliance:** Pipeline Execution Policy from WOG Security Policy Project (since 2026-03); `CF_LEVEL` 1–4, `SONAR_PROJECTKEY`, Nexus IQ / Cosign / FOD vars; runners CStack / `ship_docker` (`_med|_large|_arm`) / GitLab-hosted.

## 10.3 The Discipline — SHIP-HATS Files Inert From Day One

- **Carry pipeline inert:** Every SHIP-HATS file gets `.shiphats` suffix until activation:
  - `.gitlab-ci.yml.shiphats`
  - `.gitlab/ci/pipeline.gitlab-ci.yml.shiphats`
  - `sonar-project.properties.shiphats`
  - `.gitlab/CODEOWNERS.shiphats`
  - `.gitlab/merge_request_templates/Default.md.shiphats`
- **Placeholders, never secrets:** `@@SHIPHATS_<NAME>@@` (`PROJECT_NAME`, `AGENCY_NAMESPACE`, `SONAR_PROJECT_KEY`, `CODEOWNER_HANDLE`); secrets are masked CI/CD variables.
- **`activate-shiphats.sh`:** Bash 3.2, `prompt_or_env`, `--non-interactive` (`SHIPHATS_*` env), `--force` / `--keep-inert`, validates all placeholders before writing, prints required GitLab CI/CD variables.

## 10.4 Root Scripts Run Everywhere (Bash 3.2)

- `dev.sh` + `activate-shiphats.sh` must run on macOS `/bin/bash` 3.2: no associative arrays, `mapfile`, `${var,,}`; possibly-empty arrays `${a[@]+"${a[@]}"}` under `set -u`; ShellCheck (`shellcheck-py`) clean.
- CI mirrors deployment gates: typecheck, lint, format, unit + integration with `lcov` for Sonar, E2E with video, Kaniko build + smoke on port 3000, scanner pins (`Trivy ≥ 0.69.3`).

