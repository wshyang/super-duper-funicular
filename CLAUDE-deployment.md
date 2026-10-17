# Deployment

- Bind `0.0.0.0:3000`.
- `Dockerfile`, `Dockerfile.dev`, `Dockerfile.cloudflared`, `.dockerignore` at repo root (from greenfield templates).
- SHIP-HATS files remain inert until `activate-shiphats.sh` is used.
- Never claim container/e2e/compliance checks that did not run.
