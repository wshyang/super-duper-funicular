# GREENFIELD §11 — the thirteen up-front decisions, answered

| # | Decision | Answer in this repo |
| --- | --- | --- |
| 1 | Source-of-truth spec + addenda numbering | `README.md` + `docs/sprite-flaw-analysis.md` are the contract; `docs/ADDENDA.md` is append-only |
| 2 | Test isolation and "tests first, real inputs" | No database. Real artwork in every pipeline test (see ADD-002, `CLAUDE-testing.md`) |
| 3 | ORM + one-casing policy | Not applicable yet; recorded in `CLAUDE-database.md` |
| 4 | Soft delete, ids, real actor rows | Not applicable yet; recorded in `CLAUDE-database.md` |
| 5 | Schema snapshot + migration twin | Not applicable yet; recorded in `CLAUDE-database.md` |
| 6 | `data-testid` convention + typed boundaries | `CLAUDE-conventions.md`; testids authored with each control |
| 7 | Test layout by type | `tests/` split by domain, no browser suite; canvas painting tested through a real rasteriser |
| 8 | Deterministic fixtures + unique ids | No random data. Analysis output is byte-stable and committed |
| 9 | Static-check fallback discipline | `CLAUDE-validation.md` names each layer explicitly |
| 10 | One-command local env | `npm install && npm run dev`; no `.env` needed |
| 11 | Function design rules | `CLAUDE-function-design.md`; largest function is well under 50 lines |
| 12 | Container contract | `Dockerfile` on port 3000 / `0.0.0.0`, non-root, healthcheck (`CLAUDE-deployment.md`) |
| 13 | SHIP-HATS inert + Bash 3.2 scripts | Deliberately deferred, ADD-008, with the reason recorded |

## What is still open

- **Browser verification.** No browser in the sandbox; the preview must be opened once by a human.
- **SHIP-HATS.** Deferred until the project has a GitLab destination (ADD-008).
- **`parts.ts` size.** At roughly 500 lines it is approaching the extraction threshold; split per part
  when the next part is added.
- **Gait fidelity.** The model is a biomechanically motivated approximation, not motion capture. Its
  remaining limitations are listed in `docs/sprite-flaw-analysis.md` (ADD-006).
