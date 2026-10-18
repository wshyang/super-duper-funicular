# VALIDATION — what actually ran (CLAUDE-validation.md vocabulary)

## Delivery 2026-10-17 (Stage 1 + Stage 2, this branch)

| Claim | Exact meaning | Ran? |
|---|---|---|
| `typecheck clean` | `npm run typecheck` (`tsc --noEmit`, strict + noUncheckedIndexedAccess) exit 0 | ✅ |
| `66/66 tests pass` | `npm test` (`vitest run`) — 11 files: ik, pose, foot, cycle-audit, extraction (real JPEG), source-flaws (real JPEG), raster, paint, stitch, stage-model, greenfield-gate | ✅ |
| `pipeline clean` | `npm run pipeline` decoded the real JPEG, wrote 48 cutouts + manifest + analyses + 8 filmstrips + 6 audit sheets + 8 SVG frames; second run byte-identical (tested) | ✅ |
| `audit sheets inspected` | `public/renders/audit-*.png` + filmstrips opened via image view this turn; findings in `docs/FDS.md#gait-cycle-visual-audit` | ✅ |
| `production build clean` | `npm run build` → `dist/` (17.3 kB js gzip 6.4 kB) | ✅ |
| `ledger refreshed` | `npm run branches:compare` exit 0, `docs/BRANCH-TIPS.json` + history written, §1 table patched with full SHAs + PR states | ✅ |
| `live server` | dev server on `0.0.0.0:3000`, `/` + manifest fetched over HTTP | ✅ (this turn) |
| container build / cloudflared / SHIP-HATS runners | **not executed** (no Docker daemon, no tunnel, no GitLab in sandbox); contracts asserted statically by `tests/discipline/greenfield-gate.test.ts` | ❌ labelled |
| browser e2e (Playwright) | **not run** — no Chromium binary downloadable (ADD-006); HTTP smoke + model tests stand in | ❌ labelled |
| sibling-branch suites | **not run here** — their numbers in the ledger are their reported results (provenance category 4) | ❌ labelled |

## Sandbox caveats

- Outbound network limited to github/codeload/api.github, npm registry, PyPI:
  no browser binaries, no Docker Hub pulls, no SHIP-HATS GitLab.
- Visual review used rendered PNGs inspected as images; no human-grade
  anatomical certification is claimed.
