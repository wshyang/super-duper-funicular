# CLAUDE-deployment.md — Container Contract & Inert SHIP-HATS Pipeline (§10)

Adopted from `wshyang/greenfield` `GREENFIELD.md §10`. **Status:** these files land with the first app-code change; until then this section binds the contract so no code is written that violates it.

## 10.1 Sandbox Container Contract (binding for future code)

- The app listens on **port 3000 on `0.0.0.0`** (never `localhost`-only), reading `HOST`/`PORT` from the environment; `EXPOSE 3000`.
- Production image: multi-stage, pinned base (`node:22-alpine` exact digest), `npm ci --ignore-scripts` from the committed lockfile, static/bundle runtime stage, numeric non-root `USER 1001:1001`, `HEALTHCHECK`.
- `Dockerfile.dev` (cloud dev): dev server configured for a forwarded HTTPS host (`allowedHosts: true`), agent contract preserved; `Dockerfile.cloudflared`: pinned release, `--no-autoupdate`, `TUNNEL_TOKEN` at runtime only.
- `.dockerignore` keeps `.env*`, `.git`, `node_modules`, `dist` out of every image.
- **Behind a proxy, trust it by address, not by hop count** (loopback/link-local/private ranges only).

## 10.2–10.4 Inert SHIP-HATS Pipeline & Root Scripts

- SHIP-HATS files are carried inert with a `.shiphats` suffix (`.gitlab-ci.yml.shiphats`, `.gitlab/ci/*.gitlab-ci.yml.shiphats`, `sonar-project.properties.shiphats`, `.gitlab/CODEOWNERS.shiphats`, `.gitlab/merge_request_templates/Default.md.shiphats`) plus a Bash 3.2-compatible `activate-shiphats.sh` that prompts for `@@SHIPHATS_*@@` placeholders, renders before writing, refuses unknown placeholders and existing files (`--force` overwrites), and removes inert copies (`--keep-inert` keeps them). No secrets in files, ever.
- Root scripts (`dev.sh`, `activate-shiphats.sh`) run on Bash 3.2: no associative arrays, no `mapfile`, no `${var,,}`; possibly-empty arrays expanded as `${a[@]+"${a[@]}"}`; ShellCheck-clean.
- Keep inert files in step, in the same change, with the scripts and versions they call; validate the activated output against GitLab's CI schema.
