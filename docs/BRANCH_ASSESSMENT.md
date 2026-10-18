# Branch Assessment — PR `#1` (`arena/917ef347`) & PR `#8` (`arena/e1300d3c`)

- **Repository:** `wshyang/super-duper-funicular`
- **Assessing Branch:** `arena/5ae6f17a-super-duper-funicular` (this branch)
- **Assessment Date:** `2026-10-18`
- **Method (`ADD-002`):** PR heads fetched as `refs/pull/N/head` and checked out into two dedicated working directories via `git worktree` — `/home/user/review-pr1` (detached @ `936f37c`) and `/home/user/review-pr8` (detached @ `04d5caf`) — outside the active checkout. Source read there; gates re-executed there; visual artifacts (`incorrect running sprites.jpeg`, audit plates described in their FDS) reviewed. Provenance per `CLAUDE-validation.md §8.1`.

---

## 1. What Each Branch Is Attempting

### 1.1 PR `#1` — "Sprite Motion Lab — 17-Part Biomechanical & Photorealistic Running Engine, Rounded Joint Cutter, SVG Vectorizer & FDS Prompt Audit Log" (`936f37c`, 14 commits)

**Goal:** Turn the flawed 8-frame reference sheet (`incorrect running sprites.jpeg`, SHA-256 `f9911423…`) into a *proven* flaw diagnosis plus a full replacement engine: a 17-part articulated runner (cervical neck, ponytail secondary motion, 14° forward-fall trunk, 2-segment rolling foot), driven by analytical 2-bone IK over continuous gait phase φ, skinned by (a) procedural painters and (b) photographic cutouts extracted from diffusion-generated studio plates, with rounded-end joint caps so rotating layers superimpose concentrically, plus a raster→SVG vectorizer and hierarchical SVG rig stitcher as a resolution-independent output path.

**Distinctive machinery:**
- `src/pipeline/flaw-analyzer.ts` + `docs/SPRITE_ANIMATION_FLAW_ANALYSIS.md`: quantitative proof the reference sheet is 4 poses doubled into 8 columns (mean half-cycle silhouette IoU 94.7%, dHash 0–4 bits), unilateral lead-leg lock, zero leg crossover (min foot separation 147 px), 20–25 px baseline/height jitter, two-tone magenta + JPEG chroma spill (`FLAW-01..05`).
- `src/pipeline/rounded-joint-cutter.ts` with additive `attachEndCapComposite` (grafts shorts cuffs / sock collars onto rotating limb segments) — structurally solves the "pantsless rounded thigh" seam class.
- `src/pipeline/svg-vectorizer.ts` + `src/runner/svg-rig-stitcher.ts`: Chaikin-Bézier `<clipPath>` rings + quantized tonal paths, exact 6-parameter affine stitching, hinged rearfoot/forefoot sub-groups for the 2-segment foot in pure SVG.
- Discipline at machine-check level: `src/discipline/greenfield-gate.test.ts` (≤800 LOC/file, ≤50 LOC/function, JSX purity, `data-testid`, Docker/SHIP-HATS contract), 21→72-call verbatim `#image-prompt-log`, per-turn `TURN-L*` learning register, live N-way branch ledger, and the distilled error catalogs `IMG-ERR-01..16` / `PIPE-ERR-01..08` (FDS §8.4).
- Headless audit loop: `npm run dump-cycle` (16 phases, 3-panel plates, 2× joint crops, standing-profile plate, `audit-report.json`) codified as `.claude/skills/audit-gait-cycle`.

### 1.2 PR `#8` — "Rebuild Athletic assets and add five-persona gait audit" (`04d5caf`, 15 commits)

**Goal:** Asset-quality-first branch: grow the photoreal persona spectrum (athletic sprinter, body-positive average, slim petite Singaporean Chinese female) and *rebuild* the athletic plate set from scratch (`c5df4e7`, `src/pipeline/athletic-rebuilt-extractor.ts`) while preserving hard-won fixes (torso closure, bust silhouette, cache-busted part URLs, medial far-leg, corrected far-arm), then prove pipeline parity across **all five runner personas** with a batch audit (`04d5caf`: `npm run dump-cycle -- … 16 all-personas red`, `multi-persona-audit-summary.json`).

**Distinctive machinery:**
- Wave-structured asset program (Waves 5–9): genuine female arm regeneration vs "T-rex" bone-shrinking (`ADD-029`), body-positive torso/neck/pelvis regeneration (`ADD-030`), petite persona (`ADD-032`), uncropped anterior neck + medial shoulder stump + single-shoe far leg (`ADD-033`), neutral standing-profile calibration with source-ratio defaults (`ADD-034..038`).
- `PhotorealAssetTuningSpec` per-persona tuning propagated into rig, SVG stitcher, dumper CLI and in-app inspector; CLI tuning overrides (`--torso-length`, `--torso-width`, `--tuning`).
- Deterministic plate surgery where diffusion failed: `mirrorAthleticTorsoToRightProfile`, `sealAthleticTorsoShoulderBulge`, `raiseAthleticBustLandmark`, `taperNeckCapsuleEdges`, `cleanSockAnkleSpot`.
- Honest `docs/VALIDATION.md` with 4-way provenance separation and explicit open items (athletic support-foot penetration up to `+6 px` below `y=234`; fringe counts declared antialiasing telemetry, not defects).

---

## 2. Executed Verification (This Branch, Locally Run)

| Gate | PR `#1` @ `936f37c` | PR `#8` @ `04d5caf` |
|---|---|---|
| `npm ci` | exit 0 | exit 0 |
| `npm test -- --run` (Vitest, real assets) | **47/47 passed** (7 files; pipeline 16 incl. real-sheet grid detect + cycle dump + tuning propagation) | **47/47 passed** (7 files; pipeline 16 incl. per-persona tuning override test) |
| `npm run typecheck` (`tsc --noEmit`) | exit 0 | exit 0 |
| Discipline gate (`greenfield-gate.test.ts`) | 5/5 passed | 5/5 passed |

Both branches' claimed gates reproduce. Their persona-level *visual* claims (contact sheets, joint crops) were **not** re-derived here; those remain "other branches' reported results" plus our read of their committed docs and plates.

---

## 3. Assessment — Strengths

**Shared (both branches):**
1. The discipline corpus is real and enforced: living FDS + append-only addenda + verbatim prompt log + per-turn learning register + mechanical gate. Drift between spec and code is structurally hard.
2. The audit loop is the right shape: 16-phase dumps (defects hide at intermediate φ), 3-panel plates, 2× joint crops, standing-profile calibration, machine telemetry (islands / magenta spill / uncovered joints / ground-line delta) *plus* mandatory multimodal visual inspection.
3. Quantitative, reproducible flaw diagnosis of the source sheet; failed experiments registered as "do-not-retry" (`RECTIFICATION_PLAN §4`), which is rare and valuable.
4. 100% pure-TypeScript pipeline (no Python/native lock-in), deterministic fixtures, real-asset tests.

**PR `#1` specifically:** deeper engineering architecture (end-cap composites, 2-segment foot in raster *and* SVG, vectorizer), the distilled `IMG-ERR`/`PIPE-ERR` catalogs (the single best knowledge artifact in the repo), better ground-line behaviour on the athletic persona (`-9..+2 px` vs PR `#8`'s `-8..+6 px`).

**PR `#8` specifically:** persona breadth and asset honesty (rebuilds plates rather than patching forever), batch five-persona parity audit with per-persona telemetry, calibration-as-tuning-spec propagated everywhere, explicit open-issue ledger.

## 4. Assessment — Weaknesses, Risks & Shared Root Problems

1. **Upstream generation strategy never changed.** Both branches still generate **~10 independent stochastic studio plates per persona** (72+ logged calls) and then spend most of their deterministic code *reconciling disagreements between plates*: orientation reversals (`IMG-ERR-10`), cross-build silhouette lock (`IMG-ERR-06`), duplicate garment stripes (`DEFECT-01/08`), lighting steps (`DEFECT-03`), shoulder stumps/bulges (`IMG-ERR-12/16`), ghost shoes (`IMG-ERR-14`). Inter-plate inconsistency — not any single bad plate — is the dominant cost driver.
2. **Calibration is code, not data.** Per-persona crop windows, pivots, shade scales and stripe rectangles live inside extractor functions (`photoreal-extractor.ts`, `athletic-reference-extractor.ts`, and PR `#8`'s *second* athletic path `athletic-rebuilt-extractor.ts`). Two extractors for one persona (PR `#8`) is a fork risk; hardcoded ternaries already caused `PIPE-ERR-04`. Every new persona forks code instead of adding a calibration record.
3. **Audit is vision-in-the-loop per turn, not regression-based.** Telemetry zeros (islands/spill/uncovered) are asserted, but *pose/appearance* regressions are caught only when an agent looks at fresh plates each turn; `/tmp` audit outputs are intentionally uncommitted, so visual evidence does not persist and golden-frame differencing does not exist. PR `#8`'s `+6 px` ground penetration shipped exactly this way.
4. **Process overhead is material.** A visible share of commits on both branches are ledger refreshes (`BRANCH-TIPS`, `BRANCH-HISTORY`, N-way tables) and parity re-syncs; the parity goal ("100% feature parity across all N branches") duplicates code and docs across branches and makes divergence (e.g. PR `#8`'s rebuilt extractor vs PR `#1`'s calibrated anchors) a recurring tax.
5. **Residual known defects accepted as baseline:** ~3.6–3.8k semi-transparent fringe samples per 16-frame photoreal audit; athletic support-frame ground delta; 2D planar warp of photographs remains an approximation of 3D skin/fabric deformation at extreme flexion (their own caveat, `docs/VALIDATION.md §3.2`).
6. **Diffusion platform constraints bite the workflow:** 10-image per-turn cap, stochastic rejects (`IMG-ERR-15`), phrase literalism (`IMG-ERR-13` "cross-section"), chirality inversion (`IMG-ERR-02`) — each consumed whole turns of regeneration + justification logging.

## 5. Verdict & Direction for This Branch

- **PR `#1`** = the *architecture & knowledge* reference (engine, SVG path, error catalogs, discipline gate). **PR `#8`** = the *asset program & multi-persona audit* reference. Neither is strictly superior; they are two halves of one system that diverged under the parity tax.
- Both converge empirically on the same mitigations — derive more from a **single master plate** (`side-profile-arm-extractor.ts`), **deterministic plate surgery** where diffusion fails, **tuning specs** for personas, **heavy audit loops** — which is strong evidence that the revised pipeline should make those mitigations the *primary* path instead of the repair path.
- This branch therefore designs **Pipeline Rev-2** (`docs/PIPELINE_REV2.md`): one constrained master generation per persona + deterministic landmark-driven decomposition + a machine-checkable Part Contract at the door + calibration-as-data + golden-frame regression audits, keeping the Rev-1 engine (IK, rounded caps, end-cap composites, SVG stitcher) as the assembly backend.
