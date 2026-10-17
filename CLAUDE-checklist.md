# CLAUDE-checklist.md — 13-Point Greenfield Checklist (§11) + Harmonised Extensions

Adopted from `wshyang/greenfield` `GREENFIELD.md §11` and cross-branch parity learnings (`CROSS-10..CROSS-12`, `ADD-021..ADD-023`).

## The thirteen + harmonised extensions — decided up front

| # | Greenfield Requirement | Repository Implementation |
|---|---|---|
| 1 | Source-of-truth spec + addenda numbering | `docs/FDS.md` (#obj/#feat/#surf/#nfr, D1–D21) + `docs/ADDENDA.md` (`ADD-001`.. sequential, same-change) |
| 2 | Test DB isolation + "tests-first, real DB, no mocks" | File-system manifests as file-DB analogue + real Vitest/Playwright gates (no mocked pipeline/Ik/solver); separate `.env.test` / ignored artefacts |
| 3 | ORM + one-casing policy (no hand-written mappers) | `camelCase` everywhere; `src/shared/types.ts` single source; Drizzle-style ORM reserved for future DB (one translation layer only) |
| 4 | Soft-delete + UUIDv7 + real-actor-rows | `status: 'active'|'deprecated'` + `supersededBy` in manifests; UUIDv7 scheme decided for future DB |
| 5 | Schema snapshot + migration twin-file | Wholesale `src/images/manifest.json` / `public/sprites/**/manifest.json` + versioned conceptual migration; both in same commit |
| 6 | `data-testid` + typed wire contracts | `{component-kebab}__{element-role}` on every interactive element; `src/shared/types.ts` typed contracts |
| 7 | Test layout by type + Playwright video-on | `src/pipeline/`, `src/lib/gait/`, `src/runner/`, `src/app/**`, `tests/frontend/e2e` + video: on, `E2E_VIDEO=off` to disable |
| 8 | Realistic fixture pools + unique-per-run IDs | 6 palettes + 2 personas + deterministic seeds; unique run IDs for isolation |
| 9 | Static-check fallback + validation caveat | Honest 4-way provenance vocabulary in `CLAUDE-validation.md §8.1` + `docs/VALIDATION.md` |
| 10 | One-command env + `.env`/`.env.test` separation | `./dev.sh` + `.env.example` + `.env.test`; `dev.sh --check-only` |
| 11 | Function design (≤ 50 LOC, guard clauses, ≤ 3 params, no flags, no mutation, CQS, 800 LOC file) | Enforced by `src/discipline/greenfield-gate.test.ts` AST gate |
| 12 | Container contract (`0.0.0.0:3000`, proxies trusted by address) + contextualised `Dockerfile*`, `.dockerignore` | `Dockerfile` / `Dockerfile.dev` / `Dockerfile.cloudflared` + pinned `node:22.12.0-alpine3.20` |
| 13 | SHIP-HATS inert (`*.shiphats` + `activate-shiphats.sh`) + Bash 3.2 roots | All 5 inert templates + activator verified in scratch-dir test |
| 14 | Mandatory image prompt & regeneration justification log | Every `generate_image` exact prompt + regeneration rationale in `docs/FDS.md#image-prompt-log` + `docs/PHOTO-PROMPTS.md` |
| 15 | Full-cycle frame dump + audit skill | `npm run dump-cycle` + `.claude/skills/audit-gait-cycle/SKILL.md` + 16-phase 3-panel browser exporter |
| 16 | Mandatory continuous per-turn learning register | `TURN-L01..LNN` in `docs/FDS.md#continuous-learning-log` every turn; no fabrication |
| 17 | Live N-way branch ledger | `docs/N_WAY_BRANCH_COMPARISON.md` + `npm run branches:compare` + 24+ dimension parity matrix + adoption queue toward 100% parity |
| 18 | Failed experiments & dead-ends register | `PLAN.md §4` + `docs/RECTIFICATION_PLAN.md §4` ("Do Not Retry As-Is") |
| 19 | Automated AST/LOC/testid/doc gate | `src/discipline/greenfield-gate.test.ts` enforces §11, prompt log, learning log, ledger, container contract |
| 20 | Provenance honesty as default | `CLAUDE-validation.md §8.1` 4-way separation required in every commit/PR note |

Answer these twenty up front and the repo avoids most drift, silent-merge regressions, and "we should have written that down" moments.
