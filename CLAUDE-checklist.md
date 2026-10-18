# Greenfield day-zero checklist — this repository

| Greenfield decision | Binding for this project | Status |
|---|---|---|
| Source of truth and addenda | `docs/FDS.md` + sequential `docs/ADDENDA.md` | Set |
| Test-first / real inputs | Vitest for pure core and actual JPEG pipeline; Playwright for real UI paths | Vitest/real-JPEG pass; Playwright remains pending |
| Language/runtime and package manager | Strict TypeScript, Node 22 LTS, npm lockfile | Set; exact patch versions pinned in first package lock |
| ORM, soft delete, IDs, migrations | No backend or persisted entities in current scope | Dormant; reopen before any persistence |
| Typed boundaries, test IDs, copy | Typed manifests/settings; `{component-kebab}__{element-role}` plus accessible labels | Set |
| Test layout/video/fixtures | Domain tests + real asset integration + browser E2E; video on, `E2E_VIDEO=off` opt-out | Set; browser runtime to be verified |
| Deterministic fixtures | Fixed source SHA, deterministic extraction, manifests and output hashes | Set as acceptance target |
| Validation honesty | `docs/VALIDATION.md`; read/viewed/executed/reported labels | Set |
| Local environment | One-command `npm ci && npm run dev` after package exists | Stage 2 deliverable |
| Function/module limits | ≤20 LOC target, ≤50 hard review limit; ≤3 positional params; nesting ≤3; 400 typical/800 hard file | Set, documented exceptions allowed |
| Container contract | Vite preview on `0.0.0.0:3000`, forwarded host accepted; Docker adapted to static output | Contract set; container not built yet |
| SHIP-HATS | Deferred until a real GovTech/GitLab target; no compliance claim | Deferred |
| Image-generation provenance | Exact prompt/path/reference/outcome and append-only regeneration rationale in FDS | Set; no generated artwork introduced in Stage 2 |
| Live parity tracking | This branch + all open same-app PRs + provisional active candidates; full SHAs refreshed each turn | Set; `n` is dynamic |
