# Branch Assessment — PR `#1` (`arena/917ef347`) & PR `#8` (`arena/e1300d3c`)

- **Assessed by:** `arena/7f9c98b1-super-duper-funicular` (this branch)
- **Date:** 2026-10-18
- **Provenance class:** all commands below were **locally executed** and all images **personally viewed** via `read_file` (4-way provenance separation per `CLAUDE-validation.md §8.1`). Nothing in this document is restated from either branch's own reports without being labelled as such.

---

## 1. What each branch is attempting

Both branches attack the same problem: **generate photographic-quality sprite elements for a running animation**, starting from a flawed 6-colour × 8-frame reference sheet (`incorrect running sprites.jpeg` at this repository's root; measured and proven defective by both branches: 4 unique poses doubled into 8 columns at 94.7% mean half-cycle silhouette IoU, unilateral "peg-leg" gait with zero crossover, 20–25 px baseline/scale jitter).

| | PR `#1` — "Sprite Motion Lab" | PR `#8` — "Rebuild Athletic assets + five-persona gait audit" |
|---|---|---|
| Tip reviewed | `936f37c` (`refs/pull/1/head`) | `04d5caf` (`refs/pull/8/head`) |
| Diff vs `main` | 758 files, +33,978 lines | 710 files, +30,675 lines |
| Architecture | 17-part articulated 2D rig; diffusion-generated magenta-keyed studio plates (10 per persona); per-part capsule cutting (`rounded-joint-cutter.ts`); per-frame inverse-mapped segment warping (`photoreal-warp.ts`); Raster→SVG vectorizer + rig stitcher | Same shared skeleton, plus: rebuilt athletic extractor (`athletic-rebuilt-extractor.ts`), torso/bust/shoulder corrective passes, cache-busting asset URLs, `all-personas` batch audit, standing-profile calibration plate |
| Personas | procedural male/female + 3 photoreal female builds (athletic / average / petite) | same 5 personas, with athletic assets rebuilt from fresh plates (Pass 9) |
| Docs discipline | GREENFIELD + CLAUDE index + 8 section files; FDS v5.1.0 incl. cross-branch `IMG-ERR-01..16` / `PIPE-ERR-01..08` catalogs; 24 turn-learning entries; 5-way comparison ledger | Same discipline; FDS v4.10.0; 21 turn-learning entries; ADD-001..038; rectification plan with failed-experiments register |
| Gates (locally executed here) | `npm ci --ignore-scripts` ✅; `npm test -- --run` → **47/47 passed** (7 suites); `npm run dump-cycle -- /tmp/audit-pr1 16 photo-sg-chinese-female red` ✅ (telemetry: detachedIslands=0, magentaSpill=0, uncoveredJointFrames=0) | `npm ci --ignore-scripts` ✅; `npm test -- --run` → **47/47 passed** (7 suites); `npm run dump-cycle -- /tmp/audit-pr8 16 photo-sg-chinese-female red` ✅ (telemetry: detachedIslands=0, magentaSpill=0, uncoveredJointFrames=0) |

Both branches must be credited honestly: **the biomechanics core is genuinely good**. The 17-part hierarchy (strict back-to-front z-order, contralateral anti-phase, 2-bone IK, 2-segment rolling foot, forward-fall lean) produces correct running *poses* — the pose skeletons in their 16-phase contact sheets show proper knee drive, crossover, and flight phases, a decisive improvement over the flawed reference sheet. **The engineering discipline machinery is also genuinely good** — both carry the full GREENFIELD/FDS/addenda/learning discipline, and their numeric gates pass. The problem is concentrated in one place: **the photographic rendering stage**.

## 2. Working directories used for this assessment

```bash
cd /home/user/super-duper-funicular
git fetch origin '+refs/pull/*/head:refs/remotes/origin/pr/*'
git worktree add /home/user/pr1-review origin/pr/1     # PR #1 @ 936f37c
git worktree add /home/user/pr8-review origin/pr/8     # PR #8 @ 04d5caf
cd /home/user/pr1-review && npm ci --ignore-scripts    # then npm test, dump-cycle
cd /home/user/pr8-review && npm ci --ignore-scripts    # then npm test, dump-cycle
```

`GREENFIELD.md` in both branches was verified byte-identical to upstream `wshyang/greenfield@8ba7402` (SHA-256 `400d282e…`).

## 3. Visual evidence inspected (`read_file`, personally viewed)

| Evidence | Path | Observation |
|---|---|---|
| Flawed source sheet | root `incorrect running sprites.jpeg` | 4 poses doubled; same leg always leads; pixel-art style |
| PR1 6-colour photoreal sheet | `pr1-review/src/images/spritesheets/runner-8frame-6color-photoreal-female-sheet.png` | heavy vertical banding on legs; stick-thin arms; visible tone mismatch at joints; smeared shoes; poses comparatively shallow in knee flexion |
| PR8 6-colour photoreal sheet | `pr8-review/src/images/spritesheets/runner-8frame-6color-photoreal-female-sheet.png` | more dynamic poses but melted forearm/leg textures; stubby near arm; distorted shoe silhouettes |
| PR8 master plate | `pr8-review/src/images/photoreal-female/01-master-lateral-profile-reference.png` | genuinely photographic, clean magenta key, correct 90° profile — the raw plates are good |
| PR8 near-arm plate | `pr8-review/src/images/photoreal-female/07-near-right-arm-lateral-outside.png` | photographic but **hanging straight down** — no elbow bend data exists in the plate |
| PR8 torso cutout | `pr8-review/public/sprites/photoreal/sg-chinese-female/parts/torso.png` | clean capsule cut, rounded caps visible |
| PR1 16-phase contact sheet | `/tmp/audit-pr1/contact-sheet-16frame.png` | leg banding in every frame; flat pose amplitude; smeared shoes |
| PR8 16-phase contact sheet | `/tmp/audit-pr8/contact-sheet-16frame.png` | neck/head gaps at flexed phases (row 1); far-leg texture wiped to smooth plastic at deep hip flexion (row 3); shoe ghosting on trailing feet (row 4) |
| PR8 joint crops (`2×`) | `/tmp/audit-pr8/joint-crops-sheet.png` | close-up confirmation: head/neck separation seam; forearm texture melt; knee tone discontinuity; shoe double-contour/ghost lace patterns |
| PR8 standing profile | `/tmp/audit-pr8/standing-profile-audit.png` | **reads well at small size** — the assembled figure is convincing in neutral upright; damage concentrates at joints/extremes under motion |

## 4. Defect classification (what recurs across both branches)

1. **`TEX-ERR` — texture destruction under rotation.** Legs band, forearms melt, and at deep hip flexion the far leg's skin loses texture entirely (smooth plastic). Cause: `warpPhotorealSegmentToQuad` inverse-maps a pre-cut capsule per output pixel with bilinear sampling; the plate's lighting/shading was baked for one pose, and rotating the limb re-samples across that baked gradient. The harder the pose (PR8 flexes deeper than PR1), the worse the damage.
2. **`TONE-ERR` — cross-part collage seams.** 17 parts are cut from 10 different photographs: 17 white balances, shadow temperatures, and skin grades. Rounded joint caps + Hermite blends + Jacobi harmonic fills cannot hide hue/luminance steps at elbow/knee/neck. Visible in both branches; worst where arm meets torso and head meets neck.
3. **`JOIN-ERR` — joint coverage fails at range-of-motion extremes.** Semicircular caps are rotationally invariant only near the design angle; at running extremes (hip > 60°, knee > 115°, cervical counter-pitch) gaps open or overlap wrongly. The gates still report `uncoveredJointFrames=0` because the metric measures alpha coverage, not plausibility — a metric/visual gap.
4. **`SHOE-ERR` — melted/ghosted shoes.** The 2-segment chord-tent roll warp (`warpPhotorealRollingShoe`) smears lace/vamp detail and duplicates silhouette contours; a photographed shoe bent in 2D reads as "melted".
5. **`PEN-ERR` — ground penetration.** PR8's own five-persona audit (their report, not re-measured here) records up to +6 px support-foot penetration below the ground line; visible in their contact sheets too.
6. **Anthropometry drift & magic-number accumulation.** Arms cut from a straight-hanging arm plate (no elbow-bend data) require Jacobi *invented* interior pixels at every bent pose; per-persona tuning tables accumulate pixel-window constants (`anklePivot.y`, `cuffTopY`, torso windows) whose shifts repeatedly caused regressions (their `PIPE-ERR-06/08`, `IMG-ERR-04` records).
7. **Process cost.** 72+ logged `generate_image` calls with 16 catalogued diffusion failure modes to reach 3 personas × 10 plates — and every corrective pass risks new regressions (bust lift → collarbone bulb → shoulder seal, per PR8's `TURN-L20/L21`).

## 5. Root-cause synthesis (the single doctrinal finding)

> **A photograph is a baked rendering: identity × pose × light × lens, inseparably composited into one bitmap.** The P1 pipelines keep the identity and try to override pose and lighting with 2-D warps — but a warp moves pixels; it cannot re-light them, restore pose-specific shading, or invent occluded anatomy. Every recurring defect class above is a direct consequence of asking warps to do what only **new photographs** (or a renderer that owns shading) can do.

Supporting observations:
- The raw plates are excellent; the damage happens **downstream of the camera**, in the warper. (PR8 master plate vs its contact sheets.)
- Where no warp is applied (neutral upright standing profile), the composite reads convincingly — proof that identity, wardrobe, and tone *within one frame* work, and rotation is the stressor. (PR8 standing profile.)
- `fillHollowJointBallByJacobiRelaxation` exists precisely because the plates **lack the data** for bent joints — harmonic inpainting is a confession of missing photographs.
- Both branches' gates pass while the visible output fails — the quality machinery measures the wrong layer (alpha coverage, spill, islands) and audits at plate zoom rather than display resolution.

## 6. What is adopted vs rejected from each branch

**Adopted into the P2 design** (see `docs/PIPELINE_PROPOSAL.md`):
- The full biomechanics core (17-part rig, 2-bone IK, gait/foot-roll solver) — re-purposed as the **conformance oracle** for generated keyframes rather than the per-frame renderer (`ADD-005`).
- The complete audit harness concept (16-phase dumps, telemetry, standing profile), extended with display-resolution strips and texture/identity metrics (`ADD-007`).
- The chroma-key extraction, dedupe, and flaw-analyzer CLIs (with their quantitative proof methodology for the flawed sheet).
- The entire prompt-log + post-generation examination + regeneration-justification discipline, and the `IMG-ERR`/`PIPE-ERR` failure catalogs as pre-loaded counters.
- PR8's cache-busting, all-or-nothing readiness, standing-profile calibration, and persona-tuning propagation patterns.

**Rejected / superseded:**
- Per-frame inverse-mapped segment warping as the **primary renderer** of photographic pixels (the root cause of `TEX-ERR`/`SHOE-ERR`). Small-angle differential warps survive, but only for in-betweening, bounded to ≤ half a keyframe spacing.
- Rounded-cap joins as the primary joint strategy **across plates** (source of `TONE-ERR`/`JOIN-ERR`). Within a single keyframe photograph, parts share actual pixels, so overlap-keep cutting supersedes cross-plate cap welding; caps remain only for micro-delta adjustment.
- Zoom-level-only asset audits; audit scale is now part of the standard.

## 7. Verdict

- PR `#1`: strongest as the **discipline & knowledge base** (FDS v5.1 failure catalogs, prompt audit trail) and the more conservative pose set.
- PR `#8`: strongest as the **calibration & audit workbench** (rebuild pipeline, five-persona audit, standing profile, cache-busting) and the more dynamic pose set.
- Both hit the same wall for the same reason: **the asset model (one pose re-warped) cannot produce photographic running animation**. The revised pipeline must change *what is photographed* (poses per keyframe), not just *how photographs are warped*. That is the P2 proposal: `docs/PIPELINE_PROPOSAL.md`.
