# CLAUDE-checklist.md — the thirteen up-front decisions (§11), answered

| # | GREENFIELD §11 decision | Answer in this repo |
|---|---|---|
| 1 | Source-of-truth spec + addenda numbering | `docs/FDS.md` (anchors `#obj/#feat/#surf/#nfr`) + `docs/ADDENDA.md` `ADD-NNN`/`CROSS-NNN`, same-change rule |
| 2 | Test isolation + tests-first, no repo mocks | `tests/**` per domain; real JPEG + real raster; e2e deferred (ADD-006) |
| 3 | ORM + one-casing policy | dormant (ADD-002); `CLAUDE-database.md` activates on trigger |
| 4 | Soft-delete + UUIDv7 + real actor rows | dormant with §3; n/a to static artefacts |
| 5 | Schema snapshot + migration twins | dormant; manifest regeneration is the artefact twin (`npm run pipeline`) |
| 6 | `data-testid` + typed wire contracts | `{component-kebab}__{element-role}`; `src/shared/types.ts` |
| 7 | Test layout + Playwright video-on | `tests/{geometry,gait,pipeline,analysis,render,vector,app,discipline}`; video rule waits for ADD-006 exit criterion |
| 8 | Realistic fixture pools + unique ids | named personas (Wei Ming / Mei Lin), palette names from the sheet; scratch ids `/tmp/stride-audit-<run>` |
| 9 | Static-check fallback + validation caveat | §8 vocabulary table; caveat appended to constrained commits |
| 10 | One-command env + `.env` separation | `./dev.sh`; `.env.example` only, real `.env` uncommitted |
| 11 | Function design rules | `CLAUDE-function-design.md` (≤50 lines, guards, ≤3 params, view/model split, 800-LOC cap, barrel splits) |
| 12 | Container contract + contextualised Dockerfiles + `.dockerignore`, tested | root Dockerfiles from `initial-templates/`, discipline test asserts env/contract; daemon build not run in sandbox |
| 13 | Inert SHIP-HATS + activation script, in step, tested; Bash 3.2 root scripts | `*.shiphats` set + `activate-shiphats.sh` + scratch-activation test |

Status is re-confirmed in every `TURN-Lnn` entry that touches the affected area;
a row only flips to done with executed evidence named in `docs/VALIDATION.md`.
