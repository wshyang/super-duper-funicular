# CLAUDE-deployment.md — Deployment Contract (deferred by decision)

`GREENFIELD.md §10` asks for a container contract and an inert SHIP-HATS
pipeline from day one. That requirement is **deliberately deferred** here, and
the deferral is recorded (`ADD-006`) rather than silently skipped.

## Why deferred

The repository currently ships no server and no browser bundle: it is a batch
asset pipeline whose deliverable is a directory of PNGs plus a manifest. There is
no listening process to bind to `0.0.0.0:3000`, so a container contract would be
decoration rather than a tested interface.

## What is already binding

- **Reproducibility.** `npm ci` from the committed lockfile, pure-TypeScript
  raster I/O with no native binaries, no Python, no GPU. A clean checkout plus
  `npm test` and `npm run plates` reproduces every artefact.
- **Bash 3.2 compatibility** for any root script that ships.
- **No secrets in the repository.** Generation credentials, if any, arrive as
  environment variables and are never written to a manifest.

## Activation conditions

Deployment work becomes mandatory, in the same change, as soon as either:

1. a studio/viewer app is added (`vite`/React), or
2. any artefact is served over HTTP.

At that point `GREENFIELD.md §10` applies in full: `Dockerfile`,
`Dockerfile.dev`, `Dockerfile.cloudflared`, `.dockerignore`, port 3000 on
`0.0.0.0`, numeric non-root user, healthcheck, and the inert `*.shiphats`
pipeline with `activate-shiphats.sh`, all covered by a mechanical gate.
