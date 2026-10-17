# CLAUDE-checklist.md — the seventeen up-front answers (GREENFIELD §11)

| # | Decision | Answer in this repository |
| --- | --- | --- |
| 1 | Source of truth + addenda numbering | `docs/FDS.md` (contract + learning) + `docs/ADDENDA.md` (`ADD-001`…, append-only) |
| 2 | Real-input tests, negatives, fail-first | `tests/pipeline/` decodes the committed JPEG; `tests/runner/` solves real IK; negatives listed in `CLAUDE-testing.md` |
| 3 | Data layer / casing | No database. Dormant rules in `CLAUDE-database.md`; camelCase contracts in `src/shared/types.ts` |
| 4 | Soft delete / ids / actors | Not applicable yet; recorded for the day a data layer exists |
| 5 | Snapshot + migration | No schema; generated artefacts are byte-reproducible instead |
| 6 | Testids + typed boundaries | `{component-kebab}__{element-role}`, gate-enforced; manifest/analysis/parity typed once |
| 7 | Test layout + video | `tests/{runner,pipeline,discipline}`; browser runtime absent, so E2E is explicitly not claimed |
| 8 | Deterministic fixtures | Fixed phases (n/16, n/64), fixed personas/palettes, no randomness in domain code |
| 9 | Honest validation | Five provenance categories in `CLAUDE-validation.md`; `docs/VALIDATION.md` records actual runs |
| 10 | One-command env + env files | `./dev.sh`; `.env.example` committed, `.env` ignored, no `.env.test` (no database) |
| 11 | Function/module gates | `tests/discipline/greenfield-gate.test.ts`: ≤50-line functions, ≤800-line files, JSX purity, testids |
| 12 | Container contract | `Dockerfile` (nginx, numeric 1001, healthcheck), `.dev`, `.cloudflared`, `.dockerignore`, all gate-checked |
| 13 | Inert SHIP-HATS + Bash 3.2 | `*.shiphats` with `@@SHIPHATS_*@@` placeholders + `activate-shiphats.sh` |
| 14 | Living FDS + per-turn learning | `TURN-Lnn` entries, mandatory every turn |
| 15 | Live n-way ledger | `docs/N_WAY_COMPARISON.md` + `npm run branches:compare` + in-app `src/shared/parity.ts` |
| 16 | Image-prompt provenance | `docs/PHOTO-PROMPTS.md`, verbatim and append-only |
| 17 | Full-cycle visual audit | `npm run dump-cycle` + `.claude/skills/audit-gait-cycle/SKILL.md` |
