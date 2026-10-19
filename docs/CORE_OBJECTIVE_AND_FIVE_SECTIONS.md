# Core Objective and Item Breakdown — Sprite Capture Pipeline
*Synthesis from branches `arena/917ef347` (PR #1), `arena/e1300d3c` (PR #8) and `arena/d648ed65` iteration · 2026-10-18*
*This document satisfies the 5-section sequencing rule: each section is closed before the next is opened.*

---

## SECTION 1 — Core Objective (Distilled) — CLOSED

### 1.1 One-sentence objective

Replace the flawed reference asset **`incorrect running sprites.jpeg` (`2528×1696`, 6 variants × 8 cols)** with a **repeatable, auditable pipeline that can generate usable material for sprite capture** — i.e. an 8-frame complete running cycle (and the 17 clean cutouts that compose it) that animates as a believable alternating-gait run and can be harvested, keyed, warped and shipped without manual cleanup.

### 1.2 What “usable material for sprite capture” means

A frame (or a harvested cutout) is usable **only if** a downstream consumer can do all of the following without hand-editing:

1. Drop the 8 frames on a 220×256 canvas and loop them at ~12 fps and see a *forward-moving* run, not a hop-in-place.
2. Extract any single limb (e.g. `farForearm`, `nearShin`) as a `160×160` RGBA piece with a semicircular pivot that can be rotated ±75° and superimposed without seams, halos or shadow.
3. Recompose the 17 pieces in `zOrder 1..17` at any `φ ∈ [0,1)` and get a topologically consistent body with forward lean, double-bounce bob and two flights.

### 1.3 How we know the starting point fails

`docs/SPRITE_ANIMATION_FLAW_ANALYSIS.md` (and `npm run analyze` on the real sheet) quantifies it:

* **4 poses doubled into 8** — mean centroid-aligned silhouette IoU frame k vs k+4 = **94.7 %**, dHash 1–4/64.
* **Peg-leg hop, no alternation** — same leg leads all 8 cols (front Δx +53..+83 px, rear −93..−126 px never flips).
* **Zero crossover** — min foot separation **147 px** (real run crosses 0 twice, at φ≈0.25/0.75).
* **Jitter** — height 212→232 px (±20 px), baseline 224→249 px (±25 px).

PR #1 and PR #8 kept this sheet as *evidence* (never deleted) and built algorithmic + photoreal pipelines to **beat it by construction**. The photoreal diffusion attempts (Calls #73..#90) proved the gait maths was not the blocker — the capture/key/visibility/chirality chain was.

### 1.4 Scope boundary

* **In scope:** 8-frame *running* cycle (stanceDuty 0.38, 2 airborne phases), plus architectural hooks for `walk`/`brisk-walk` (tested via `GaitConfig.locomotionMode`); at least one photoreal persona (athletic petite `photo-sg-chinese-female`), algorithmic persona, 17 rounded cutouts, SVG vectors, magenta-key + despill, guides, pose bank, CI gates.
* **Out of scope for “usable” gate:** multi-character interaction, front/back views, arbitrary wardrobe, audio, server auth — all documented in `docs/SPEC.md` but not required to pass AC §7.

**→ SECTION 1 CLOSED. No further edits to the objective.**

---

## SECTION 2 — Items Required to Achieve the Objective (with contribution) — CLOSED

Each item is a necessary link; dropping any one makes the output non-shippable even if the others pass.

| # | Item | What it is (one line) | How it directly contributes to the usable-material objective |
|---|---|---|---|
| **I-1** | **Biomechanically Complete 8-Phase Gait Definition** | Canonical names and phase targets at φ = 0, 0.125 … 0.875: Right Contact / Down / Pass / Flight × 2, with ground vs airborne labelling. | Gives the *contract* that 8 (not 4) distinct instants must exist. Without it, duplication (B-01) is invisible and the harvest bank has nothing to hold diverse limbs for. |
| **I-2** | **Deterministic 17-Part Articulated Solver** | `solveArticulatedPose` + `two-bone-ik` + `foot-roll` + `standing-pose`: 17 pieces (head/neck/torso/pelvis + near/far × thigh/shin/foot/upperArm/forearm/hand + hairAccessory), anti-phase Δφ=0.5, length-preserving IK, 2-segment foot, cervical neck, 14° lean + double-freq bob/surge. | Turns the gait definition into *numbers* that never duplicate, never swap lead, always cross twice and always fly twice — by construction, not by luck. It is the only way to guarantee B-03/B-04/B-06 without trusting a diffusion prior. |
| **I-3** | **Identity- & Wardrobe-Locked Masters and Camera/Scale-Locked Framing** | One SHA-pinned neutral right-facing master (`01-master…png` 143b452…af6), verbatim outfit (crimson/white singlet, charcoal shorts, sky-blue bands, white socks/crimson shoes, high ponytail), strict 90° orthographic right profile, centred 1408×768 full-body framing, fixed pixel scale. | Guarantees that when H01..H08 are judged, any difference is *pose*, not zoom, crop, perspective or costume drift (I-02). It also stops the “nude/bare-limb” detour (PR #1 1331e15) from breaking production wardrobe. |
| **I-4** | **Locked-Scale, Joint-True, Gap-Enforced Pose Guides** | 1408×768 solver-rendered skeleton (dark torso/head, blue=near, orange=far, dashed ground), one *global* `scale/offset` for all 8 (computed from union bounds), explicit joint dots ≥5 px and ≥8 px design gaps for the limb being harvested. | The *only* conditioning cue the diffusion model actually obeys. The PR #8 lesson: small 220×256 rig rasters are ignored; text adjectives are ignored; **custom solved-joint diagrams** (X04 #88, X05 #89, X06 #90) finally changed angles. Locked scale stops per-frame auto-fit jitter (G-02). |
| **I-5** | **Shadow-Free Magenta Chroma Key** | Production magenta (`≈219,71,163` for plates, tolerant to 255,0,255) applied as flat matte, border-seeded flood-fill + despill, with shadow-band detection in the 16 px ground strip. | A candidate with a soft contact shadow (every H01..X06 in the log) fails `keyOutMagentaCell` — the shadow becomes a grey halo that cannot be despilled and the shoe pivot is not extractable. K-02 is the most common blocker in the harvest log. |
| **I-6** | **Per-Part Isolation & Chirality-Certified Rounded-Joint Cutouts** | Per-part visibility 0..3 (3 = full segment + both endpoints + ≥6 px background gap on all sides), pivot readability ≤2 px, far-limb chirality provable from medial-vs-lateral optics (90° L-bend `08-far-left-arm…png`) or second view; semicircular rounded caps at shoulder/hip/knee/elbow/ankle/wrist + Hermite blend. | Without visibility 3, a limb cannot be warped without shearing neighbours (V-01). Without rounded caps, rotated joints show corner seams (RECT-01/06). Without chirality proof, a “far” forearm crop is actually a near forearm and the composited run mirrors. |
| **I-7** | **Reproducible Extraction + Quantitative Flaw Diagnosis + Visual Audit + Automated CI Gates** | `pipeline` = dedupe → grid-detect → flood-fill extract → `flaw-analyzer` → `generate-sheets` → `dump-cycle` (16-frame 3-panel plates) + `validate-pose-bank` + `branches:compare` + typecheck/tests/build. | Proves (not asserts) that the output beats the reference: IoU, dHash, foot Δx, baseline, islands, spill, flights are *measured*. The `accepted-only` filter in `selectManifestHarvestFrame` + `validate-pose-bank` prevents a human from hand-waving a shadowy/touching frame into production (AC §7.2). |

*Dependencies:* I-1 → I-2 → (I-3,I-4) → I-5/I-6 → I-7. I-7 validates the chain; I-4 is the only controllable handle on a stochastic image generator, so the audit gates I-7 around I-4.

**→ SECTION 2 CLOSED. Items are frozen; no new items will be added in later sections.**

---

## SECTION 3 — Acceptance Criteria per Item (and how each is measured) — CLOSED

Only **MUST** gates block promotion to production cutouts. **SHOULD** gates are scored. Measurement is *automated where possible*; manual visual review is retained for ponytail/hand closure but never overrides a numeric FAIL.

### I-1 Gait Definition — MUST

* **I-1.AC1** 8 phases exist with names `Right Contact (φ0) … Left Flight (φ0.875)` per `CANONICAL_PHASE_NAMES`. *Measure:* `pose.canonicalFrameIndex == floor(((φ+0.0625)%1)*8)` for all 8 φ, and text in `pose-bank.json`/`FDS.md` matches.
* **I-1.AC2** Each phase has a documented mustShow (e.g. H03 toe-off = forefoot/toes only, heel raised; H04 both shoes airborne) and a target (e.g. “far leg forward swing, knee distinct”). *Measure:* prompt text + guide file hash logged in `POSE_HARVEST_LOG.md` before generation (G-04).

### I-2 Deterministic Solver — MUST

* **I-2.AC1 Distinctness (B-01):** Centroid-aligned silhouette IoU frame k vs k+4 **< 75 %** (ref 94.7 %), pairwise dHash distance **≥ 8/64**. *Measure:* `flaw-analyzer.ts` on extracted sheet; unit test via `solveArticulatedPose` canonical indices differ (`validate-pose-bank.ts B-01`).
* **I-2.AC2 Alternation (B-02):** Near at φ, far at φ+0.5; lead-leg sign flips each half. *Measure:* `pose.nearLeg`/`pose.farLeg` solved at Δφ=0.5; `footCrossoverDeltaX` sign pair both present.
* **I-2.AC3 Two crossovers (B-03):** Zero-crossing of `footCrossoverDeltaX` twice per stride (near φ0.25 & 0.75) with foot separation **≤ 10 px** at cross. *Measure:* `pose.footCrossoverDeltaX` spread (+49.6→−75.3 in current solver) and count `|Δx|<14`.
* **I-2.AC4 Two flights (B-04):** `isFlightPhase` true exactly at φ0.375 & 0.875, both shoes `y < groundY−4`. *Measure:* `dump-cycle` telemetry + `validate-pose-bank`.
* **I-2.AC5 Lean + bob (B-05/B-07):** Torso pitch **−1.45..−1.05 rad** (≈14°+surge), pelvis double-freq bob **≤ 18 px** peak-to-peak, fall-forward COM lead > 6 px at flight. *Measure:* `pose.torsoAngleRad`, `pelvis.y` spread, `fallForwardComLeadPx` in solver output.
* **I-2.AC6 Bone invariance (B-06):** Femur/tibia/humerus/forearm lengths within **1 %** of rig spec across all φ. *Measure:* femur spread < 1.5 px in validator; bounding-box height spread ≤ 6 px.

### I-3 Identity/Wardrobe/Framing — MUST

* **I-3.AC1 Master pin:** `pose-bank.json identityAnchor.sha256` = `143b4521…` and file path exists. Candidate generation uses `image1 = master` only. *Measure:* `pose_bank_pipeline.test.ts` + validator reads anchor hash.
* **I-3.AC2 Outfit verbatim:** Crimson singlet crisp white vertical stripe + charcoal shorts + *both* sky-blue wristbands (ΔE < 8), white socks, white-crimson shoes. *Measure:* manual compare vs master + automated colour check on wrist-band region in validator (K-gate).
* **I-3.AC3 Camera/framing (C-01..C-04):** Strict 90° right lateral, no 3/4, pelvis Y and silhouette height **±3 %**, full hair-to-sole in 1408×768, one person only. *Measure:* guide `lockedBounds` determinism; candidate visual review + pixel height check in `validate-pose-bank`.

### I-4 Pose Guides — MUST

* **I-4.AC1 Joint-true colour code:** Dark centreline + blue near + orange far + dashed ground, line width ≥ 8 px, joint dot ≥ 5 px, no photoreal shading. *Measure:* `pose-guide-renderer.test.ts` colour-set assertion (`0,143,224` near, `239,119,36` far, `239,242,247` bg).
* **I-4.AC2 Locked global scale (G-02):** All 8 H-guides share identical `scale/offsetX/offsetY` computed from union of all-pose bounds. *Measure:* `computeLockedGuideBounds(8 poses)` → `manifest.locked=true` and `drift<0.001` on re-compute (validator + test).
* **I-4.AC3 Gap-enforced (G-03):** For any limb where V-01=3 is intended, the guide already shows **≥ 8 px tight-bbox gap** to torso/adjacent limb in 220×256 rig space. *Measure:* `measureGuideLimbTorsoGapRigPx ≥ 6` (WARN gate today; X05/X06 custom guides are the proof that pixel-space isolation works).
* **I-4.AC4 Prompt/evidence gate (G-04):** Every generation logs exact prompt, master SHA, guide SHA, candidate SHA before review. *Measure:* `POSE_HARVEST_LOG.md` entry exists with named `Call #` and SHA triple.

### I-5 Shadow-Free Magenta Key — MUST

* **I-5.AC1 Flat matte magenta:** Border ring (6 px) **> 98 %** magenta/transparent for studio plates, **> 96 %** for diffusion evidence (tolerant to `≈219,71,163`). *Measure:* `isMagentaBackdropPixel` tolerant range (r≥180 b≥135, r−g≥75 b−g≥55 Δ≤80) + validator `K-01` ring scan.
* **I-5.AC2 Zero shadow/gradient (K-02):** 16 px band above `groundY` contains **≤ 50 shadow px** and ≤ 0.15 % band area with low-luma+residual-magenta. *Measure:* `detectShadowBand` in `magenta-key.ts` (also sampled in `validate-pose-bank`); visual check for floor/gradient.

### I-6 Isolation & Chirality/Rounded Joints — MUST for harvest, SHOULD for diversity

* **I-6.AC1 Isolation V-01=3:** Tight bbox of limb has ≥6 px background gap on *all four sides* vs any other part; both endpoints (e.g. wrist + handTip, heel+ball+toe) inside frame. *Measure:* per-part `visibility` 0..3 stored in `pose-bank.json`; harvest selects only `visibility=3`. Validator warns if `isolatedCount<4/8` for canonical set.
* **I-6.AC2 Pivot readability V-02:** Hip/knee/ankle/shoulder/elbow/wrist pivot ≤ 2 px from true axis, not clipped. *Measure:* 16-frame `dump-cycle` `uncoveredJointFrames==0`.
* **I-6.AC3 Chirality certified V-03:** Far limb provably medial (e.g. 90° L-bend `08-…-inside-palm.png` with thumb atop, inner arch shoe) or second view. *Measure:* lineage field `canonicalJigSource` must point to medial plate or multi-view, not diffusion inference.
* **I-6.AC4 Rounded caps:** Every rotating joint seam is a semicircle (r 80×36, 80×124 on 160×160) + 6 px Hermite blend; thigh cuff is rounded-top/straight-bottom composite. *Measure:* `dump-cycle` `detachedIslands==0`, `magentaSpill==0`, joint-crops-sheet shows caps; `rounded-joint-cutter.test.ts`.

### I-7 Reproducible Extraction / Audit / CI — MUST

* **I-7.AC1 Extraction reproducibility:** `npm run dedupe && npm run extract && npm run analyze` yields `public/sprites/extracted/{variant}/frame-01..08.png` on 220×256, `analysis.json` with IoU/dHash/Δx/height/baseline, and no islands. *Measure:* `pipeline.test.ts` (+ artifact SHAs in `artwork-inventory.json`).
* **I-7.AC2 Audit plates:** `npm run dump-cycle` writes 16 raw frames + 16 three-panel diagnostic plates + contact sheet + joint-crops + `audit-report.json` with `totalDisconnectedIslands==0`, `totalMagentaSpillPixels==0`, correct flight count, `resolvedAssetTuning`. *Measure:* `validate-pose-bank` + manual inspection of `/tmp/gait-cycle-audit`.
* **I-7.AC3 CI gate (AC §7):** `npm run validate` = `branches:compare` + typecheck + tests + build + `validate-pose-bank`. Promotion blocked if any CRITICAL FAIL. *Measure:* exit code 0. The `selectManifestHarvestFrame` filter (only `status=accepted`) is tested in `pose-bank-pipeline.test.ts`.

**→ SECTION 3 CLOSED. Criteria are frozen; measurement methods are fixed.**

---

## SECTION 4 — Challenges to Achieve Each Item — CLOSED

*For each item, the dominant challenge observed across the 90+ calls in PR #1/PR #8.*

### I-1 Gait definition — Challenge

The reference sheet *lies* (“8-frame complete alternating gait”). The natural tendency is to copy its 4 pose names and assume H01≈H05 are half a stride. The true vocabulary (Contact/Down/Pass/Flight × 2, with toe-off vs airborne distinction) only emerges after biomechanical diagnosis, and teams disagree on φ quantisation (0.125 vs 0.0625 centring).

### I-2 Deterministic solver — Challenges

* **Alternation without collapse:** Naively driving both legs at φ gives a hop (B-02); driving at φ+0.5 but with a shared sinusoid gives peg-leg.
* **Crossover without interpenetration:** Feet must *cross under pelvis* yet thighs must not clip pelvis/shorts.
* **Invariant lengths vs ballistic bob:** Pelvis bob + forward lean must not scale bones; naive scaling of the raster scales everything.
* **Foot roll:** Single-point feet skate; a 2-segment heel→ball→toe roll needs chord-tent warping.
* **Flight detection:** Boolean `isFlightPhase` must be solver-consistent (both shoes off baseline), not heuristics on bounding box.

### I-3 Identity/wardrobe/framing — Challenges

* **Diffusion identity drift:** Without a single-master pin, the model slowly lightens skin, shortens ponytail, or re-cuts the singlet between H01 and H08.
* **Wristband colour drift:** 10 px wide sky-blue bands reliably flip to black/dark on rear limbs (PR #8 #84/#85).
* **Camera promise vs prior:** Prompts saying `strict 90° lateral` are often ignored — the model adds 3/4 shoulder twist to “look more dynamic”.
* **Scale leakage:** Per-frame fitting makes H02 look subtly higher than H01 for reasons that are framing, not phase.

### I-4 Pose guides — Challenges

* **Weak cues:** Small 220×256 rig rasters (pilot pre-60ca653) are too coarse for diffusion to follow; the model treats them as “a runner-ish blob”.
* **Full-size cues still below prior:** Even 1408×768 colour-coded skeletons are *suggestions* — H03 was still forced into a generic high-knee sprint twice despite explicit limb-angle language (#76, #82).
* **Auto-fit jitter (G-02):** Per-frame `boundsOf(pose)` → scale varies 3–5 % across phases, so the model sees size-variant cues and normalises away subtle Left vs Right differences (cause of H05≈H01 collapse).
* **Gap illusion:** Saying “leave a gap” in text does not create one; #85 X04 text-only “wider wedge” stayed a long stride, while #88 custom diagram succeeded.

### I-5 Shadow-free magenta — Challenges

* **Diffusion shadow prior:** The model *wants* to add a contact shadow / ground gradient where a loaded foot meets the floor, even when prompted `no shadow, flat matte magenta`. Every H01..X06 candidate carried it (K-02 red).
* **Dusty magenta vs pure:** Production plates use `≈219,71,163`, not `255,0,255`; a pure-magenta-only detector rejects the real background (validator showed 0 % before broadening).
* **Despill vs erasure:** Diffusing the shadow into the sock/shoe leaves magenta fringe that naive keying either keeps (halo) or erodes (thins the shoe).

### I-6 Isolation & chirality/rounding — Challenges

* **Isolation density:** In a compact side-profile run, forearms *want* to sit on the torso; achieving 6 px gap needs the guide to deliberately place the elbow *outside* the singlet contour, which then looks “exaggerated” in rig space.
* **Chirality unprovability:** From a single right-facing silhouette, a blue-fore-outside pixel and an orange-fore-inside pixel look identical. “Looks right-facing” is not proof that the far forearm is far.
* **Joint seams:** Square-cut limb edges rotate as rectangles and show notches; thigh shorts need a cuff, shins need a sock collar.

### I-7 Reproducible pipeline / CI — Challenges

* **Four-way provenance:** The repo runs 5 parallel branch lines (PR #1..#8, PR #8, `arena/d648ed65`); keeping `FDS.md`/`N_WAY_COMPARISON.md` truthful without cross-branch leakage is manual.
* **Human hand-wave:** Without an `accepted-only` filter, a reviewer can promote a “looks good” but shadowy/touching frame into `public/sprites/photoreal/…/parts` and silently regress production.
* **Audit freshness:** 16-frame plates and `analysis.json` go stale the moment the solver or cutter changes but `npm run pipeline` is not re-run.

**→ SECTION 4 CLOSED. Challenges are enumerated as observed, not hypothesised.**

---

## SECTION 5 — How We Aim to Address Each Challenge (per-item plan, already shipped or next-step) — CLOSED

*Each row is one-to-one with the challenge above. “Shipped on `arena/d648ed65`” means code in PR #9; “Next” means the narrow delta for H03/H06/H07 regeneration.*

### I-1 — Address

* **Shipped:** Canonical `CANONICAL_PHASE_NAMES[0..7]` and the 8 solved φ targets in `gait.ts`; `POSE_BANK_PIPELINE.md` Stage 1 locks the neutral master and refuses to overwrite its SHA; `SPEC.md §3.1` fixes the vocabulary.
* **Next:** No change — definition is stable. Only add a second persona’s rig override when a new body is introduced (via `--rig-json`).

### I-2 — Address

* **Shipped:**
  * `solveArticulatedPose(φ, config, rig)` solves near at φ, **far at φ+0.5**, arms counter-phased; `solveTwoBoneIk` preserves exact segment lengths (femur 43 px etc., spread 0.0 px in validator).
  * `computePelvisPosition` double-freq (`cos((φ−0.125)*4π)*8`) bob + `forwardFallSurge` keep height jitter ≤6 px and lean −1.45..−1.05 rad.
  * `foot-roll.ts` + `photoreal-warp.ts` 2-segment heel→ball→toe with `ballPoint` hinge.
  * `pose.footCrossoverDeltaX` and `isFlightPhase` are solver outputs (not bbox heuristics), checked in `validate-pose-bank` (spread +49.6→−75.3, 2 crossers, 2 flights).
* **Next:** None — solver is the stable base; tune per-persona via `persona-reference.ts` scales, not via new maths.

### I-3 — Address

* **Shipped:**
  * `pose-bank.json identityAnchor` SHA pin + `profile.json` wardrobe lock; every generation uses `image1=master` only (`POSE_HARVEST_LOG.md` records SHA triple).
  * `SPEC.md §4.1` persona registry; `sg-chinese-female` studio plates are the *only* promoted photoreal source until the diffusion bank reaches 8 accepted (AC §7.2).
  * `render-pose-guides.ts --locked` removes scale leakage (see I-4).
* **Next:** Add a palette-swatches patch (small sky-blue bar) to the guide’s off-stage margin for I-02 wristband anchoring, if future runs still drift after the guide-lock.

### I-4 — Address

* **Shipped:**
  * Replaced pilot’s small rasters with **1408×768 colour-coded solved-joint diagrams** (`pose-guide-renderer.ts`: dark torso, blue near, orange far, dashed ground, joints ≥5 px).
  * Added `computeLockedGuideBounds(all 8 poses)` → **one global scale/offset** for the whole sequence; `renderPoseGuideRasterWithLockedBounds` enforces it. New run: `scale=2.555, bounds 9.0..175.8 × 6.9..271.5`, `manifest.locked=true` — H01 vs H05 anti-phase is now pixel-comparable (see branch art).
  * Added `measureGuideLimbTorsoGapRigPx` and the lesson “change the guide, not the adjectives” (`FLAW_AUDIT §3.2`): #88 X04 custom diagram (explicit near-leg folded back/up, far leg forward) succeeded where #85 text-only failed.
* **Next:** For H03/H06/H07, author **new locked custom inserts** (like X04 #88 / X05 #89) that place the to-be-harvested limb *outside* the torso contour by ≥8 px in rig space before prompting. Do not reuse the canonical H-guide for those phases.

### I-5 — Address

* **Shipped:**
  * Broadened `isMagentaBackdropPixel` / `isHighConfidenceInteriorMagenta` to the real dusty rose (`r≥180 b≥135 r−g≥75 b−g≥55 Δ≤80`) — validator K-01 on real candidates now reads **100 %** (was 0 %).
  * Added `detectShadowBand` / `isCleanMagentaKey` and validator K-02 shadow-band scan (16 px ground strip). Every H01..X06 now *correctly* reports K-02 WARN (228..382 px) — the prompt alone is proven insufficient, and the gate blocks crop.
  * Border-seeded flood-fill + `despillBoundaryFringe` retained for halo.
* **Next:** Do **not** try a stronger negative prompt. Instead, after generation, run `keyOutMagentaCell` + a **ground-band inpaint** that flood-fills the shadow-connected component back to flat magenta (guided by `detectShadowBand`). If inpaint leaves sock/shoe intact and `isCleanMagentaKey` turns green, promote; otherwise hard-reject and regenerate with a fresh locked guide.

### I-6 — Address

* **Shipped:**
  * Visibility 0..3 schema in `pose-bank.json`; `selectManifestHarvestFrame` **filters to `status=accepted` only** (tested), so `conditional/rejected` never become a `canonicalJigSource`.
  * `dump-cycle` telemetry: `detachedIslands==0`, `magentaSpill==0`, `uncoveredJointFrames==0` — pivot readability proven.
  * `rounded-joint-cutter.ts`: semicircular caps + 6 px Hermite blend + `EndCapCompositeSpec` shorts cuff / sock collar; X05/X06 proved far-forearm gap via beyond-contour elbows.
  * Chirality rule V-03: far cutouts must cite the medial plate lineage (`08-…-inside-palm.png` 90° L-bend, thumb atop) or second view — enforced by `FLAW_AUDIT §3.1` and AC footnote.
* **Next:** Keep far-limb inserts *outside* `H00..H08` until each achieves `V-01=3 + V-03 proof`; only then mint a `poseVariant` with its own source hash and gap measurement.

### I-7 — Address

* **Shipped:**
  * One-command reproducibility: `npm run dedupe && npm run extract && npm run analyze && npm run generate-sheets` → 48 frames + 39 unique assets; `npm run dump-cycle` → 16 plates + `audit-report.json`.
  * `scripts/validate-pose-bank.ts` as the **automated G-02/B/K/V gate** (CRITICAL vs WARN split); wired into `npm run validate` (= `branches:compare + typecheck + test + build + validate-pose-bank`) — exit 0 iff CRITICAL green. PR #9’s `validate` now prints `All CRITICAL gates PASS`.
  * `src/pipeline/pose-guide-renderer.test.ts` locked-scale determinism test; `N_WAY_COMPARISON.md` updated by `branches:compare`.
* **Next:** Treat `validate-pose-bank` as the *sole authority* for promoting a diffusion frame to `accepted`. The upcoming H03/H06/H07 retries will land as three new `Call #91..#93` rows in `POSE_HARVEST_LOG.md` with locked-guide SHAs; only the validator can flip their `status`.

**→ SECTION 5 CLOSED. All per-item mitigations are concrete, traceable to code/log, and leave no open item without an owner.**

---

*Branch `arena/d648ed65` (PR #9) is the execution of Sections 1–5: the algorithmic + studio-cutout pipelines satisfy Sections 1–3 today; the diffusion pose-bank satisfies the same sections after the locked-guide + shadow-inpaint deltas in Section 5.*

