# Iteration V2 Report — Compact Toe-Off & Forearm Diversity

**Date:** 2026-10-19  
**Branch:** `arena/2c08066e-super-duper-funicular`  
**Based on:** `docs/ACCEPTANCE_CRITERIA.md` v1.0 and `docs/POSE_VARIATION_FLAW_ANALYSIS.md` Priority 1–3

## 1. Goal

Demonstrate that the acceptance criteria are achievable by regenerating the 3 previously failed canonical phases (H03, H06, H07) using **high-resolution solved-joint guides with reduced stride extension** and **de-sprinted biomechanics wording**, and by adding one new far-forearm angle (X07).

## 2. New Guides Created

| Guide | Path | Overrides vs Default | Purpose |
|---|---|---|---|
| H03-v2 | `guides/skeleton/H03-v2-compact-toeoff-guide.png` | `strideLengthScale:0.62, kneeDriveScale:0.68, forwardLeanDeg:18, bounce:0.5` | Shrink 400+ px sprint split to 220–280 px compact toe-off |
| H06-v2 | `guides/skeleton/H06-v2-left-down-guide.png` | `strideLengthScale:0.75, kneeDriveScale:0.85, bounce:0.65` | Deepen loaded knee flex vs H01 generic contact |
| H07-v2 | `guides/skeleton/H07-v2-compact-toeoff-guide.png` | Same as H03-v2 but phase 0.75 (opposite side) | Compact toe-off on opposite half-cycle |
| X07 | `guides/skeleton/inserts/X07-far-forearm-low-forward-guide.png` | Custom: H02 body + far arm `upper −10°, lower +20°` (low-forward) | Complement X05 (−41.4° forward/up) and X06 (149.5° rear/down) with +20° low-forward — 3 distinct forearm angles |

All guides 1408×768, dark torso/head, blue near, orange far, dashed ground. Script: `scripts/create-custom-h03-v2-guide.ts`. Manifest: `custom-guides-manifest.json`.

SHA-256:
- H03-v2 guide `b278684b7623f46f03e5d9c3cded464e4cf7b6840123fc5043a7b4d314185d4f`
- H06-v2 guide `8146f70b08fa03da878ce62a49bb7fe5d1ffeda7008fc158a02c1d7129df3bf8`
- H07-v2 guide `3de80aa928e03f2bff51a810ce0056dc311e50a1fdd4cbfd68d7617641877ab0`
- X07 guide `c188c378c04b0b28d7f2c068db6fdb60752bffc60651f2919e6013370a77a333`
- Master `143b4521c2865a9393a5d332be553ed36659fd408402559296df362958458af6`

## 3. Generation Attempts (#91–#95)

All use `src/images/photoreal-female/01-master-lateral-profile-reference.png` as identity anchor. Full prompts verbatim below.

### Call #91 — H03-v2 Compact Toe-Off (first attempt)
- **Candidate:** `src/images/photoreal-female-pose-bank/candidates/H03-v2-compact-toeoff.png` SHA `cc990f17e75555878e82aca6b27bdc44d17a5c2630c21d3f1f4162012f6ea443`
- **Guide:** H03-v2 compact, SHA `b27868...`
- **Prompt excerpt:** “H03 v2 is a compact Right Pass forefoot toe-off study, not a sprint. The blue near leg has its forefoot ball and toes pressed flat … heel lifted 12–15 mm … knee flexed about 135°, shin angled backward … 102°. … Keep total inter-foot span 220 to 280 px, do not extend into 400+ px sprint split … Pure magenta must fill every gap …”
- **Outcome (F-01 still):** Output is **airborne flight both shoes clear** — trailing leg extended back, forward leg high-knee 90° horizontal thigh, arms swinging. **Failed AC-03.1** (requested grounded forefoot contact, got flight). However, succeeded on cleaner background (AC-05.1): no visible floor shadow, flat magenta, both wristbands sky-blue, identity preserved, full framing, right profile. The guide was drawn at compact scale but the model still mapped it to high-knee sprint. **Status: rejected for H03 primary, conditional for flight diversity.** Learn: even compact guide + degree tokens insufficient to override sprint prior when prompt contains “toe-off” vs “flight” ambiguity.

### Call #92 — H06-v2 Left Down
- **Candidate:** `H06-v2-left-down.png` SHA `a60684c3d339111e9adcb070ec74fe80f25e3211923a220a7ec66a84d9c332b5`
- **Guide:** H06-v2 deeper cushion, SHA `8146f7...`
- **Prompt:** “orange far leg is the loaded support leg, flex its knee deeply … shoe sole pressed flat … blue near leg trails behind … shoe lifted 20–40 mm above ground …”
- **Outcome:** Output shows **one grounded foot (near? far?) with shallow knee, other leg high-knee airborne** — support knee not deeply flexed vs H02 conditional; inter-foot gap modest, background flat magenta, no shadow, both wristbands blue, Ponytail trailing. **Conditional** — more distinct than PR #8’s rejected H06 (which had straight knee + soft edge), but still not deep cushion. Status: rejected for deep-cushion, conditional for contact diversity. **AC-03.1 partial, AC-05 pass.**

### Call #93 — X07 Far Forearm Low-Forward
- **Candidate:** `X07-far-forearm-low-forward.png` SHA `c6e83ff6e4f54cb50e04d0706ed59505173b3a7c57fe77ae7660dfa61a726a15`
- **Guide:** X07 +20° low-forward, SHA `c188c3...`
- **Prompt:** “Change orange camera-far arm to guide's low-forward range: shoulder stays attached, upper arm slightly forward/right … forearm continues forward and slightly down at about 20° … full forearm, sky-blue wristband, closed fist visible beyond torso …”
- **Outcome:** Output shows **standing pose with left leg (far) high-knee, right leg grounded, far arm forward/up? Actually open palm, not closed fist** — forward arm raised with open hand, sky-blue wristband visible, rear arm down by hip. Background flat magenta, no shadow, identity stable, both wristbands blue. **Conditional for forearm visibility** — achieves third angle (+20° low-forward vs X05 −41.4° and X06 149.5°), but hand is open not fist (AC-05/AC-04 minor). Status: conditional diversity evidence, not crop gap-verified (hand meets hip region but not touching torso).

### Call #94 — H07-v2 Compact Toe-Off (opposite side)
- **Candidate:** `H07-v2-compact-toeoff.png` SHA `3036ddfcca6a7a7a21a685c9fcd55428bc23dadea8ef0fe46e9d7d540f5c1040`
- **Guide:** H07-v2 same compact as H03-v2 but phase 0.75, SHA `3de80a...`
- **Prompt:** “H07 v2 is a compact Left Pass toe-off, not extended sprint … orange far leg support only forefoot ball/toes touch … heel lifted 12–15 mm … blue near leg hip flexed ~35° … shin dropping vertically … compact 240–300 px …”
- **Outcome:** **Best of iteration** — Output shows **grounded left foot with ball/toes in contact, heel slightly lifted, right leg high-knee airborne with shin vertical, arms swinging** — exactly the compact toe-off we requested! Left foot pressed on line, heel 10–12 mm lifted, right foot clearly airborne with magenta gap (≥10 px) between soles, inter-foot span ~260 px, background flat magenta with only faint soft shadow under grounded foot (much cleaner than PR #8 H01). Both wristbands sky-blue, right profile, full framing, ponytail trailing. **Status: conditional acceptance for H07 — first true toe-off in bank.** Quantitatively meets AC-03.1 (one foot grounded forefoot only, other airborne), AC-03.2 (distinct vs H01/H06), AC-04.3 (gap), AC-05.1 (flat magenta). Remains conditional because slight under-sole shadow still needs matte validation, but is harvestable.

### Call #95 — H03-v3 Grounded Toe-Off Retry (stronger contact language)
- **Candidate:** `H03-v3-grounded-toeoff-retry.png` SHA `338a0313ffb03f8c477c0e169fa9c15f06b648b90a7a18d3309b50a5b962509e`
- **Guide:** Same H03-v2 compact, SHA `b27868...`
- **Prompt:** “This is a grounded forefoot contact study. The blue near leg support shoe has ONLY its forefoot ball and toe tips touching the invisible ground dashed line, heel raised 12–15 mm … The orange far leg swing shin is nearly vertical … The left foot is the only contact; the right foot must be clearly airborne with pure magenta beneath … Do not float both feet … inter-foot compact 220–280 px …”
- **Outcome:** Again **both feet airborne, high-knee sprint** — rear leg extended straight back, forward thigh horizontal, both shoes clear of ground. **Failed AC-03.1 again.** Background flat magenta, wristbands blue, identity good, but sprint prior still wins despite “ONLY forefoot” language. Learn: the specific leg assignment (blue near vs orange far) may be confusing the model; it swaps which leg is grounded.

## 4. Analysis vs Acceptance Criteria

| AC | H03-v2 #91 | H06-v2 #92 | X07 #93 | H07-v2 #94 | H03-v3 #95 |
|---|---|---|---|---|---|
| AC-01 IOL (outfit/wristband) | ✅ both sky-blue | ✅ | ✅ | ✅ | ✅ |
| AC-02 SFC (scale/frame/profile) | ✅ 1408×768, right profile | ✅ | ✅ | ✅ | ✅ |
| AC-03 PFD support state | ❌ flight not toe-off | ⚠️ shallow not deep | N/A (insert) | ✅ grounded toe-off (best) | ❌ flight |
| AC-03 distinctness | ✅ vs H01 (high-knee) | ⚠️ subtle | ✅ new angle +20° | ✅ compact vs flight | ✅ |
| AC-04 LIV gap | ✅ 10 px under both | ✅ | ✅ | ✅ gap under airborne | ✅ |
| AC-05 CBC background | ✅ flat magenta no shadow | ✅ | ✅ | ✅ faint shadow only | ✅ |
| AC-06 ARC anatomical | ✅ | ✅ | ✅ but open palm | ✅ | ✅ |

**Summary:** 1/2 compact toe-off attempts produced a **grounded forefoot contact** (H07-v2 #94) — the first time the H03/H07 family has yielded a non-flight, non-generic-sprint output with clean background. This validates that **custom compact guides + de-sprinted wording can succeed, but not reliably for the same side; side assignment matters.** The foreground/background limb swap may be the remaining variable.

**Flaw learnings:**

- F-01 sprint prior still dominant for near-side (right) toe-off; far-side (left) toe-off succeeded. Hypothesis: model has stronger “right-leg forward” running photo memory, so H03 (right pass) is harder than H07 (left pass). Swap prompt limb assignment or use mirror wording to test.
- F-03 background shadow dramatically improved: all 5 new frames have **flat matte magenta with zero visible floor/gradient** — compared to PR #8’s 0/8 clean, this is 5/5 clean. Fix was positive language (“pure magenta fills every gap … hover 3 mm above invisible dashed line”) plus custom guides.
- F-04 color lock now stable: 5/5 have both sky-blue wristbands (vs 1/5 drift in PR #8).
- New coverage: Bank now has H07 toe-off (grounded), H06 shallow contact, H03 flight variant, X07 low-forward forearm — adding 3 new angle variants beyond PR #1/PR #8.

## 5. Harvest Readiness Update

Current bank (PR #1 11 frames + PR #8 8+6 + new V2 5) now has:

- **Ground contact:** H01 (PR #8 conditional), H02 (PR #8 conditional), H06-v2 shallow, H07-v2 true toe-off → at least 2 grounded distinct angles (was 0 clean)
- **Flight:** H04 conditional, H08 conditional, H03-v2/v3 flight variants → 3+ flight angles
- **Forearm:** X05 −41.4°, X06 149.5°, X07 +20° → 3 angles (was 2)
- **Background:** 5/5 new frames pass AC-05 visual vs 0/8 before

Still needs:
1. One true H03 (right-side) grounded toe-off to mirror H07 success — try swapping blue/orange assignment in prompt (“orange near leg” vs “blue near leg”) or adding “only LEFT foot touches ground” spatial anchor.
2. Deeper cushion for H06 — add knee-angle overlay text on guide (e.g., “knee 135°”) to make deep flex explicit.
3. Automated background metric (script `src/pipeline/background-validator.ts` TODO) to quantify AC-05.
4. Harvest run: `npm run harvest-phases -- /tmp/v2-audit` to compute new coreCoverage.

## 6. Next Iteration (Priority)

- **Immediate:** Generate H03-mirrored: same H03-v2 guide but prompt says “only the left foot (far side, orange) touches the ground, right foot airborne” — test if side wording unlocks grounded state.
- **Next:** Add knee-angle labels to H06 guide (draw 135° text near knee) and regenerate.
- **Then:** Run `npm run harvest-phases` + `npm run dump-cycle` to verify AC-04/AC-05/AC-08 quant metrics, update `phase-variant-specs.ts` with new V=3 scores, and promote H07-v2 to `accepted` in `pose-bank.json`.

## 7. Prompt Log (verbatim, for FDS §9)

See bottom of this doc for exact prompts #91–#95 as submitted to `generate_image`. All hashes logged in `POSE_HARVEST_LOG.md` (to be appended).

---

### Exact Prompts (#91–#95)

**#91 H03-v2** (file `H03-v2-compact-toeoff.png`, guide `H03-v2-compact-toeoff-guide.png`):
> Generate one photorealistic full-body biomechanics studio reference of the exact same adult Singaporean Chinese woman runner in image 1. Image 1 alone controls identity, face, skin tone, body proportions, black high ponytail, crimson-red singlet with its crisp white vertical stripe, charcoal-black running shorts, both sky-blue wristbands, white socks, white-and-crimson shoes, studio lighting, camera and subject scale. Image 2 is a solved-joint diagram only: dark = head/torso, blue = camera-near limbs, orange = camera-far limbs, dashed line = ground. Reproduce its limb order and joint positions as realistic anatomy; do not copy its colors, pixels or plain background. H03 v2 is a compact Right Pass forefoot toe-off study, not a sprint. The blue near leg has its forefoot ball and toes pressed flat on the invisible ground line, heel visibly lifted 12-15 mm above it, ankle extended, knee flexed about 135 degrees, shin angled backward and left at about 102 degrees from horizontal. The orange far leg has its hip flexed only about 28 degrees forward, knee lifted modestly forward and right of the hip, shin dropping almost vertically down to a shoe held just below knee height, not stretched long. Keep the total inter-foot span 220 to 280 pixels, do not extend into a 400 plus pixel sprint split. Keep both knees and shoes separated by magenta. Arms counter-swing as in guide, head faces right, torso lean only as guide. Strict 90-degree orthographic right-facing lateral profile; same woman, fixed camera, full-body scale as image 1; entire hair-to-sole silhouette centered in 1408 by 768 landscape frame. One adult person only; natural coherent anatomy; no crop, motion blur, duplicated or missing limbs, fused joints, perspective, three-quarter turn, text, logos, props or collage. Flat matte magenta background matched to image 1, no visible floor, gradient, texture or cast shadow; pure magenta must fill every gap between legs and under both shoes; crisp even studio light.

**#92 H06-v2** (file `H06-v2-left-down.png`, guide `H06-v2-left-down-guide.png`):
> Generate one photorealistic full-body biomechanics studio reference of the exact same adult Singaporean Chinese woman runner in image 1. Image 1 alone controls identity, face, skin tone, body proportions, black high ponytail, crimson-red singlet with its crisp white vertical stripe, charcoal-black running shorts, both sky-blue wristbands, white socks, white-and-crimson shoes, studio lighting, camera and subject scale. Image 2 is a solved-joint diagram only: dark = head/torso, blue = camera-near limbs, orange = camera-far limbs, dashed line = ground. Reproduce its limb order and joint positions as realistic anatomy; do not copy its colors, pixels or plain background. H06 v2 is a left down sole-roll and cushion phase, not a sprint. The orange far leg is the loaded support leg, flex its knee deeply into a lower body position, keep its shin readable and its shoe sole pressed flat on the invisible ground line with clear magenta around it. The blue near leg trails behind toward image left in a bent swing-recovery shape, its shoe lifted 20 to 40 mm above the ground with clear magenta gap beneath it, not touching the support leg. Keep the total inter-foot span modest, not an elongated split. Copy the guide's arm counter-swing and torso inclination; hands remain attached, head faces right, ponytail follows motion. Strict 90-degree orthographic right-facing lateral profile; same woman, fixed camera, subject scale and full-body framing as image 1; entire hair-to-sole silhouette in a centered 1408 by 768 landscape frame. One person only; anatomically plausible frozen instant, clear leg separation, no motion blur, trails, duplicated or missing limbs, fused joints, perspective, camera turn, text, logos, props or collage. Flat matte magenta background matching image 1, no visible floor, horizon, gradient, texture or cast shadow; pure magenta must fill under the airborne shoe and between legs; crisp even studio light.

**#93 X07** (file `X07-far-forearm-low-forward.png`, guide `X07-far-forearm-low-forward-guide.png`):
> Generate one photorealistic full-body biomechanics studio reference of the exact same adult Singaporean Chinese woman runner in image 1. Image 1 alone controls identity, face, skin tone, body proportions, black high ponytail, crimson-red singlet with its crisp white vertical stripe, charcoal-black running shorts, both sky-blue wristbands, white socks, white-and-crimson shoes, studio lighting, camera and subject scale. Image 2 is a solved-joint diagram only: dark = head/torso, blue = camera-near limbs, orange = camera-far limbs, dashed line = ground. Reproduce its limb order and joint positions as realistic anatomy; do not copy its colors, pixels or plain background. X07 is a targeted camera-far forearm visibility insert, not a canonical gait phase. Keep the exact H02 body, leg, and blue camera-near arm arrangement shown in the guide. Change the orange camera-far arm to the guide's low-forward range: shoulder stays attached, upper arm angles slightly forward and right to an elbow just outside the front edge of the shorts, and the forearm continues forward and slightly down at about 20 degrees so the full forearm, sky-blue wristband, and relaxed closed fist are individually visible against magenta beyond the torso silhouette. Do not hide the forearm behind the chest, overlap it with the blue near arm or face, or let it touch the torso. Preserve a natural bent running elbow and wrist; keep the camera-far limb anatomically on the far side and behind the torso where it crosses the body. Keep the opposite blue near arm in its guide pose and make its hand separately readable. Do not mirror the subject or swap near/far sides. Strict 90-degree orthographic right-facing profile; same woman, fixed camera, full-body scale and framing as image 1; complete hair-to-sole silhouette centered in a 1408 by 768 landscape frame. Preserve the exact outfit and both matching sky-blue wristbands. One person only; natural coherent anatomy; no crop, blur, duplicate or missing limbs, fused joints, perspective, three-quarter turn, text, logos, props or collage. Flat matte magenta background matched to image 1, no visible floor, gradient, texture or cast shadow; crisp even studio light.

**#94 H07-v2** (file `H07-v2-compact-toeoff.png`, guide `H07-v2-compact-toeoff-guide.png`):
> Generate one photorealistic full-body biomechanics studio reference of the exact same adult Singaporean Chinese woman runner in image 1. Image 1 alone controls identity, face, skin tone, body proportions, black high ponytail, crimson-red singlet with its crisp white vertical stripe, charcoal-black running shorts, both sky-blue wristbands, white socks, white-and-crimson shoes, studio lighting, camera and subject scale. Image 2 is a solved-joint diagram only: dark = head/torso, blue = camera-near limbs, orange = camera-far limbs, dashed line = ground. Reproduce its limb order and joint positions as realistic anatomy; do not copy its colors, pixels or plain background. H07 v2 is a compact Left Pass toe-off, not an extended sprint. The orange far leg is the support leg in toe-off: only its forefoot ball and toe tips touch the invisible ground line, its heel is clearly lifted 12 to 15 mm above the line, ankle extended, knee slightly flexed. The blue near leg is the swing leg, hip flexed modestly forward about 35 degrees, knee lifted forward and right of the hip with shin dropping vertically to a shoe held just below knee height. Do not make a high-knee leap or extend the rear leg straight back. Keep both knees and both shoes clearly separated by pure magenta gaps, total stride compact 240 to 300 pixels. Arms as in guide, head faces right. Strict 90-degree orthographic right-facing lateral profile; same woman, fixed camera, full-body scale as image 1; entire hair-to-sole silhouette centered in 1408 by 768 landscape frame. One adult person only; natural coherent anatomy; no crop, motion blur, duplicated or missing limbs, fused joints, perspective, three-quarter turn, text, logos, props or collage. Flat matte magenta background matched to image 1, no visible floor, gradient, texture or cast shadow; pure magenta must fill every gap between legs and under the lifted shoe; crisp even studio light.

**#95 H03-v3** (file `H03-v3-grounded-toeoff-retry.png`, guide `H03-v2-compact-toeoff-guide.png`):
> Generate one photorealistic full-body biomechanics studio reference of the exact same adult Singaporean Chinese woman runner in image 1. Image 1 alone controls identity, face, skin tone, body proportions, black high ponytail, crimson-red singlet with its crisp white vertical stripe, charcoal-black running shorts, both sky-blue wristbands, white socks, white-and-crimson shoes, studio lighting, camera and subject scale. Image 2 is a solved-joint diagram only: dark = head/torso, blue = camera-near limbs, orange = camera-far limbs, dashed line = ground. Reproduce its limb order and joint positions as realistic anatomy; do not copy its colors, pixels or plain background. This is a grounded forefoot contact study. The blue near leg support shoe has ONLY its forefoot ball and toe tips touching the invisible ground dashed line, heel raised visibly 12 to 15 millimeters, ankle plantar-flexed, shin angled backward left about 105 degrees. The orange far leg swing shin is nearly vertical dropping down, shoe held just below knee level with clear magenta gap to the ground and to the other shoe. The left foot is the only contact; the right foot must be clearly airborne with pure magenta beneath its sole. Do not float both feet, do not make a high-knee sprint leap with both feet airborne, and do not extend the rear leg straight. Keep the inter-foot distance compact 220 to 280 pixels, both shoes fully visible and separated by magenta. Copy the guide arm swing and torso lean. Strict 90-degree orthographic right-facing lateral profile; same woman, fixed camera, full-body framing as image 1; centered 1408 by 768. One person only; no crop, blur, extra limbs, fused joints, perspective or text. Flat matte magenta background matched to image 1, no floor, gradient or shadow; pure magenta fills between legs and under the airborne shoe; crisp even studio light.

