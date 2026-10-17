# CLAUDE-database.md — Domain Model, Manifest Schema & Casing Discipline (§4–§5)

Adopted from `wshyang/greenfield` `GREENFIELD.md §4–§5`.

> **Active scope note:** This repository has no relational database, auth, or sessions (same as Branch 2 §7 and Branch 3 §4 adoption note). Sections 4–5 are **adopted as dormant but binding**: when a DB appears, they activate without migration churn. Manifests (`src/images/manifest.json`, `public/sprites/**/manifest.json`, `public/photo-runner/manifest.json`) are the file-system equivalent of the DB and follow the same discipline.

## 4. Single-Casing Domain & Manifest Policy

**Avoid the two-source-of-truth trap (snake_case at the DB / camelCase in TypeScript) with hand-written mappers.**

- **One casing, one mapper, by the ORM — never hand-written mappers:** All TypeScript domain models, JSON manifests, and component props use `camelCase` exclusively. If an ORM with property→column mapping (e.g., Drizzle) is introduced, it is the *only* translation layer. Never add a second redundant mapper.
- **No raw-SQL CRUD:** Every new table/data-access path uses the ORM; schema, data-access, and typed domain objects stay in sync in the same change.
- **Typed wire contracts as DB analogue today:** `src/shared/types.ts` defines the manifest, flaw-report, gait-parameter, skeleton, and persona types once and exports them to both `src/pipeline/`, `src/runner/`, and `src/app/`. A field rename is a compile error, not a runtime `undefined`.

### Soft-Invalidation from Day One

- Every relationship/entity that can be "removed" carries `nullable` soft-delete (`status: 'active' | 'deprecated'`, `supersededBy: string | null` in manifests; future DB: `expiresAt`/`deletedAt` + partial unique index `WHERE expires_at IS NULL` + `invalidate()` not `delete()`).
- Authorization/visibility checks (future) and pipeline filters exclude soft-deleted rows.
- `actorId` is always a genuine FK to a real `actor` row — system actors (`system`, `seed`, `unknown`) are real rows, never sentinel string literals.
- Foreign-key writes must reject both nonexistent *and* invalidated targets (a DB FK only proves the row once existed).

### IDs & Identity

- **Timestamp-ordered IDs** (`UUIDv7`) for index locality on high-insert tables; mint in exactly one place, decided on day one.
- **Manifest asset identity:** `filedPath` (unique) + `pixelSha256` (content hash) + `dHash64` (perceptual) — same guarantees as UUIDv7 without a DB.

## 5. Manifest & Asset Evolution (Migrations + Snapshot Twin)

**Two always-in-sync halves, landed in the same commit — applied today to the file-system manifests and tomorrow to the real DB.**

- **Wholesale snapshot + migration twin:** (1) a self-contained `src/images/manifest.json` / `public/sprites/**/manifest.json` that a fresh checkout reproduces from zero via `npm run pipeline`; (2) a sequentially-numbered migration (conceptual: `schema_migrations` for future DB) that an already-provisioned instance applies idempotently (`BEGIN`/`COMMIT`, zero-padded).
- **Same-commit rule:** Every schema/manifest change = snapshot update + migration file in the same commit. Skipping either half causes drift.
- **Auto-apply on boot:** Future app boot applies pending migrations; standalone migration command also provided.
