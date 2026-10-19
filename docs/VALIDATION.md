# Executed Validation Gates, Provenance & Environment Caveats (`docs/VALIDATION.md`)

- **Repository:** `wshyang/super-duper-funicular`
- **Active Branch:** `arena/917ef347-super-duper-funicular` (*PR `#1` — Sprite Motion Lab, synced with Closely Watched PR `#8` `arena/e1300d3c-super-duper-funicular` @ `04d5caf`*)
- **Last Executed:** `2026-10-18`
- **Related Discipline Rules:** `CLAUDE.md` Rule 4, `CLAUDE-validation.md §8–§10`, `docs/N_WAY_COMPARISON.md §6`.

---

## 1. Locally Executed Validation Gates (Current Turn)

| Validation Layer | Command Executed Locally | Exit Code & Measured Result | Provenance Category |
|---|---|---|---|
| **Live N-Way Branch Hash & History Refresh (`CROSS-13`)** | `npm run branches:compare` (`tsx scripts/compare-branches.ts`) | **Exit `0`** — Refreshed all $N = 5$ watched branch heads (`arena/917ef347` [PR `#1`], `arena/e1300d3c` [PR `#8` @ `04d5caf`], `arena/263385da` [PR `#2` @ `b227e2f`], `arena/77ffb088` [PR `#3` @ `43352cf`], `arena/ce6d2a6e` [`bab689c`]) in `docs/BRANCH-TIPS.json`, `docs/BRANCH-HISTORY.json`, and `docs/N_WAY_COMPARISON.md` (`N_WAY_COMPARISON.md`) | Locally executed validation gate |
| **TypeScript Strict Typecheck** | `npm run typecheck` (`tsc --noEmit`) | **Exit `0`** — Zero type errors across `src/**` and `scripts/**` | Locally executed validation gate |
| **Automated Vitest Suite (47 Real-Asset, Calibration, UI & Discipline Tests)** | `npm test` (`vitest run`) | **Exit `0`** — **47 / 47 tests passed** across 7 test files (`src/pipeline/pipeline.test.ts` [17], `src/runner/runner.test.ts` [13], `src/runner/standing-pose.test.ts` [3], `src/discipline/greenfield-gate.test.ts` [5], `src/app/hooks/studio-view-model.test.ts` [6], `src/app/RunnerControls.test.tsx` [2], `src/app/components/standing-profile-panel.test.tsx` [1]) | Locally executed validation gate |
| **Image Deduplication, Filing & Artwork Hash Inventory (`CROSS-16`)** | `npm run dedupe` (`tsx scripts/dedupe-images.ts`) | **Exit `0`** — `39` unique source assets filed under `src/images/**`; `0` duplicate files; `src/images/manifest.json`, `public/sprites/catalog.json`, and `docs/artwork-inventory.json` synchronized | Locally executed validation gate |
| **16-Phase Five-Persona Full-Cycle Frame Dump & Multimodal Visual Audit** | `npm run dump-cycle -- /tmp/audit-all-personas 16 all-personas red` | **Exit `0`** — All 5 personas (`sg-chinese-male`, `sg-chinese-female`, `photo-sg-chinese-female-petite`, `photo-sg-chinese-female`, `photo-sg-chinese-female-average`) verified with `detachedIslands = 0`, `magentaSpill = 0`, `uncoveredJointFrames = 0`, and `groundDelta = -5..+1 px` (procedural), `-9..0 px` (petite), `-9..+2 px` (athletic), `-10..+1 px` (average); `contact-sheet-16frame.png`, `joint-crops-sheet.png`, and `standing-profile-audit.png` visually inspected via `read_file` | Locally executed validation gate + Personally viewed visual output |
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

---

## 4. Session-Branch Validation Record — `arena/907ce374-super-duper-funicular` (`2026-10-19`, `TURN-L29`, `ADD-046`..`ADD-049`)

| Validation Layer | Command Executed Locally | Exit Code & Measured Result | Provenance Category |
|---|---|---|---|
| **Inherited Test Suite (Ported Converged Base)** | `npm test` (`vitest run`) | **Exit `0`** — **80 / 80 tests passed across 13 suites** (55 inherited from PR `#1` tip `96a284f` + 25 new: 8 `cv-acceptance-gates.test.ts`, 5 `master-derivation-extractor.test.ts`, 6 `generation-manifest.test.ts`, 3 `part-content-manifest.test.ts`, 3 discipline-gate extensions) | Locally executed validation gate |
| **TypeScript Strict Typecheck** | `npm run typecheck` (`tsc --noEmit`) | **Exit `0`** — zero type errors across `src/**` and `scripts/**` | Locally executed validation gate |
| **Deterministic Sprite Pipeline** | `npm run pipeline` (dedupe → extract → analyze → generate-sheets) | **Exit `0`** — reproduced the seed sheet's quantitative flaws independently (`mean half-cycle IoU: 94.7%`, `4 unique poses per row of 8`), regenerated algorithmic sheets and part banks | Locally executed validation gate |
| **Phase Harvester** | `npm run harvest-phases -- /tmp/phase-harvest-907` | **Exit `0`** — `17` canonical jigs + `18` phase-variant copies from `12` phase frames; `averageCoreCoverageRatio = 0.991`, `averageChromaSeparationRatio = 0.851` (matches PR `#1`'s reported `0.991` / `0.845` within harness tolerance) | Locally executed validation gate |
| **16-Phase Full-Cycle Audit Dump** | `npm run dump-cycle -- /tmp/gait-cycle-audit-907 16 photo-sg-chinese-female red` | **Exit `0`** — `totalDisconnectedIslands = 0`, `totalMagentaSpillPixels = 0`, `framesWithUncoveredJoints = 0` across all 16 phases | Locally executed validation gate |
| **Automated CV Plate Acceptance (New, `ADD-047`)** | `npm run acceptance -- <folder> docs/plate-acceptance-<folder>.json` × 4 | **Exit `0`** — phase frames **11/11 pass**; studio plates: athletic **4/10**, average **2/10**, petite **7/10** pass (rejections are measured, per-gate, and written to `docs/plate-acceptance-*.json`) | Locally executed validation gate |
| **Content-Addressed Part Manifests** | `npm run parts:manifest` | **Exit `0`** — 3 `parts-manifest.json` files written (SHA-256-16 per part) under `public/sprites/photoreal/*/parts/` | Locally executed validation gate |

### 4.1 Honest Environment Limits (This Session)

1. **No image-generation tool** is available in this sandbox, so no new studio plates or phase frames were generated this turn; the CV gates were exercised against the inherited real asset base (`37` studio plates + `11` phase frames).
2. **No image-vision capability** (`read_file` on raster images returns "no vision capabilities" here), so the mandatory human visual examination gate (`CLAUDE-validation.md §9.2`) is **not** satisfied by this turn's agent — every visual claim in this record is attributed to the assessed branches' FDS logs, while every numeric claim was locally re-measured by the gates above. The automated CV gates are a complement to, not a replacement for, the human visual gate.
3. **Inherited red gate found and fixed:** PR `#1` tip `96a284f` fails its own `greenfield-gate.test.ts` ledger assertion (stale `docs/N_WAY_COMPARISON.md` missing PR `#8` pose-bank SHA `60ca653`); the ledger was refreshed here (`CROSS-22`, PR `#8` progression through `9d448fe`) and the gate now passes locally.
4. Docker/SHIP-HATS/CI and live-server verification remain statically gated only (as on the assessed branches); no Docker daemon or browser was exercised in this sandbox.
