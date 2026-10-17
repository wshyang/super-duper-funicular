# CLAUDE-deployment.md — containers and SHIP-HATS (GREENFIELD §10)

## 10.1 Container contract (active now)

- **Port 3000 on `0.0.0.0`.** The image sets `HOST=0.0.0.0`, `PORT=3000`,
  `EXPOSE 3000`, and the app reads them (`vite.config.ts` binds 0.0.0.0:3000 with
  `strictPort`).
- `Dockerfile`: multi-stage; `npm ci` from the lockfile; build with Vite; runtime
  stage is `nginx:1.27-alpine` serving `dist/` with a real `HEALTHCHECK`, pinned
  tag, unprivileged **numeric** `USER 1001:1001`, `EXPOSE 3000`, and the history
  fallback for SPA routes.
- `Dockerfile.dev`: Node 22 development container preserving the platform agent
  contract (`COPY viper-agent/`, `PORT=3000`, `VIPER_APP_PORT=3001`,
  `VIPER_AGENT_PORT=9111`, numeric user 1001).
- `Dockerfile.cloudflared`: pinned `cloudflare/cloudflared:2024.12.2`,
  `tunnel --no-autoupdate run`, `TUNNEL_TOKEN` supplied at runtime only.
- `.dockerignore`: excludes `.git`, `node_modules`, `dist`, `.env*`, `reports`,
  `test-results`; **must not** exclude `viper-agent/`.
- **Proxies are trusted by address**, not hop count: forwarded headers are
  believed from loopback/link-local/private ranges only.
- The discipline gate asserts the port, host, user, healthcheck, pinned base and
  placeholder contract on every test run. A Docker build is **not** executed in
  this sandbox and is never claimed.

## 10.2 SHIP-HATS: what the platform requires (researched October 2026)

- GitLab Dedicated at `sgts.gitlab-dedicated.com` (Ultimate), with SonarQube,
  Nexus Repository Pro, Nexus IQ, Fortify on Demand, Jira and Confluence.
- `include:` `innersource/sgts/ship-hats/ship-hats-templates` **pinned to a
  release tag** (`v1.1.12` as of September 2026; required for signing after the
  Rekor decommissioning on 30 September 2026). `include:` cannot take variables.
- Hidden jobs used with `extends`: `.build-and-push-docker-image` (Kaniko),
  `.copy-docker-image-from-one-remote-registry-to-another`,
  `.generate-gitlab-attestation`, `.sign-container`, `.verify-container`,
  `.trivy-scan`, `.nexus-iq-scan`, `.sonarqube-scan`,
  `.invoke-awscli-commands-with-assumerole`.
- Stage names: `.pre`, `build`, `test`, `static-test`, `sign`, `runtime-test`,
  deploy. Job names never renamed: `build-job`, `deploy-prod-manual-job`.
- Compliance is a Pipeline Execution Policy (WOG Security Policy Project); policy
  jobs never see project YAML variables, so configure project/group CI/CD
  variables: `CF_LEVEL`, `SONAR_PROJECTKEY`, `SONAR_TOKEN`, `NEXUS_IQ_APP_ID`,
  `NEXUS_IQ_USERNAME`, `NEXUS_IQ_PASSWORD`, `COSIGN_PASSWORD`, `FOD_PAT`.
- `CF_LEVEL` 1–4: static scans → DAST and deployment gating → signing → SLSA
  provenance and SBOM.
- Runners: default CStack (non-root, cannot build images), `ship_docker*` (root,
  not privileged — Kaniko only), GitLab-hosted pilot (`linux-*-amd64`). Jobs cap
  at two hours.
- Supply chain: Nexus proxies for images/packages; components younger than seven
  days fail Nexus IQ (pin and let releases age); EOL images blocked from
  1 November 2026; artefacts expire after 180 days; Git over HTTPS needs a PAT or
  SSH key from 16 October 2026 with tokens expiring within 180 days.

## 10.3 Inert until the move

- Every pipeline file carries the `.shiphats` suffix:
  `.gitlab-ci.yml.shiphats`, `.gitlab/ci/pipeline.gitlab-ci.yml.shiphats`,
  `.gitlab/CODEOWNERS.shiphats`, `.gitlab/merge_request_templates/Default.md.shiphats`.
- Only `@@SHIPHATS_<NAME>@@` placeholders; no secrets in files ever.
- `activate-shiphats.sh` renders and validates every file before writing any,
  refuses unknown placeholders and existing files (`--force` overwrites), keeps
  inert copies with `--keep-inert`, and prints the settings that cannot live in
  files.
- Keep the pipeline's gates in step with `npm run validate` in the same change.

## 10.4 Root scripts

`dev.sh` and `activate-shiphats.sh` run on Bash 3.2 (no associative arrays, no
`mapfile`, no `${var,,}`; possibly-empty arrays expanded as
`${a[@]+"${a[@]}"}`). The discipline gate greps for the constructs that break
3.2; run the scripts under a real 3.2 shell before claiming compatibility.
