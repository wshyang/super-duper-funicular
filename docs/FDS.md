# FDS — Stride Harmonised Lab (living functional design specification)

**Status:** living contract. Base version `1.0.0` (2026-10-17). Decisions that
change this contract land as `ADD-NNN`/`CROSS-NNN` in
[`ADDENDA.md`](ADDENDA.md) in the same change. Cross-branch parity state lives in
[`N_WAY_COMPARISON.md`](N_WAY_COMPARISON.md). Evidence and per-turn learnings
append to [`#continuous-learning-log`](#continuous-learning-log) at the bottom.

## 0. Problem statement

The only source artwork, `incorrect running sprites.jpeg`
([#obj-source-sheet](#obj-source-sheet)), advertises an "8-FRAME COMPLETE RUNNING
CYCLE (Alternating Gait)" but is defective: it repeats four poses twice, never
alternates lead legs, never crosses the legs, and is unregistered (see
[#feat-flaw-analysis](#feat-flaw-analysis), measured on the real JPEG). This
project (a) forensically measures those flaws, (b) preserves the artwork and its
extracted cells as an honest comparison dataset, and (c) replaces the animation
with a deterministic, articulated, biomechanically-grounded procedural runner
plus a workbench to inspect, tune and export it — converging toward feature
parity with the sibling branches ([#nfr-parity](#nfr-parity)).

---

## 1. Object model

### #obj-source-sheet
The committed JPEG `src/images/source/runner-six-palette-eight-frame-flawed-sheet.jpeg`
(bytes also preserved at repo root as `incorrect running sprites.jpeg`),
SHA-256 `f99114235d61781f76a6b32c637edac16f13af6592a2866fe0e0528504727030`,
2528×1696 px: a title band, six palette rows (crimson, cobalt, leaf, sunshine,
violet, tangerine) × eight labelled columns, cell background ≈ RGB(253,74,253),
divider/grid ≈ RGB(253,0,252). Geometry (header height, row/column dividers) is
**detected**, never hardcoded ([#feat-extraction](#feat-extraction)).

### #obj-extracted-frame
One registered RGBA cutout: `{ id, palette, frame, url, sha256, dHash64, bounds:{w,h}, pivot:{x,y}, groundY }`
on a shared canvas (common width/height, centroid column and ground line
aligned). 48 frames = 6 palettes × 8 columns.

### #obj-manifest
`public/sprites/extracted/manifest.json`: source SHA-256, sheet geometry, canvas
size, and one [#obj-extracted-frame](#obj-extracted-frame) per logical id. The
single geometry source for playback, tests and exports (ADD-005).

### #obj-rig
17 articulated parts, near/far depth pair per limb: `pelvis, torso, neck, head,
hair, upperArm×2, forearm×2, hand×2, thigh×2, shin×2, foot×2`. Each part has a
parent joint, rest length and paint style. Bone lengths are invariant per
persona ([#nfr-rig](#nfr-rig)).

### #obj-pose
Joint positions solved from a normalized phase `φ ∈ [0,1)`:
`hip, shoulder, elbow/wrist ×2, knee/ankle/toe/heel ×2, neckBase, headCenter`,
plus scalars `torsoLeanRad, neckPitchRad, headPitchRad, pelvisBobY, supportState`
(`near-stance | far-stance | double-support | flight`). Produced only by
`src/lib/gait/pose.ts`.

### #obj-motion-profile
`{ id: run|walk|brisk-walk, cadenceStepsPerMin, stanceDuty, doubleSupportDuty,
footTravelPx, footLiftPx, leanRad, armSwingRad, elbowFlexRad, pelvisHeightPx }`.
Defaults (ADD-008, harmonised from Stride Lab's measured table): run
168/0.36/0/36/25/10°; walk 108/0.62/0.12/28/7/2°; brisk-walk 132/0.56/0.06/32/9/4°.

### #obj-persona
`wei-ming` (male) and `mei-lin` (female): palette (skin, hair, kit top, kit
bottom, shoe), proportions scale, hair silhouette id. Data-only; the rig and
gait are shared. Photographic personas are a deferred parity item
([CROSS-011](ADDENDA.md)).

### #obj-raster
`{ width, height, data: Uint8ClampedArray }` RGBA. The pure-TS raster
(`src/lib/render/raster.ts`) supports clear, fillPolygon (even-odd scanline),
fillCapsule, drawSegment, composite-over and PNG encode/decode. Declared mutation
exception (CLAUDE-function-design.md).

### #obj-cycle-analysis
Metrics over a frame list: pairwise silhouette IoU matrix, half-cycle IoU mean,
adjacent IoU mean, ground-line jitter, centroid-x drift, height variance,
minimum foot separation, lead-swap count, per-frame support state.

---

## 2. Features

### #feat-extraction — sheet forensics and registered cutouts
1. Decode the real JPEG (`jpeg-js`).
2. Detect the title band bottom and the row/column dividers from magenta-line
   runs (tolerant of JPEG noise); assert 6 rows × 8 columns.
3. Chroma-key both magenta tones with boundary despill: a pixel is background if
   it is magenta-like **and** connected to the cell border (flood fill), then
   dilate-1 despill removes fringes without eroding violet kit pixels.
4. Largest connected component per cell = the figure; tight bounds + centroid.
5. Register onto the shared canvas: align centroid column and ground line
   (ADD-004); write 48 PNGs + [#obj-manifest](#obj-manifest).
6. Byte-reproducible: `npm run sprites:extract` twice ⇒ identical bytes
   ([#nfr-repro](#nfr-repro)).

### #feat-dedupe — inventory without silent deletion
SHA-256 of bytes, SHA-256 of canonical RGBA, and 64-bit dHash per asset; a
report (`public/analysis/dedupe-report.json`) lists duplicate *candidates*.
Visually repeated poses are evidence, never deletion candidates.

### #feat-flaw-analysis — FLAW-01..05 on the real sheet
- **FLAW-01 half-cycle duplication:** mean IoU(frame k, frame k+4) ≥ 0.75 ⇒
  duplicated poses (sheet measures ≈0.93).
- **FLAW-02 no alternation:** lead-leg identity never swaps across 8 frames
  (near foot stays rear, far foot stays front).
- **FLAW-03 zero crossover:** minimum horizontal foot separation never < 0.2×
  figure width (sheet ≈147 px of ≈180 px figure).
- **FLAW-04 registration drift:** ground-line jitter > 8 px and height variance
  > 8 px without matching flight phases.
- **FLAW-05 chroma spill:** magenta-like opaque pixels remaining after naive
  single-tone key > 0 (two-tone + JPEG fringes).
Outputs `public/analysis/source-flaws.json` + human tables in
[#gait-cycle-visual-audit](#gait-cycle-visual-audit) evidence entries.

### #feat-gait — the replacement cycle
`p = fract(t · cadence/120)`; far leg at `fract(p+0.5)`.
- **Stance:** sole reference travels `reference.x = travel · (0.5 − p/duty)` on
  the ground line; foot roll: midfoot flat → sole roll → heel-off rotation about
  a planted toe (≤52°) → toe-off; the ankle target derives from the rolled shoe.
- **Swing:** `u = (p−duty)/(1−duty)`; horizontal cubic Hermite matching stance
  velocity at both endpoints; vertical lift `−lift·sin²(πu)`; dorsiflexion for
  clearance then flat landing.
- **Pelvis:** two-beat sinusoidal bob (compression + flight); forward lean shifts
  the pelvis ahead of unchanged contact paths and inclines the torso.
- **IK:** two-bone analytic circle intersection, knee forward; unreachable
  targets clamp along the hip→target direction preserving lengths.
- **Arms:** opposed swing, same-side opposition to the leg, profile elbow flex.
- **Neck/head:** independent cervical segment; phase-lagged head pitch keeps the
  gaze near level.
- **Walking families:** duty > 0.5 with two double-support windows, heel-first
  contact (−15° settling flat), toe-off ≈40°, lower clearance, taller pelvis,
  relaxed arms; brisk-walk scales cadence/swing and shrinks double support; no
  flight phase in either walking profile.

### #feat-render — one solver, two painters
Paint order: far arm → far leg → pelvis → torso → neck → head → hair → near leg
→ near arm; capsules for limbs, rolled polygon shoe, kit colours per persona.
Overlays: skeleton (joint sticks + labels) and onion-skin (±2 phases at 35%
alpha). Panels: light (`#f5f5f5`) and dark (`#141414`) grounds plus a joint
overlay panel for audits. The browser Canvas2D painter and the pure-TS raster
painter consume the same paint ops ([#nfr-two-painters](#nfr-two-painters)).

### #feat-export
- 8-phase sprite sheet PNG (1280×160 per persona scale) named
  `{persona}-{motion}-cycle.png`;
- 16-phase audit sheet (light/dark/joint panels per phase, labelled footer);
- 8-phase filmstrip per persona;
- SVG frames: each of the 17 parts emitted in REST shape inside a `<g>` whose
  exact `matrix(a b c d e f)` maps rest → posed (back-to-front), stitched by
  `src/lib/vector/stitch.ts`. Raster-part contour vectorisation (Moore-neighbour
  trace + Douglas–Peucker) remains deferred as CROSS-012 — rectified 2026-10-17
  in TURN-L02 (the Stage-2 stitcher is pose-native, not contour-traced).

### #feat-workbench — the app surface
See [#surf-workbench](#surf-workbench).

### #feat-ledger — live n-way comparison
`tools/compare-branches.ts`: `git fetch origin refs/heads/<b>` per tracked
branch, `rev-parse FETCH_HEAD`, commit time/subject; optional `gh pr list`
state; writes `docs/BRANCH-TIPS.json`, appends `docs/BRANCH-HISTORY.json`
(append-only, deduped), patches the marked region of
`docs/N_WAY_COMPARISON.md`; offline ⇒ non-zero exit, stale hashes labelled.

---

## 3. Surfaces

### #surf-workbench
Single page, sections in DOM order: header (title + provenance link),
stage (canvas + support indicator + phase label), controls (play/pause, step
±, scrub, fps, motion select, persona select, overlays toggles, reset),
filmstrip (8 labelled phases, click-to-scrub), library (source sheet image,
extracted frames grid, generated filmstrip), diagnostics (flaw table + cycle
metrics of the *generated* cycle), export buttons (sheet PNG, audit PNG).
Every interactive element carries a `data-testid` (CLAUDE-conventions.md).

### #surf-original-compare
The source JPEG displayed with its extracted 48 frames, explicitly labelled as
the flawed reference — never relabelled as a persona or a fix.

---

## 4. Non-functional requirements

- **#nfr-repro:** `npm run pipeline` is deterministic; two consecutive runs
  produce byte-identical `public/**` artefacts (tested).
- **#nfr-rig:** bone lengths invariant across φ and profiles (tested per profile
  over the UI range).
- **#nfr-two-painters:** raster painter and canvas painter share
  `src/lib/render/paint-ops.ts`; a pose ⇒ identical op list (tested).
- **#nfr-honesty:** CLAUDE-validation.md vocabulary; `docs/VALIDATION.md`
  records what actually ran per delivery.
- **#nfr-parity:** feature parity across all n branches is the terminal goal;
  parity requires behavioural acceptance + visual review, tracked in
  [`N_WAY_COMPARISON.md`](N_WAY_COMPARISON.md).
- **#nfr-perf:** pose solve + paint of one 512×512 frame < 50 ms on the sandbox
  CPU; filmstrip tool < 10 s.

---

## #image-prompt-log
Append-only verbatim prompt audit (CLAUDE-decisions.md §2).
_No `generate_image` calls made yet in this branch. Photographic-persona prompts
will be logged here, verbatim, when spent (CROSS-011)._

## #gait-cycle-visual-audit
Append-only visual findings. Entries cite the sheet path, the persona/motion,
and what was looked at.

### VA-01 · 2026-10-17 · Stage-2 first visual pass
Sheets: `public/renders/filmstrip-{wei-ming,mei-lin}-run.png`,
`public/renders/audit-wei-ming-run.png` (rows 1–2 inspected at 2× zoom),
method: rendered PNGs viewed as images (provenance category 2).
- **Found & fixed:** (a) per-panel `clear()` wiped the whole sheet — only the
  last panel survived; replaced with temp-buffer `paintCell` blitting;
  (b) cell scale 1/130 cropped the head — retuned to cell/150, ground 0.86;
  (c) upper arms painted in kit colour vanished against the torso ("T-rex"
  look) — arms are skin-toned now (sleeveless kit); (d) hair circle (0.98 r)
  swallowed the face — reduced to a 0.75 r cap offset (−0.45 r, −0.45 r).
- **Accepted stylisations:** 10° torso lean reads subtle at capsule radius 8;
  far arm is occluded by the torso near swing extremes; shoe blocks are
  rectangular (no toe spring); no facial features beyond the face plane.
- **No seam class observed** at audit zoom: ankles stay attached through
  heel-off, soles meet the ground row in stance, flight scissoring reads.
- **Limits:** single rater (agent), 2× zoom, run profile only this pass;
  walk/brisk sheets generated but not yet inspected (next turn).

### VA-02 · 2026-10-17 · audit sheet format check
`audit-wei-ming-run.png` rows 1–2: light/dark/joint panels align per phase,
joint overlay sticks land on hips/knees/ankles/toes, dark panel contrast OK,
no panel bleed (temp-buffer blit). Label sidecar
`public/renders/audit-labels.json` carries the panel order (raster has no font).

## #continuous-learning-log
Append-only, sequential `TURN-Lnn`. See entries below.

### TURN-L01 · 2026-10-17 · Branch founding: n-way survey, greenfield adoption, Stage-1 specs
- **Trigger:** user request to adopt `wshyang/greenfield`, merge the good parts of
  every sibling branch's CLAUDE/FDS, keep a live n-way ledger, then implement.
- **Evidence (read code / pinned):** upstream greenfield `8ba74027be5fad41e48cadde82cc0120d628b109`
  (GREENFIELD.md 479 lines, FDS_BUILDER.md 728 lines, initial-templates ×4);
  `origin/main` `396ce256debcb5bdc2419cc0f3f399730b61ab36` (1 JPEG);
  PR #1 `arena/917ef347` tip `e172b0f1f8d9b640b65a4ba420f71965693adb23` (497 files,
  +23,522); PR #2 `arena/263385da` tip `b227e2fe562be341f15f58955f539d325170729e`
  (161 files, +14,194); PR #3 `arena/77ffb088` tip
  `43352cf3fe8cb6c486aa79a59954d5972a5e13ac` (348 files, +45,740);
  `arena/ce6d2a6e` tip `bab689cdac3ba730138bfae09dda537978d61e09` (123 files);
  PR #4 `arena/64422739` tip `1a815d502f87cc88c5ded7ccd41f454c72a31b38` (35 files).
  Detached extraction to
  `/tmp/branches/*`; session branch never switched. **Viewed output:** the source
  JPEG at half scale (ImageMagick) — columns 5–8 visibly repeat 1–4 with the same
  lead leg, confirming FLAW-01/02 first-hand.
- **Learnings adopted:** PR#1 verbatim prompt log + TURN-Lnn + provenance
  categories + audit skill; PR#2 SPEC/FDS split, motion families, mutation
  exceptions, reusable skill; PR#3 self-refreshing ledger artifacts, domain
  `lib/` layout, adoption queue, retire-exclusivity; ce6 manifest pivots +
  smallest-split clarity; PR#4 n-way rows incl. main, parity≠hash, CROSS-* ids.
- **Rejected/deferred:** React framework (vanilla view/model keeps the bundle
  dependency-free; the component/hook rule maps cleanly — ADD-003); `@napi-rs/canvas`
  (native binary; pure-TS raster gives byte-reproducible pixels instead — ADD-007);
  Playwright e2e now (no downloadable browser; ADD-006); photo rig + SVG-from-photo
  (needs image budget; CROSS-011 with exit criteria).
- **Strengths here (evidence-backed):** the ledger tracks **6 rows including
  `main` and PR #4's own harmonisation**, which no sibling does; the raster is
  dependency-free *and* shared by tests/exports/app (siblings split canvas vs
  tests); FDS anchors are cited by every addendum.
- **Validation run:** none yet (specs-only turn; npm install in progress).
- **Next:** Stage-2 implementation, then audit-sheet visual pass, then refresh
  ledger after push.

### TURN-L02 · 2026-10-17 · Stage-2 implementation: engine, pipeline, workbench, audits
- **Trigger:** user stage plan — after Stage-1 specs, implement toward parity.
- **Evidence (executed):** `npm run validate` = typecheck + 66/66 vitest (11
  files) + build; `npm run pipeline` twice (byte-identical artefacts);
  `npm run branches:compare` (7 rows, full SHAs, PR states from `gh`);
  images viewed: source sheet half-scale, filmstrips, audit rows 1–2.
  **Evidence (read):** own tree only this turn; sibling SHAs unchanged since
  TURN-L01 (ledger §1).
- **Learnings:** (a) two-tone magenta needs a *divider-only* predicate for grid
  detection (cell field #FD49FD is itself magenta-like — first detector found
  8×25); (b) heel-off rotation moves the ankle, so swing must start at the
  rotated toe-off point and land at foot-height (or heel-strike height for
  walks) or the cycle telescopes/penetrates the ground; (c) panel painters must
  blit through temp buffers — a shared clear() silently deletes siblings' work
  (caught only by the visual pass, tests were green); (d) audit zoom catches
  what metrics cannot: invisible kit-coloured arms, face swallowed by hair.
- **Adopted/rectified:** ADD-008 profiles kept; CROSS-010 closed (extraction
  native); FDS #feat-export rectified (pose-native SVG stitcher; contour
  tracing stays CROSS-012); VA-01/VA-02 recorded.
- **Rejected:** contour-traced raster→SVG this turn (CROSS-012 exit criteria
  unmet); photo personas (CROSS-011, needs image budget); Playwright (ADD-006).
- **Strengths (evidence-backed):** 66 real-input tests incl. full-sheet
  forensics at published magnitudes (IoU 0.921 vs siblings' 0.925/0.947 ranges);
  one solver → two painters (canvas + raster) with pixel assertions; 7-row
  main-inclusive ledger none of the siblings has.
- **Validation run:** see `docs/VALIDATION.md` delivery table (all ✅ rows).
- **Next:** walk/brisk visual pass; browser smoke in preview; Q1 photo rig once
  image budget approved; refresh ledger after push (post-push rule).
