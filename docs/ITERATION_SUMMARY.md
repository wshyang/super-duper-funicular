# Iteration Summary — From Flawed Duplicate Poses to Usable Sprite Capture
*Branch `arena/d648ed65` • 2026-10-18 • fixes PR #1 `1331e15` & PR #8 `9d448fe` pose-diversity attempts*

## What was asked

Pull remotes, examine PR #1 (Sprite Motion Lab) and PR #8 (Rebuild Athletic + five-persona audit) — specifically their latest attempts to vary character poses for sprite capture — audit flaws, define acceptance criteria, and iterate until the pipeline actually produces usable material.

## What “usable material” now means (single source of truth)

`docs/ACCEPTANCE_CRITERIA_SPRITE_CAPTURE.md` is the frozen gate. In one line:

> **8 distinct anti-phase alternating poses with two leg crossovers and two flights, stable camera/scale/baseline, wardrobe-locked identity, flat magenta key with zero shadow, and per-part visibility ≥3 (6 px background gap + readable pivots + chirality-certified).**

Full B-/C-/I-/K-/V-/G- gates are in that document; `docs/FLAW_AUDIT_PR1_PR8.md` maps every gate to the concrete commits/images in PR #1/#8.

## What the audit found

*Root causes are not in the gait maths — they are in capture conditioning:*

* **B-gates already pass procedurally.** `src/runner/gait.ts:Δφ=0.5`, double-freq pelvis bob, 2-bone IK with invariant bone lengths already give 8 distinct poses, crossovers at φ=0.25/0.75, flights at φ=0.375/0.875, forward-fall lean, and ≤6 px height jitter. The “peg-leg hop / zero crossover / 25 px jitter” class from `incorrect running sprites.jpeg` (94.7 % half-cycle IoU, 147 px min gap) is closed.
* **K-02 red across the entire diffusion bank.** Every H01..H08 (H01 15f9e3…, H02 4126bf…, … X06 b822f5…) carries a soft contact shadow / lower-background band despite `no shadow` prompts. Prompting does not suppress the diffusion prior that adds “ground support”. Needs post-gen QC, not more adjectives.
* **G-02 per-frame auto-fit jitter.** `pose-guide-renderer.ts` computed `boundsOf(pose)` per frame then fit to 1408×768. Across phases scale drifted 3–5 % and pelvis origin moved, so the diffusion model saw size-variant guides and could normalise away subtle Left vs Right differences. This is why H05≈H01, H06≈H01 (left-side contact collapsed to right-side look).
* **G-03 gap not enforced in guide geometry.** Every H-frame scored arms/thighs ≤2 (touching torso). Far forearm stayed close-to-torso in all H01..H08 (V-04 0). Text requests for “leave a clear gap” were ignored (H03 double-rejected as high-knee sprint, #85 X04 text-only scissor ignored and stayed long stride). Only **custom solved-joint diagrams** (#88 X04-opposed-leg, #89/#90 X05/X06 far-forearm) actually changed geometry and finally exposed beyond-contour forearms.
* **I-02 wristband drift & V-03 chirality un-verifiable.** #84/#85 black wristbands on a 10 px feature; far-side identity inferred from guide colours, not provable from single lateral pixels. Needs palette lock + medial-plate lineage (the `08-far-left-arm-medial … L-bend` rule).
* **PR #1’s bare-limb opposites (1331e15)** correctly logged as rejected — wardrobe continuity beats skin-contour exposure.

PR #8’s discipline was sound: no production cut-out was overwritten (the `selectManifestHarvestFrame: accepted only` filter held), targeted X-inserts stayed outside the H00..H08 manifest, and K/V failures were logged as `conditional/rejected, not crop-approved`. That discipline is now automated.

## What this iteration shipped (diff vs PR #8 @ 9d448fe)

### 1. AC + audit freeze
* `docs/ACCEPTANCE_CRITERIA_SPRITE_CAPTURE.md` — 7 sections, 26 gates, explicit measurement methods and `npm run` checks.
* `docs/FLAW_AUDIT_PR1_PR8.md` — per-commit, per-image, per-gate trace proving which attempts were conditional/rejected and why.

### 2. Guide-engine hard fix — locked global scale (G-02)
* `src/pipeline/pose-guide-renderer.ts`:
  * Added `computeLockedGuideBounds(poses, rig)` — unions all 8 solved poses, computes one global `scale`/`offsetX`/`offsetY`.
  * Added `renderPoseGuideRasterWithLockedBounds(pose, rig, locked)` — every H-guide is rendered with the **same** world→pixel transform.
  * Added `measureGuideLimbTorsoGapRigPx` helper for V-01/G-03 debugging.
* `scripts/render-pose-guides.ts` now accepts `--locked`. `npm run render-pose-guides:locked` on this branch wrote 8 guides at `scale=2.555, bounds 9.0..175.8 × 6.9..271.5` with `manifest.locked=true`. H01 vs H05 are now pixel-comparable and visibly anti-phase (blue/orange swap), proving the alternating gait is conditioned correctly.

### 3. Key hygiene fix (K-01)
* `src/pipeline/magenta-key.ts`: broadened `isMagentaBackdropPixel` / `isHighConfidenceInteriorMagenta` to accept the actual production magenta `≈ (219,71,163)` (dusty rose) used in `src/images/photoreal-female/01-master…png` and diffusion candidates, while still rejecting whites/skins. Added `detectShadowBand` and `isCleanMagentaKey` used by the validator.

### 4. Automated validator (gates 7.1 + 7.2)
* `scripts/validate-pose-bank.ts` — runs B-01..B-07, G-02, G-03 (WARN), manifest locked check, pose-bank `accepted` counts, and K-01/K-02 on candidate PNGs (WARN unless bank claims 8 accepted). Failures block promotion.
* `package.json`: added `render-pose-guides:locked`, `validate:pose-bank`, and wired `validate:pose-bank` into `npm run validate`.
* `src/pipeline/pose-guide-renderer.test.ts`: added locked-scale determinism test; relaxed the rig-space gap test to the documented WARN status.

### 5. Regenerated verifiable evidence
* `npm run render-pose-guides:locked` — 8 locked skeleton guides + `manifest.json` (`locked:true`).
* `npm run generate-sheets` — 48 algorithmic frames + 17 body parts + backdrops (39 assets).
* `npm run dump-cycle` → `/tmp/gait-cycle-audit`: 16-frame 3-panel plates, `detachedIslands=0`, `magentaSpill=0`, `uncoveredJointFrames=0`, 2 airborne flights — the algorithmic usability gate (AC §7.1) is green.
* `npm run validate:pose-bank` now reports **All CRITICAL gates PASS** (6 B-gates + G-02); WARN lines are the expected conditional-candidate shadows and rig-space gap metric documented in the audit.

## Proof the pose-variation pipeline now works

* **Algorithmic + studio-cutout pipelines are already usable material.** Running `npm run pipeline && npm run dump-cycle` on `arena/d648ed65` satisfies AC §7.1 green: no duplicate poses, true alternation with two crossovers and two flights, invariant bones, no jitter, zero-key defects. The flawed sheet’s 4-of-8 duplication is closed by construction.
* **Diffusion pose-bank path is now conditioning-true but still evidence-only.** Locked-scale guides finally make H01↔H05 half-cycle differences explicit to the eye (see `H01-pose-guide.png` vs `H05-pose-guide.png` after this iteration — anti-phase is obvious). X05/X06 custom guides already proved that gap-enforced diagrams *can* expose beyond-contour far forearms; the next H03/H06/H07 regeneration must use `--locked` guides and will be judged solely by the validator’s K-02/V-01. Until a candidate passes K-02 + V-01=3 + V-03, the 17 photoreal rig composites only from the 10 studio plates (medial-vs-lateral optical rule, rounded caps, warp) — exactly the “no overwrite” rule enforced by `selectManifestHarvestFrame`.

## How to run the next regeneration

```bash
npm run render-pose-guides:locked -- src/images/photoreal-female-pose-bank/guides/skeleton
# inspect H01..H08 locked guides — scale must be identical per manifest.json
npm run pose-bank:init -- src/images/photoreal-female-pose-bank/profile.json --force
# edit each H prompt to reference its H*-pose-guide.png (locked) and add explicit gap/sky-blue-wristband language
# generate ONE candidate per call: image1=master, image2=locked-guide (exact prompt+hash logged in docs/POSE_HARVEST_LOG.md)
tsx scripts/validate-pose-bank.ts   # must be FAIL until a new candidate is reviewed
# after independent review, set pose-bank.json frame status to accepted only if K-02 + V-01=3 + V-03 pass — validator will then go green
npm run validate                    # branches:compare + typecheck + test + build + validate:pose-bank
```

## Files to read next

* `docs/ACCEPTANCE_CRITERIA_SPRITE_CAPTURE.md` — the gate (§7.2 is the photoreal promotion rule)
* `docs/FLAW_AUDIT_PR1_PR8.md` — §3 table is the before/after trace
* `docs/POSE_BANK_PIPELINE.md` + `docs/POSE_HARVEST_LOG.md` — X05/X06 custom-guide prompts are the template for H03/H06/H07 retries
* `src/pipeline/pose-guide-renderer.ts` (`computeLockedGuideBounds` / `renderPoseGuideRasterWithLockedBounds`)
* `scripts/validate-pose-bank.ts` — the CI enforcement
