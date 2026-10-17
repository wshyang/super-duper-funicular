# GREENFIELD §4–§5 — database and schema discipline (dormant)

**Status: not active.** This repository has no database, no ORM, no persisted entities. Nothing in the
app writes to storage; all state is in memory for the lifetime of the page.

The rules are recorded here so that they are adopted *before* a data layer exists, which is the entire
point of deciding them up front:

1. **One casing, one mapper.** Pick camelCase in TypeScript, snake_case in the database, and let the ORM
   be the only translator. No hand-written mappers.
2. **One ORM for every table.** No raw SQL for CRUD.
3. **Soft delete from day one.** Nullable `deleted_at`, partial unique indexes, `invalidate` instead of
   `delete`, and an active-row check inside every authorisation gate.
4. **UUIDv7 ids**, minted in exactly one place.
5. **Schema snapshot + numbered migration, landed together.** A fresh database applies the snapshot; an
   existing one applies migrations that record themselves in `schema_migrations`.
6. **Foreign keys must reject soft-deleted targets**, not just missing ones.

If this project grows a backend (for example, storing user-authored gait presets), the first change that
touches storage must also land the snapshot, the first migration, and the tests described in
`CLAUDE-testing.md` — including a session-scoping negative test per endpoint.

**Impact while dormant:** nothing in `src/` may import a database driver. The only committed generated
data is `src/generated/reference-analysis.json`, which is a build artefact of the analysis script, not a
data store.
