# CLAUDE-database.md — ORM & schema evolution (§4–§5) — DORMANT

Authority: `GREENFIELD.md §4–§5` (verbatim upstream copy at repo root).

**Status: dormant.** This repository has no database, no backend service and no
auth/session surface (ADD-002): the app is a static Vite bundle plus committed
generated artefacts. The rules below are recorded so that the moment a data
layer appears they activate without renegotiation.

## Activation triggers (any one)

- Adding a server, API route, persistence, login or per-user state.

## Rules that activate verbatim on trigger

- One casing (camelCase domain ↔ snake_case columns) mapped **only** by the ORM;
  no hand-written mappers; no raw-SQL CRUD.
- Soft deletion (`deleted_at`/`expires_at`, partial unique index, `invalidate`
  repo method, active-row filtering on every read and authorization check).
- UUIDv7 timestamp-ordered IDs minted in exactly one place; system actors are
  real rows, never sentinel strings; FK validity at write time must reject
  invalidated targets.
- Schema evolution = wholesale self-contained snapshot **plus** sequential
  zero-padded idempotent migration, landed in the same commit, recorded in
  `schema_migrations`, applied on boot and via a standalone command.
- Security-test matrix per endpoint (OWASP Top 10 applicability assessment) and
  IDOR-style session-scoping negative tests per route.

Until then, do not import DB libraries and do not create migration-shaped files.
