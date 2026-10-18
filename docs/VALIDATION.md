# Executed Validation Gates, Provenance & Environment Caveats (`docs/VALIDATION.md`)

- **Repository:** `wshyang/super-duper-funicular`
- **Active Branch:** `arena/e1300d3c-super-duper-funicular` (*Branch 0 — Harmonised N-Way Greenfield Studio*)
- **Last Executed:** `2026-10-18`
- **Related Discipline Rules:** `CLAUDE.md` Rule 4, `CLAUDE-validation.md §8–§10`, `docs/N_WAY_COMPARISON.md §6`.

---

## 1. Locally Executed Validation Gates (Current Turn)

| Validation Layer | Command Executed Locally | Exit Code & Measured Result | Provenance Category |
|---|---|---|---|
| **Live N-Way Branch Hash & History Refresh (`CROSS-13`)** | `npm run branches:compare` (`tsx scripts/compare-branches.ts`) | **Exit `0`** — Refreshed all $N = 5$ branch heads (`arena/e1300d3c`, `arena/917ef347`, `arena/263385da`, `arena/77ffb088`, `arena/ce6d2a6e`) in `docs/BRANCH-TIPS.json`, `docs/BRANCH-HISTORY.json`, and `docs/N_WAY_COMPARISON.md` (`N_WAY_COMPARISON.md`) | Locally executed validation gate |
| **TypeScript Strict Typecheck** | `npm run typecheck` (`tsc --noEmit`) | **Exit `0`** — Zero type errors across `src/**` and `scripts/**` | Locally executed validation gate |
| **Automated Vitest Suite (30 Real-Asset & Discipline Tests)** | `npm test` (`vitest run`) | **Exit `0`** — **30 / 30 tests passed** across 4 test files (`src/pipeline/pipeline.test.ts` [10], `src/runner/runner.test.ts` [10], `src/discipline/greenfield-gate.test.ts` [5], `src/app/hooks/studio-view-model.test.ts` [5]) | Locally executed validation gate |
| **Image Deduplication, Filing & Artwork Hash Inventory (`CROSS-16`)** | `npm run dedupe` (`tsx scripts/dedupe-images.ts`) | **Exit `0`** — `17` unique source assets filed under `src/images/**`; `0` duplicate files; `src/images/manifest.json`, `public/sprites/catalog.json`, and `docs/artwork-inventory.json` synchronized | Locally executed validation gate |
| **16-Phase Full-Cycle Frame Dump & Multimodal Visual Audit** | `npm run dump-cycle -- /tmp/gait-cycle-audit 16 photo-sg-chinese-female red` | **Exit `0`** — `detachedIslands = 0`, `magentaSpill = 0`, `uncoveredJointFrames = 0`; `contact-sheet-16frame.png` and `joint-crops-sheet.png` visually inspected via `read_file` | Locally executed validation gate + Personally viewed visual output |
| **Production Bundle Build** | `npm run build` (`tsc -b && vite build`) | **Exit `0`** — Built `dist/index.html`, `dist/assets/*.css`, and `dist/assets/*.js` cleanly | Locally executed validation gate |
| **Greenfield AST, JSX, `data-testid` & SHIP-HATS Scratch Gate** | `src/discipline/greenfield-gate.test.ts` | **Exit `0`** — Verified all files `<= 800 LOC`, all named functions `<= 50 LOC`, presentation-only JSX interiors, `data-testid` on all components, `Dockerfile` (`0.0.0.0:3000`, `USER 1001:1001`, `HEALTHCHECK`), and `activate-shiphats.sh --non-interactive` in a temporary scratch directory | Locally executed validation gate |

---

## 2. Provenance Separation Across All $N = 5$ Branches

Per `CLAUDE-validation.md §8.1`, we strictly distinguish:
1. **Locally executed validation gates:** The 7 commands in Section 1 above were executed directly in `/home/user/super-duper-funicular` on `arena/e1300d3c-super-duper-funicular`.
2. **Personally viewed visual output:** `/tmp/gait-cycle-audit/contact-sheet-16frame.png` and `/tmp/gait-cycle-audit/joint-crops-sheet.png` were opened and inspected with the multimodal `read_file` vision tool.
3. **Read source code from sibling branches:**
   - `origin/arena/917ef347-super-duper-funicular` @ `e172b0f1f8d9b640b65a4ba420f71965693adb23` was inspected in `/tmp/branch-917ef347`.
   - `origin/arena/263385da-super-duper-funicular` @ `b227e2fe562be341f15f58955f539d325170729e` was inspected in `/tmp/branch-263385da`.
   - `origin/arena/77ffb088-super-duper-funicular` @ `43352cf3fe8cb6c486aa79a59954d5972a5e13ac` was inspected in `/tmp/branch-77ffb088`.
   - `origin/arena/ce6d2a6e-super-duper-funicular` @ `bab689cdac3ba730138bfae09dda537978d61e09` was inspected in `/tmp/branch-ce6d2a6e`.
4. **Other branches' reported results:** Branch 2's reported Playwright E2E count (`14 browser tests`) and Python `pytest` extraction count, and Branch 3's reported `178` unit tests at `43352cf`, are documented in `docs/N_WAY_COMPARISON.md` as external branch reports and are **not** claimed as locally executed here.

---

## 3. Environment & 2D Photographic Rig Caveats

1. **Container Daemon & Remote CI Runners:** `Dockerfile`, `Dockerfile.dev`, `Dockerfile.cloudflared`, and `.gitlab-ci.yml.shiphats` are validated via static contract checks and `activate-shiphats.sh` scratch execution in `greenfield-gate.test.ts`; no Docker daemon build, live Cloudflare tunnel, or remote GitLab Dedicated runner is available inside this sandbox.
2. **Inherent 2D Cutout Lighting & Seam Boundaries:** While our additive end-cap composite (`attachEndCapComposite`), `6 px` Hermite internal shaft blend (`CROSS-01`), material-class skin/fabric matte purge (`CROSS-07`), Jacobi harmonic joint-ball relaxation (`CROSS-08`), and `< 15%` medial/lateral width-parity gate (`CROSS-09`) achieve `0` detached islands and `0` magenta spill across all 16 phases, 2D planar warping of studio photographs remains an approximation of 3D human skin/fabric deformation at extreme flexion angles.
