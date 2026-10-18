# CLAUDE-database.md — data layer (GREENFIELD §4–§5, currently dormant)

**There is no database, no server and no auth in this repository.** The app is a
static bundle; the pipeline and tools run at build time. These rules are recorded
so the first data layer starts correct instead of being retrofitted.

## When a data layer appears

1. **One casing, one mapper.** camelCase domain, snake_case columns, ORM does
   the mapping once. No second hand-written mapper.
2. **All CRUD through the ORM.** Schema, access layer and typed domain objects
   change in the same commit.
3. **Soft deletion from day one**: `deleted_at`, partial unique index
   `WHERE deleted_at IS NULL`, `invalidate()` not `delete()`, active filtering on
   every read **and** every authorization check.
4. **UUIDv7 ids**, minted in one place.
5. **System actors are rows**, never `'system'` strings.
6. **FK validity includes soft-deleted targets** at write time.
7. **Snapshot + numbered migration in every schema change**, applied on boot and
   via a standalone command.
8. **Real test database**, never the dev database, never a mocked repository.
9. **IDOR-style negative test per endpoint**: a valid session belonging to the
   wrong party must be rejected.
10. **OWASP matrix** assessed per endpoint, on day one.

Until then, the only "migration" is the reproducible regeneration of committed
JSON/PNG artefacts, and the manifest schema in `src/shared/types.ts`.
