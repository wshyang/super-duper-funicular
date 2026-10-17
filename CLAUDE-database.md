## 4. Database / ORM discipline (the two-source-of-truth trap)

**The single costliest architectural smell in this project was carrying the
same field in two spellings** (snake_case at the DB, camelCase in TypeScript)
and building hand-written mappers to translate between them. Lay out the
policy up front:

- **One casing, one mapper, by the ORM — never hand-written mappers.** If you
  use an ORM with a property→column mapping (e.g. Drizzle), the ORM is the
  *only* translation you write. Pick one casing for the TypeScript domain
  (camelCase) and let the ORM map to snake_case DB columns. **Do not add a
  second, redundant mapper layer** — it is a two-sources-of-truth trap that
  every field must keep in agreement by hand.
- **Every new table/data-access object uses the ORM** — no hand-written raw
  SQL for CRUD. Keep the schema definitions, the data-access layer, and the
  typed domain objects in sync in the same change.
- **Soft deletion, not hard `DELETE`.** Give every relationship/entity that
  can be "removed" a nullable `expires_at`/`deleted_at` from day one, a
  partial unique index (`WHERE expires_at IS NULL`), an `invalidate` (not
  `delete`) repo method, and active-row filtering on every read and every
  authorization check. Retroactively adding soft-delete + re-checking every
  "is it still active" gate is high-effort and bug-prone.
- **Timestamp-ordered IDs** (e.g. UUIDv7, not v4) for index locality on
  high-insert tables — decide the ID scheme on day one and mint IDs in exactly
  one place.
- **System/non-human actors are real rows**, never sentinel string constants —
  so every `actor_id` is a genuine FK. Decide this before any `'system'`/`'unknown'`
  literal leaks in.
- **Foreign-key validity at write time must consider soft-deleted rows**: a
  column that references another row must reject both nonexistent AND
  invalidated targets — a DB FK only proves the row once existed.


## 5. Schema evolution (migrations + wholesale snapshot, same change)

- **Two always-in-sync halves, landed in the same commit:**
  (1) a wholesale, self-contained schema/seed snapshot that a brand-new DB
  applies from zero (every `CREATE TABLE` lists every current column — never
  `ALTER`s that turn it into "current shape + a changelog of patches");
  (2) a sequentially-numbered migration file (zero-padded, idempotent,
  `BEGIN`/`COMMIT`, records itself in a `schema_migrations` table) that an
  already-provisioned DB applies to catch up.
- **Every schema change = snapshot update + migration file, in the same commit.**
  Skipping either half causes the exact drift this discipline eliminates.
- Apply pending migrations automatically on app boot, and provide a standalone
  migration command.

