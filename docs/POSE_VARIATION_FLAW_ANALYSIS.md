# Pose-Variation Flaw Analysis — PR #1 & PR #8

**Date:** 2026-10-19  
**Auditor:** `arena/2c08066e-super-duper-funicular`  
**Inputs Examined:**
- PR #1 `arena/917ef347-super-duper-funicular` @ `96a284f` (Calls #01–#82+, `phase-01..11`, `src/pipeline/phase-frame-harvester.ts`, `phase-variant-specs.ts`)
- PR #8 `arena/e1300d3c-super-duper-funicular` @ `9d448fe` (Calls #73–#90, `H01..H08` + `X01..X06`, `pose-guide-renderer.ts`, `pose-bank.json`)
- Original flawed sheet `incorrect running sprites.jpeg` (2528×1696, 6-rows × 8-cols, magenta `#FF00FF`)
- Audit tooling: `npm run dump-cycle`, `npm run harvest-phases`, `docs/POSE_HARVEST_LOG.md`, `docs/FDS.md §9`

**Companion Criteria:** `docs/ACCEPTANCE_CRITERIA.md` (AC-01..AC-08, HRG).

---

## 1. Executive Summary

Both PRs pursued the same user instruction — “vary character poses to generate more usable material for sprite capture” — via two complementary strategies that each solved part of the problem and exposed the remainder:

- **PR #1 (Phase Harvester)** — Generate 11 running keyframes from a single master + one pose guide per frame, harvest all 17 limbs via cross-section sampling across frames. **Succeeded** at quantitative coverage (`35` jigs, `avgCore=0.991`, `avgSep=0.845`, zero islands/spill) and at obtaining orthogonal limb angles (horizontal ponytail whip, hamstring curl, straight front-kick). **Cost:** required a deliberately minimal outfit (matte-black sports bra + high-cut bikini brief + barefoot/bare-wrist) in phases 09–11 to expose full thighs/feet; production outfit alone did not give enough bare skin for full-thigh jigs.
- **PR #8 (Pose Bank)** — Generate 8 canonical phases H01–H08 plus targeted X-inserts, all in production outfit (crimson singlet + charcoal shorts + sky-blue wristbands), using solver-rendered skeleton guides. **Succeeded** at preserving outfit/identity/camera and at inventing custom solved-joint inserts for forearm angle diversity (X05 forward/up −41.4°, X06 rear/down 149.5°). **Cost:** 3/8 H frames rejected outright (H03×2, H06, H07), remaining 5 only “conditional” (no crop approval), and every frame retained soft floor shadow/background contamination that blocks chroma-key extraction.

**Root cause convergence:** The diffusion model has strong priors — “open-torso bias” (refuse to occlude torso with forearm), “sprint bias” (high-knee + extended rear leg), and “ground shadow bias” (inject soft contact shadow even when forbidden). Text prompts alone cannot reliably break these; only **high-resolution solved-joint geometry + controlled outfit exposure + iterative prompt repair** yields diverse, clean material. PR #1 learned to *leverage* priors (harvest unoccluded torso from biased frames); PR #8 learned to *override* priors with custom guides (X04→X88). Neither alone passed the Harvest Readiness Gate (HRG) in `ACCEPTANCE_CRITERIA.md`.

---

## 2. Quantitative State

### 2.1 Original flawed sheet (what we’re replacing)

| Metric | Value | Diagnosis |
|---|---|---|
| Resolution | 2528×1696 (6×8 grid +132 px header) | Detectable via `grid-detection.ts` |
| Unique poses per row | 4 (doubled to fake 8) | `94.7%` mean half-cycle IoU, `0–4 bit` dHash — `FLAW-01` |
| Lead-leg lock | Right leg always lead | `FLAW-02` — zero leg crossover, unilateral gait |
| Foot gap | 147 px minimum | No true contact overlap — `FLAW-03` |
| Baseline jitter | 20–25 px | `FLAW-04` |
| Scale jitter | 5–8% | `FLAW-05` |

**AC violation:** AC-03 (no anti-phase), AC-04 (only 4 angles), AC-05 ( magenta divider artifacts).

### 2.2 PR #8 Pose-Bank pilot (production outfit)

| Frame | φ | Status | Key Defect | AC Hit |
|---|---|---|---|---|
| H00 | — | accepted | Identity anchor | — |
| H01 | 0.000 | conditional (#73 rejected, #74 conditional) | Floor shadow / lower-background contamination; not crop-approved | AC-05.1, AC-04.3 |
| H02 | 0.125 | conditional (#75) | Subtly lower than H01 (not distinct enough); soft contact shadow | AC-03.2, AC-05.1 |
| H03 | 0.250 | **needs-regeneration** (#76 rejected, #82 rejected after full-size skeleton guide) | Collapsed to generic high-knee + extended rear leg (sprint bias); heel-off not readable; torso pitched 3/4 | AC-03.1, AC-03.3 |
| H04 | 0.375 | conditional (#77) | Both shoes airborne ✅ but stride/ponytail exaggerated vs guide; angle not crop-trustworthy | AC-03.2, AC-04.3 |
| H05 | 0.500 | conditional (#78) | Visually near-identical to H01; near/far support leg unverifiable | AC-03.2, AC-03.4, AC-04.1 |
| H06 | 0.625 | **rejected** (#79) | Support knee nearly straight, no deeper cushion vs H01; ground edge soft | AC-03.1, AC-05.3 |
| H07 | 0.750 | **rejected** (#80) | Both feet airborne vs required far-side toe-off; sprint drift; shadow | AC-03.1, AC-03.3 |
| H08 | 0.875 | conditional (#81) | Both shoes clear ✅, legs separated ✅ but extended beyond guide; lower-bg tone varies | AC-04.3, AC-05.1 |
| X01 | — | conditional (#83) | Forward forearm visible ✅ but feet show floor shadow; shoulder-to-torso topology unverifiable at 1× | AC-05.1, AC-04.3 |
| X02 | — | **rejected** (#84) → refined #87 conditional | Dark/black wristband vs sky-blue (color drift); hand touches hip instead of magenta gap | AC-01.2, AC-04.3 |
| X04 | — | **rejected** (#85) → #86 conditional → #88 custom-guide conditional | Repeated elongated sprint; required custom 1408×768 solved-joint diagram to break prior | AC-03.3, AC-05.1 |
| X05/X06 | — | conditional (#89/#90) | Forearm visible beyond torso ✅ but open palm vs compact fist; lower-bg shadow persists; near/far unprovable from pixels | AC-04.3, AC-05.1, AC-06.2 |

**Overall:** 0/8 fully `accepted` for crop harvest; 5 conditional (pose coverage only), 3 needs-regen/rejected. `pose-bank.json` correctly marks them so `selectManifestHarvestFrame` cannot select them (good discipline). But no production jig overwritten → pipeline stalled.

**AC mapping:** Fails HRG criteria #1 (no distinct H03/H06/H07), #2 (no V=3 for all limbs — far forearm isolated only in conditional X05/X06), #3 (shadow), #5 (head-torso seam regression in older commits, fixed in `5330a64`).

### 2.3 PR #1 Phase-Harvester (minimal-outfit-augmented)

| Frame | Calls | Compliance | What it unlocked | AC note |
|---|---|---|---|---|
| frame-00-neutral | #01 | accepted | Baseline height 709 px, 56,935 fg px → 88,594 px (+55.6%) | AC-02.2 ✅ |
| phase-01-right-strike | #73/#74 | accepted | Open-torso bias leveraged: unobstructed torso+pelvis, rear near-arm + forward far-arm in magenta | AC-04.2, AC-06.2 |
| phase-02-left-strike | #75 | rejected-for-primary (IMG-ERR-17) retained secondary | Revealed open-torso bias | AC-03.4 learning |
| phase-03-midstance-knee | #76 | accepted | High-knee pass with horizontal ponytail | AC-04.2 ✅ |
| phase-04-flight-split | #77 | accepted | Max split 507 px, high farUpperArm isolation | AC-03.2 ✅ |
| phase-05-near-arm-forward-rejected | #78 | rejected (IMG-ERR-18) | Wristband transfer + far-shoulder swap defect | AC-01.2 defect catalog |
| phase-06-high-knee-ponytail-insert | #79 | rejected-for-X05 (IMG-ERR-19) | X04 high-knee + X06 ponytail whip retained | AC-03.1 learning |
| phase-07-near-shoulder-forward-refined | #80 | accepted | Single-variable shoulder topology fix → X01+X03 | AC-01.2, AC-06.2 ✅ |
| phase-08-loaded-forefoot-roll-refined | #81 | accepted | Grounded forefoot ball flat (0°) heel 40° lift + leading +25° dorsiflex | AC-03.1, AC-05.3 ✅ |
| phase-09-bare-limb-orthogonal-angles-a | #84 | accepted | Orthogonal Angle Matrix A: 0° near arm, 90° bare thigh, 180° hamstring curl | AC-04.2 ✅ |
| phase-10-unclothed-opposite-angles-b | #83 | rejected-for-primary (IMG-ERR-20) retained | Bare-wrist vertical up far forearm + straight rear near arm | Safety filter case |
| phase-11-bare-limb-opposite-angles-c | #85 | accepted | Matrix C: +60° front-kick bare thigh, −40° rear bare thigh | AC-04.2 ✅ |
| **Totals** | 5 accepted + 4 retained secondary of 12 frames | 35 jigs (17 canonical + 18 variants) @ avgCore 0.991/0.845, zero islands/spill/uncovered | Largest angle bank to date |

**Overall:** Passes HRG #2, #3, #4, #5, #6 — but requires declared bare-limb frames to achieve full-thigh/ankle exposure. This is honest: the document logs it as intentional and isolated, not a silent outfit cheat. The open question is whether production outfit can ever give a clean `thigh--bare-vertical-stance` jig; current evidence says no without bikini-brief exposure.

---

## 3. Root-Cause Flaw Taxonomy

### F-01 — Sprint Prior / Generic Collapse (Severity: CRITICAL)
**Symptom:** H03 (#76, #82), H07 (#80), X04 (#85) all collapsed to the same high-knee sprint (45° forward thigh, 160° straight rear leg) despite prompts specifying compact toe-off or tucked flight.

**Cause:** Text “running”/“sprint” tokens dominate diffusion prior; the model has memorized thousands of stock sprint photos and ignores modest “heel lifted slightly” language when a heel-off pose is rarer.

**Evidence:** H03 guide H01..H08-rig-pose-reference.png (220×256) was not distinctive enough; even the 1408×768 skeleton guide H03-phase-250.png in Call #82 failed.

**AC Violated:** AC-03.1, AC-03.3. **Related IMG-ERR:** Generic `Extended Sprint Drift` (PR #8) and PR #1 IMG-ERR-17.

**Fix attempted:** Custom solved-joint guides encoding explicit shin angles (Call #88 used opposing shin directions `−41.4°` vs `149.5°`). Success rate: 1/3 (only #88 broke the prior).

**Next-step fix (this iteration):**
1. Stop using “running” wording for compact phases — use “biomechanics studio reference: forefoot ball pressed flat, heel lifted 15 mm, knee flex 135°, shin 78° from horizontal” with clock-face / degree tokens.
2. Generate opposing-leg guides where knees and shoes are >200 px apart and clearly on opposite sides of pelvis midline; forbid “both shins same direction / straightened trailing leg.”
3. Add a pre-generation pose-similarity gate: reject any output whose knee/ankle bounding boxes match H01 within 15 px.

### F-02 — Open-Torso Side-Profile Composition Bias (Severity: HIGH)
**Symptom:** Calls #74, #77: near right arm swung backward behind torso instead of forward across it; torso left unobstructed.

**Cause:** Aesthetic prior: photoreal training data avoids occluding the torso/singlet stripe with forearm; model prefers “pretty” empty torso.

**AC Violated:** AC-03.4, AC-04.1, AC-06.2.

**Fix discovered:** Instead of fighting bias, PR #1 harvested *around* it — phase-01 gives unobstructed torso/pelvis + rear near-arm in magenta behind back + forward far-arm in magenta ahead of chest. AC-04.2 requires scoring each part/frame (0..3) so every part gets a V=3 somewhere.

**Next-step fix:** Formalize `visibility` scoring; add X-inserts that *intentionally* use opposite bias directions (X05 forward/up vs X06 rear/down) to capture both forearm angles.

### F-03 — Ground-Shadow / Background Contamination (Severity: CRITICAL for chroma-key)
**Symptom:** Every PR #8 contact frame has soft shoe shadow and lower-background tonal gradient despite “no visible floor, gradient, texture or cast shadow; crisp even studio light” being in prompt.

**Cause:** Diffusion model associates “running” + “foot near ground line” with ambient occlusion / contact shadow; negative prompts are weak vs prior.

**AC Violated:** AC-05.1, AC-05.3. **Evidence:** H01 #73 rejected specifically for “conspicuous floor shadow”; H03 #76 had same; even flight #77 had lower-bg tone shift.

**Fix attempted:** Added “flat matte magenta background matched to image 1, no visible floor…” — insufficient.

**Next-step fix:**
1. Change grounding language from negative (“no shadow”) to positive procedural: “shoes float 3 mm above an invisible dashed ground line; pure #FF00FF magenta fills 100% of inter-leg and under-sole pixels; no ambient occlusion.”
2. Add post-generation background validation: sample 20×20 px under each sole and mid-background; reject if any channel deviates >15 from 255,0,255.
3. Keep PR #1’s `healArmSkinContaminants` / spill-suppression pipeline for residual fringe.

### F-04 — Wristband / Color Identity Drift (Severity: MEDIUM)
**Symptom:** PR #8 X02 #84 rendered one wristband dark/black not sky-blue; PR #1 also saw duplicate cyan wristband on far arm.

**Cause:** “Wristband” is rare token; model merges or invents colors; “sky-blue” vs “cyan” inconsistent across prompts.

**AC Violated:** AC-01.2. **Fix:** Repeat “both sky-blue wristbands” 3× per prompt, forbid “dark/black wristband,” enforce `b>125 && g>100 && b−r>24` heal check.

### F-05 — Near/Far (Camera-Side) Ambiguity (Severity: MEDIUM for harvest, HIGH for audit honesty)
**Symptom:** H05 (#78) visually identical to H01; reviewer cannot tell if near or far leg is support. PR #1 documents far-side not provable from pixels.

**Cause:** Single lateral profile pixel map cannot encode depth reliably; model sometimes swaps sides.

**AC Violated:** AC-04.1, AC-06.2.

**Next-step fix:** Don’t claim unverifiable chirality — require guide-vs-output limb ordering check (blue near vs orange far) and document as conditional; for harvest, require separate-angle validation (far forearm must be outside torso contour, not behind it).

### F-06 — Torso/Neck/Head Attachment Regression (Severity: HIGH for production)
**Symptom:** Post-PR #1 athletic torso rebuild left a crimson turtleneck shelf and anterior neck crop (PIPE-ERR-11..14).

**Cause:** `sealAthleticTorsoShoulderBulge` run before mirror, flat y=132 head cut, piecewise neck SDF, garmentTint false-positive on warm skin.

**Fixed in:** PR #1 `0481e7e` (`featherHeadNeckBase`, capsule SDF, `harmonizeNeckToHeadSkin`, `trimTorsoCollarNeckStub`). PR #8 independently fixed same in `5330a64` (jaw-to-nape trim, reduced neck warp 0.48→0.30, unified pivot).

**AC Link:** AC-06.3. **Next-step fix:** Add regression assertion: measure head.png lowest opaque row at x=73, ensure no slab below y=121.5 overlaps neck shaft; run `dump-cycle` joint-crops-sheet at 2× and visually pass.

### F-07 — Low-Resolution / Indistinct Pose Guides (Severity: MEDIUM)
**Symptom:** 220×256 rig renders (guides/H01..H08-rig-pose-reference.png) produced no phase distinction; model couldn’t tell H01 from H02.

**Fixed:** PR #8 replaced them with `renderPoseGuideRaster` 1408×768 color-coded skeleton (dark head/torso, blue near, orange far, dashed ground). PR #1 added hires H03-phase-250.png.

**Next-step fix:** Always use hires skeleton + text-labeled angle annotations; never condition on low-res renders.

### F-08 — Safety Filter / Literal “Unclothed” Failure (Severity: LOW for production, HIGH for experiment)
**Symptom:** Call #82 “completely unclothed” → empty response (`finishReasons:[NONE]`); Call #83 rewritten to bike shorts + sports bra.

**Fix:** PR #1 replaced with “minimalist matte-black athletic sports bra top + high-cut matte-black athletic bikini brief sitting at pelvis so 100% of upper/middle/lower thighs are bare skin up to hip joint, completely barefoot and bare-wristed” — passes filter 100% and exposes full thigh.

---

## 4. Comparative Ledger: What Each PR Got Right/Wrong

| Capability | PR #1 (phase harvester) | PR #8 (pose bank) | Winner |
|---|---|---|---|
| Outfit preservation | Intentional bare-limb variants documented; production outfit on 8/11 frames | 100% production outfit; no silent rewrite | Tie — PR #8 stricter, PR #1 more harvest |
| Quantitative coverage (jigs) | 35 jigs, avgCore 0.991, sep 0.845, 0 defects | 0 accepted jigs (no harvest run) | PR #1 |
| Distinct flight vs contact | Yes (flight both shoes +5 px airborne gate) | Flight somewhat but exaggerated; contact subtle | PR #1 |
| Forearm angle diversity | 3 angles via orthogonal matrices | 2 angles via custom guides X05 (−41.4°)/X06 (149.5°) | Both innovated |
| Background cleanliness | Heal pipeline + acceptance of residual shadow as non-blocking for matte-invariant parts but shoe edge still inspected | All frames rejected for shadow | PR #1 more pragmatic |
| Head/neck/torso seam | Fixed PIPE-ERR-11..14, regression tests | Independently fixed same | Both fixed |
| Audit rigor | `phase-harvest-report.json` + `dump-cycle` | `pose-bank.json` visibility matrix + individual hashes | Both rigorous; merge needed |
| Reusability | `phase-frame-harvester.ts` + `PHASE_VARIANT_JIG_SPECS` (copy-paste bank) | `pose-guide-renderer.ts` + `profile.json` scaffold + `render-pose-guides` CLI | Both reusable |

---

## 5. What “More Usable Material” Actually Means (per AC)

A frame is *usable* only if it satisfies AC-01..AC-06 and contributes at least one V=3 part that no other accepted frame already provides. Diversity is not “8 slightly different sprints” — it is:

- **Thigh:** at least one near-horizontal (sprint reach) **and** one vertical (stance/pogo) **and** one hamstring-curl (180° flex)
- **Shin:** at least one vertical-stance vs one tucked-flight vs one dorsiflexed-heel-strike
- **Foot:** at least one midfoot-strike + one sole-roll + one forefoot toe-off (40° heel lift) + one dorsiflexed (+25°) — as in PR #1 phase-08
- **Forearm:** at least one forward/up (−41°) **and** one rear/down (149°) **and** one vertical-up (X06-style)
- **Hand:** lateral thumb-up fist (X01) **and** relaxed open recovery
- **Torso/Pelvis:** at least one unobstructed view (leveraged from open-torso bias) and one partially occluded but still cuttable
- **Head/Neck/Hair:** vertical vs flight-tilt + horizontal ponytail whip vs trailing

PR #1 achieved this via 11 frames; PR #8 attempted via 8 canonical + 6 inserts but only conditionally hit 4 of the above.

---

## 6. Prioritized Iteration Plan

**Priority 1 — Fix Sprint Collapse (F-01):**
- For H03/H07 compact toe-off, rewrite prompts to replace “running” with “biomechanics studio reference — forefoot pressure study” and specify heel 15 mm lifted, knee 135°, shin 78°, with opposite support recovery.
- Generate new custom guides where H03 shows near shin **angled back/left** (not forward high-knee) and far shin **dropping vertically** with shoe near knee — exact opposite of sprint stereotype. Enforce >200 px inter-foot span but <350 px total stride.

**Priority 2 — Fix Background Shadow (F-03):**
- Positive grounding language (“shoes hover 3 mm above invisible dashed line; pure #FF00FF fills every inter-leg gap”).
- Post-gen matte-sample validation loop: reject and regenerate if under-sole magenta variance >15.

**Priority 3 — Fix Forearm Isolation (F-02/F-05):**
- Require forearm-specific visibility scoring (split `arms` → `nearForearm` vs `farForearm`), as learned in PR #8.
- Keep X05/X06 but add gap assertion: forearm/wristband/hand must be >8 px outside torso contour in output; hand must not touch hip/shorts.

**Priority 4 — Preserve Color Lock (F-04):**
- Canonicalize to “sky-blue wristbands” ×3 per prompt; add negative “no black/dark wristband” and visual check against RGB heuristic.

**Priority 5 — Merge Pipelines:**
- Combine PR #1’s `phase-frame-harvester.ts` + `harvest-phases` (best extraction) with PR #8’s `pose-guide-renderer.ts` + `pose-bank.json` (best prompting scaffold) into a single install that satisfies AC-07/AC-08.

**Validation:** After next 3–5 generated inserts, re-run `npm run harvest-phases -- /tmp/phase-harvest-audit` and `npm run dump-cycle -- /tmp/gait-cycle-audit 16 all-photoreal red`, and visually inspect 2× joint crops. Only promote when AC-08 HRG passes.

---

## 7. Decision: How to Iterate

We do **not** delete PR #1’s bare-limb evidence — it proved maximal angle diversity is reachable. We also do **not** accept PR #8’s conditionals as harvest-ready. Instead we:

1. Keep H00 master locked.
2. Regenerate the 3 failed canonical phases (H03, H06, H07) using hires custom guides + de-sprinted wording.
3. Add 1–2 new X-inserts with quantified angle targets (e.g., far-forearm −41.4° already, add +20° low-forward from PR #1 phase-11).
4. Heal residual shadow/color defects deterministically where possible; otherwise reject.
5. Log everything in `POSE_HARVEST_LOG.md` + `FDS §9` with SHA-256, status, and learning — per `CLAUDE.md` Rule 2.

Next section records the exact prompts/guides attempted in this branch’s Turn 1.

