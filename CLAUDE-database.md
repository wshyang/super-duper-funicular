# CLAUDE-database.md — Domain Model, Manifest Schema & Casing Discipline (§4–§5)

Adopted from `wshyang/greenfield` `GREENFIELD.md §4–§5`, adapted to this project (no SQL database; the persistent stores are committed JSON manifests and PNG/SVG artifacts).

## 4. Single-Casing Domain & Manifest Policy

- **One casing (`camelCase`):** all TypeScript domain models, JSON manifests (`src/images/manifest.json`, sprite/plate/conformance manifests), and component props use `camelCase` exclusively.
- **No redundant hand-written mappers:** shared interfaces in `src/shared/types.ts` (once the stack lands) define the exact manifest shapes produced by the CLI scripts and consumed by the app. A field rename is a compile error on both sides, never a runtime `undefined`.
- **Soft-invalidation metadata:** catalog entries carry explicit `status: 'active' | 'deprecated'` and `supersededBy: string | null` rather than silent hard deletion. Superseded plates/cutouts remain on disk as diagnostic evidence (the siblings' "similar animation phases are preserved as diagnostic evidence" rule).

## 5. Manifest & Artifact Evolution

- **Two halves in the same commit:** when extraction/generation parameters change, (1) regenerate the affected manifests/artifacts deterministically, and (2) update the canonical inventory (`docs/artwork-inventory.json` pattern) recording byte SHA-256, pixel SHA-256, `dHash64`, and provenance for every source image.
- **One minting place:** hashes are computed by exactly one shared module; no per-script reimplementations.
- **Provenance per persona asset:** every generated plate records its verbatim prompt pointer (`docs/FDS.md#image-prompt-log` call id) so any artifact can be traced back to the exact generation instruction that produced it.
