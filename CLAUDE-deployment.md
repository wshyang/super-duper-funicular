## 10. Deployment and CI/CD from day one: sandbox containers + SHIP-HATS (kept inert)

**Decide how the project ships before the first feature, and commit the
deployment files with the first code.** Retrofitting a container contract and a
government CI/CD pipeline onto a finished app surfaces every hidden assumption
at once: a server bound to `localhost`, proxy headers trusted wrongly, unpinned
images, secrets in config, scripts that only run on one shell.

### 10.1 Container files for the sandbox platform (active from day one)

- Start from the initial templates in
  [`wshyang/greenfield/initial-templates/`](https://github.com/wshyang/greenfield/tree/main/initial-templates)
  (`Dockerfile`, `Dockerfile.dev`, `Dockerfile.cloudflared`) and
  **contextualise them**; never copy them blind. The generic `Dockerfile`
  guesses the app type from files on disk (a `dist/` without `dist/index.js` is
  served as a static site), which is wrong for any app with its own server.
  Place the results at the repository root, next to a `.dockerignore`.
- **The contract**: the app listens on **port 3000 on the container's
  interface (`0.0.0.0`)**, never only on `localhost` inside the container. The
  image sets `HOST=0.0.0.0` and `PORT=3000` (or the framework's spelling, e.g.
  `HOSTNAME` for Next.js) and `EXPOSE 3000`, and the app reads them.
- Production image: multi-stage, built from source with the lockfile
  (`npm ci`, `--ignore-scripts` where the tree allows); a runtime stage holding
  only what runs; an unprivileged **numeric** `USER` (platforms enforcing
  `runAsNonRoot` cannot verify a name); base images pinned to an exact version
  and distro release, never `latest`; a `HEALTHCHECK`.
- `.dockerignore` keeps `.env*`, `.git`, `node_modules` and build output out of
  every image, and must not exclude platform-supplied directories such as
  `viper-agent/`.
- `Dockerfile.dev` (cloud development through the platform's VIPER agent):
  keep the agent contract (`COPY viper-agent/`, its entrypoint, `PORT=3000`,
  `VIPER_APP_PORT=3001`), and configure the dev server for a forwarded host
  name behind HTTPS (the dev server's host allowlist, proxy trust).
- `Dockerfile.cloudflared`: pin the release, run with `--no-autoupdate`, take
  `TUNNEL_TOKEN` at runtime only, route the tunnel to the app's service on port
  3000.
- **Behind a proxy, trust it by address, not by hop count.** The platform's
  ingress reaches the container from a private address: believe
  `X-Forwarded-For`/`-Proto` only from loopback, link-local and private ranges.
  "Trust every hop" lets a client choose its own address (rate-limit evasion).
  "Trust nothing" makes every client share the proxy's address (per-client
  limits become global) and hides HTTPS (no `Secure` cookies). Check what your
  framework does with a hop count: Fastify 5.12 silently reads one as "trust
  nobody".
- **Test the contract.** Feed the image's `ENV` through the app's real config
  loader in a unit test; in CI, run the built image as a service and reach it by
  its network alias on port 3000. Lint the Dockerfiles with hadolint.

### 10.2 SHIP-HATS: what the platform requires (research, October 2026)

SHIP-HATS is GovTech's CI/CD platform within the Singapore Government Tech
Stack. These findings come from the public SHIP-HATS documentation; the
platform's GitLab and template sources need TechPass and SEED.

- **Platform.** GitLab Dedicated at `sgts.gitlab-dedicated.com` (Ultimate
  tier). Alongside it: SonarQube (Community and Enterprise), Nexus Repository
  Pro (proxies for npm, PyPI, Maven, Docker Hub, MCR, GHCR and more), Nexus IQ
  (SCA), Fortify on Demand (SAST, DAST), Jira and Confluence. It holds code
  classified up to CONFIDENTIAL (CLOUD-ELIGIBLE) / SENSITIVE-NORMAL.
- **Templates.** `include:` the SHIP-HATS Templates from
  `innersource/sgts/ship-hats/ship-hats-templates`, **pinned to a release tag**
  (v1.1.12 as of September 2026; it is required for signing after the Rekor
  decommissioning on 30 September 2026). `include:` cannot take variables, so
  the ref must be a literal. The hidden jobs are used with `extends`:
  - `.build-and-push-docker-image` (Kaniko);
  - `.copy-docker-image-from-one-remote-registry-to-another`;
  - `.generate-gitlab-attestation`;
  - `.sign-container` and `.verify-container`;
  - `.trivy-scan`, `.nexus-iq-scan`, `.sonarqube-scan`;
  - `.invoke-awscli-commands-with-assumerole` (OIDC, no long-lived keys).
- **E2E templates and their conventions.** The E2E templates (web app, Docker
  single and multi service, Docker image CI) are no longer maintained after
  v1.1.0, but they set the conventions the compliance framework relies on:
  - stage names: `.pre`, `build`, `test`, `static-test`, `sign`,
    `runtime-test`, deploy stages;
  - job names, never to be renamed: `build-job`, and `deploy-prod-manual-job`
    or `deploy-final-job`.
- **Compliance is a Pipeline Execution Policy.** Since March 2026 it comes
  from the WOG Security Policy Project; support for the old compliance
  pipelines ended on 30 June 2026, and GitLab removes them in 20.0. Policy jobs
  run in isolation and **never see the project's YAML variables**. Configure
  them through project or group CI/CD variables: `CF_LEVEL`,
  `SONAR_PROJECTKEY`, `SONAR_TOKEN`, `NEXUS_IQ_APP_ID`,
  `NEXUS_IQ_USERNAME`/`NEXUS_IQ_PASSWORD`, `COSIGN_PASSWORD`, `FOD_PAT`. Without
  tool credentials, the framework falls back to GitLab's native scanners.
- **Compliance levels.** `CF_LEVEL` runs from 1 to 4, default 4:

  | Level | Adds                                                   |
  | ----- | ------------------------------------------------------ |
  | 1     | Static scans (`.pre` and `static-test` stages)         |
  | 2     | DAST and deployment gating                             |
  | 3     | Signing and verification                               |
  | 4     | SLSA L1/L2 provenance and SBOMs                        |

- **Runners.**

  | Runner                    | Tags                                             | Notes                                                                                   |
  | ------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------- |
  | CStack                    | none (the default)                               | Kubernetes, non-root UID 65533, 4 vCPU / 8 GB; cannot build images                      |
  | SHIP-HATS Docker runners  | `ship_docker`, `_med`, `_large`, `_arm`           | Root but not privileged: build images with Kaniko, not Docker-in-Docker                 |
  | GitLab-hosted (pilot)     | `linux-small-amd64`, `-medium-`, `-large-`       | Privileged, ephemeral VMs                                                               |

  Jobs cannot exceed two hours.
- **Supply chain.**
  - Pull images and packages through the Nexus proxies
    (`nexus-docker.ship.gov.sg`, `nexus-docker-mcr.ship.gov.sg`,
    `https://nexus.ship.gov.sg/repository/npm-proxy/` and the others).
  - Since 3 June 2026, Nexus IQ **fails components younger than seven days**
    and integrity-rating violations: pin versions and let new releases age a
    week.
  - From 1 November 2026, SHIP-HATS Docker runners **block end-of-life and
    blocklisted images**.
  - Pin scanner images to trusted releases (Trivy ≥ 0.69.3 after the March
    2026 incident).
  - Nexus deletes artefacts after 180 days.
- **Access.**
  - From 16 October 2026, Git over HTTPS needs a personal access token or an
    SSH key; passwords are refused.
  - Tokens expire within 180 days.
  - Only owners manage merge-request approval rules.

### 10.3 The discipline: SHIP-HATS files from day one, kept inert

- **Carry the pipeline from the start, inert.** Each SHIP-HATS file gets a
  `.shiphats` suffix (e.g. `file` becomes `file.shiphats`), so GitHub, GitLab
  and local tooling ignore it until the project moves to SHIP-HATS:
  - `.gitlab-ci.yml.shiphats`;
  - `.gitlab/ci/*.gitlab-ci.yml.shiphats`;
  - `sonar-project.properties.shiphats`;
  - `.gitlab/CODEOWNERS.shiphats`;
  - `.gitlab/merge_request_templates/Default.md.shiphats`.
- **Placeholders, never secrets.** Values that differ per agency or project
  are `@@SHIPHATS_<NAME>@@` placeholders. No secrets, ever: those are masked
  CI/CD variables.
- **A root script `activate-shiphats.sh` turns them active.**
  - It runs locally on any remote environment: plain Bash 3.2+, no other
    tooling.
  - It **prompts for every value it needs**, with validation and defaults;
    `--non-interactive` reads `SHIPHATS_*` variables.
  - It renders every file before writing any, and refuses unknown placeholders
    and existing files (`--force` overwrites).
  - It removes the inert copies (`--keep-inert` keeps them).
  - It prints the GitLab settings that cannot live in files: project CI/CD
    variables, masked credentials, the compliance framework, branch protection
    and code owners.
- **What the pipeline covers.**
  - It mirrors the local gates: typecheck, lint, format, unit and integration
    tests with coverage for SonarQube (lcov), and end-to-end tests with video.
  - It builds the image with Kaniko and smoke-tests the container contract
    (port 3000 on the container's interface).
  - It leaves scans, signing and provenance to the compliance framework, or
    runs GitLab's scanners where the framework is not applied.
  - It promotes images through a manual, compliance-gated job.
- **Keep the inert files in step, in the same change** as the scripts and
  tools they call, e.g. CI image tags matching the installed test runner. Test
  it: activate into a scratch directory in the test suite, then check that
  every stage, `needs` and `extends` resolves, that the output passes the
  formatter, and that versions match. Validate against GitLab's CI schema with
  `check-jsonschema --builtin-schema vendor.gitlab-ci`.

### 10.4 Root scripts run everywhere

Scripts at the repository root (`dev.sh`, `activate-shiphats.sh`) must run on
Bash 3.2, the `/bin/bash` macOS ships:

- no associative arrays, `mapfile` or `${var,,}`;
- possibly-empty arrays expanded as `${a[@]+"${a[@]}"}`, because under `set -u`
  Bash before 4.4 calls an empty `"${a[@]}"` unbound.

Run their tests under a real Bash 3.2, which can be built from Apple's
published source, and add a static guard so Linux CI catches regressions. Lint
them with ShellCheck (`pip install shellcheck-py`).

