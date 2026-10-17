# GREENFIELD §10 — container contract, proxy trust, and SHIP-HATS (inert)

## Container contract

- The app listens on **port 3000 on `0.0.0.0`**, never only on localhost.
- Vite is configured with `host: "0.0.0.0"`, `port: 3000`, `strictPort: true`, `allowedHosts: true`,
  because the preview platform proxies the dev server under
  `https://{port}-{sandbox-id}.e2b.app`. A host allowlist that rejects that name breaks the preview.
- `Dockerfile`: multi-stage, `npm ci --ignore-scripts`, exact-pinned `node:22.18.0-alpine3.22`, a
  dependency-free static server for `dist/`, `USER 65532:65532`, `HEALTHCHECK`, `EXPOSE 3000`.
- `Dockerfile.dev` keeps the platform's dev-container contract: the app on 3000, the agent on 3001.
- `.dockerignore` excludes `node_modules`, `dist`, `.git`, `.env*`, `reports`, `tests`, `tools`, and the
  original artwork (the built bundle only needs `src` and `public`).

## Proxy trust

There are no cookies, no sessions, and no client-IP-dependent behaviour, so `X-Forwarded-*` is not read at
all. That is the correct posture: with no trust decision to make, no spoofing surface exists. If a data
layer is added, trust the forwarded header **by address** (loopback, link-local, private ranges), never by
hop count.

## SHIP-HATS — intentionally absent

The upstream template asks for a `.shiphats`-suffixed pipeline plus `activate-shiphats.sh`. This repository
deliberately does **not** carry them yet, and the decision is recorded as ADD-008. Reasons:

1. The project has no GitLab remote, no project variables, and no registry, so every placeholder would be
   invented rather than validated.
2. The pipeline's local gates (`typecheck`, `test`, `build`) already exist as `npm run validate`; a
   pipeline file that duplicates them untested is worse than none.
3. Adding inert CI files that have never been rendered by the activation script would violate the
   "keep the inert files in step" rule while providing no enforcement.

When this project moves to GitLab, ADD-008 should be superseded: copy the templates pinned to the current
release tag, fill `@@SHIPHATS_*@@` placeholders, add the activation script, and test it in a scratch
directory as GREENFIELD §10.3 requires.
