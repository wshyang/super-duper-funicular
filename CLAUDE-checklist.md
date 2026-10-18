# CLAUDE-checklist.md — Up-Front Discipline Checklist Mapped to This Repository (§11)

Adopted from `wshyang/greenfield` `GREENFIELD.md §11`. Status column is honest: ✅ present, 📋 bound (arrives with first code change).

| # | Greenfield Requirement | This Repository |
|---|---|---|
| 1 | Source-of-truth spec + addenda numbering | ✅ `docs/FDS.md` (P2 seed) + `docs/ADDENDA.md` (`ADD-001`…) |
| 2 | Real tests, no mocks where it counts | 📋 `src/pipeline/*.test.ts`, `src/runner/*.test.ts` on real JPEG/PNG buffers (Vitest 2) |
| 3 | One-casing policy (`camelCase`) | ✅ Bound in `CLAUDE-database.md`; enforced by shared `src/shared/types.ts` 📋 |
| 4 | Soft-invalidation metadata & hash inventory | ✅ Policy bound; `docs/artwork-inventory.json` pattern inherited 📋 |
| 5 | Deterministic manifest regeneration | 📋 `npm run pipeline`-style CLI with manifest sync in same commit |
| 6 | `data-testid` convention + typed contracts | ✅ Bound in `CLAUDE-conventions.md` |
| 7 | Co-located test layout by domain | 📋 `src/pipeline/`, `src/runner/`, `src/app/`, `src/discipline/` |
| 8 | Deterministic fixtures & palettes | ✅ 6 canonical team palettes + 3 locomotion modes inherited from watched branches |
| 9 | Honest validation reporting & 4-way provenance | ✅ `CLAUDE-validation.md §8.1`; executed log in `docs/VALIDATION.md` |
| 10 | One-command setup + `.env.example`/`.env.test` | 📋 `./dev.sh` with the stack |
| 11 | Function design rules (≤50 LOC, ≤3 params, pure JSX) | ✅ Bound; mechanical gate 📋 (`src/discipline/greenfield-gate.test.ts`) |
| 12 | Container contract (`0.0.0.0:3000`, non-root) | ✅ Bound in `CLAUDE-deployment.md`; files 📋 |
| 13 | Inert SHIP-HATS pipeline + Bash 3.2 scripts | ✅ Bound; files 📋 |
| 14 | Mandatory image prompt & regeneration-justification log | ✅ `CLAUDE-decisions.md §2`; log seeded in `docs/FDS.md#image-prompt-log` |
| 15 | Full-cycle frame dump & agent visual audit skill | ✅ `.claude/skills/audit-gait-cycle/SKILL.md` (runs in watched-branch worktrees today) |
| 16 | Mandatory continuous per-turn learning register | ✅ `docs/FDS.md#continuous-learning-log` (`TURN-L01` seeded) |
| 17 | Branch-watch ledger (observed vs reviewed SHA) | ✅ `CLAUDE-decisions.md §4`; evidence in `docs/BRANCH_ASSESSMENT_PR1_PR8.md` |
| 18 | Display-resolution audit standard (`1×`/`2×`/`4×`) | ✅ `ADD-007` — new in this repository, motivated by PR `#1`/`#8` evidence |
| 19 | Persona bible as single calibration source (no magic numbers) | ✅ `ADD-008` — new in this repository |
| 20 | Rig-as-oracle conformance gate for generated plates | ✅ `ADD-005` — new in this repository (`docs/PIPELINE_PROPOSAL.md §K2`) |
