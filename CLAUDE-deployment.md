# CLAUDE-deployment.md — container contract & inert SHIP-HATS (§10)

Authority: `GREENFIELD.md §10` (verbatim upstream copy at repo root, including the
October-2026 SHIP-HATS research findings).

## 10.1 Container contract (active from day one)

- Root `Dockerfile`, `Dockerfile.dev`, `Dockerfile.cloudflared` + `.dockerignore`,
  **contextualised** from `initial-templates/` (never copied blind): this app is a
  Vite static bundle served by `vite preview`, so the production image builds with
  `npm ci` + `npm run build` and serves `dist/` on **port 3000 on `0.0.0.0`**
  (`HOST=0.0.0.0`, `PORT=3000`, `EXPOSE 3000`), multi-stage, numeric non-root
  `USER`, base images pinned to exact version + distro release, `HEALTHCHECK`.
- `.dockerignore` keeps `.env*`, `.git`, `node_modules`, `dist`, `reports` out;
  must not exclude platform-supplied dirs (`viper-agent/`).
- Behind a proxy: **trust by address, not hop count** — believe
  `X-Forwarded-For/-Proto` only from loopback/link-local/private ranges.
- Test the contract: a discipline test feeds the image `ENV` through the app's
  config parse and asserts host/port; Docker daemon builds, cloudflared tunnels
  and SHIP-HATS runners are **not** executed in this sandbox (say so, don't claim).

## 10.2–10.3 SHIP-HATS kept inert

- Inert copies with `.shiphats` suffix: `.gitlab-ci.yml.shiphats`,
  `.gitlab/ci/pipeline.gitlab-ci.yml.shiphats`, `sonar-project.properties.shiphats`,
  `.gitlab/CODEOWNERS.shiphats`, `.gitlab/merge_request_templates/Default.md.shiphats`.
- `@@SHIPHATS_<NAME>@@` placeholders only; no secrets in files.
- `activate-shiphats.sh` at the root: Bash 3.2+, prompts (or `--non-interactive`
  from `SHIPHATS_*`), renders every file before writing any, refuses unknown
  placeholders and existing files (`--force`), removes inert copies
  (`--keep-inert`), prints the GitLab settings that cannot live in files.
- Pipeline mirrors the local gates (typecheck, tests, build, audit artefacts),
  builds with Kaniko on `ship_docker` runners, promotes via
  `deploy-prod-manual-job`; scans/signing left to the compliance framework
  (`CF_LEVEL`), templates `include:` pinned to a literal release tag.
- Keep inert files in step with the tools they call, in the same change; test
  activation into a scratch dir (see `tests/discipline/`).

## 10.4 Root scripts run everywhere

`dev.sh` and `activate-shiphats.sh` target `/bin/bash` 3.2 (macOS stock): no
associative arrays/`mapfile`/`${var,,}`; possibly-empty arrays as
`${a[@]+"${a[@]}"}`; lint with ShellCheck; static guard test in CI.
