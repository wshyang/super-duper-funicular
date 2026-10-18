# CLAUDE-database.md — Domain Model, Manifest Schema & Casing Discipline (§4–§5)

Adopted from `wshyang/greenfield` `GREENFIELD.md §4–§5`.

## 4. Single-Casing Domain & Manifest Policy

- **One Casing (`camelCase`):** All TypeScript domain models, JSON manifests (`src/images/manifest.json`, `public/sprites/extracted/manifest.json`, `public/sprites/algorithmic/manifest.json`), and component props use `camelCase` exclusively.
- **No Redundant Hand-Written Mappers:** Shared TypeScript interfaces in `src/shared/types.ts` define the exact wire/manifest shapes produced by the CLI scripts (`scripts/*.ts`) and consumed by the React web application (`src/app/`).
- **Soft-Invalidation Metadata:** Asset catalog entries carry explicit `status: 'active' | 'deprecated'` and `supersededBy: string | null` fields rather than silent hard deletion when assets are deduplicated.

## 5. Manifest & Asset Evolution

- Whenever extraction or algorithmic generation parameters change, run `npm run pipeline` in the same commit so `src/images/manifest.json` and `public/sprites/**/manifest.json` remain 100% synchronized with the code.
