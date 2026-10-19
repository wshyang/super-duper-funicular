# Reference: Mitigations per Item — How to Address Challenges

Source: `docs/CORE_OBJECTIVE_AND_ITEMS.md` Section 5 + `docs/POSE_VARIATION_FLAW_ANALYSIS.md` Prioritized Plan.

## I-01 — Identity
- **A-01.1 Color-lock:** Use “sky-blue wristbands” (not cyan), repeat “both sky-blue wristbands” 3× + negative “no black/dark wristband”. Heal via `b>125 && g>100 && b−r>24`.
- **A-01.2 Minimal-outfit isolation:** Declare bare-limb variants as `ORTHO-A..C` with “minimalist matte-black sports bra + high-cut bikini brief at pelvis, 100% bare thighs to hip, barefoot/bare-wristed” (PR #1 #84/#85 passes 100%). Keep production outfit for canonical bank.
- **A-01.3 Scale anchoring:** Only H00 + one guide (never chain). Verify crown y ±3%, sole ±5 px via overlay; log master SHA `143b45…` every entry.

## I-02 — Guides
- **A-02.1 Hires standard:** Retire 220×256; mandate 1408×768 `renderPoseGuideRaster` + text angle labels near knees.
- **A-02.2 Anti-copy:** Prompt says “dark=head/torso, blue=near, orange=far, dashed=ground. Reproduce order/positions as anatomy; do not copy colors/pixels.”
- **A-02.3 Scripted customs:** `npx tsx scripts/create-compact-guides.ts` with `stride 0.62, kneeDrive 0.68` (H03/H07-v2) + `custom-guides-manifest.json`.

## I-03 — Canonical Phases
- **A-03.1 De-sprinted wording:** Replace “running/sprint” with “biomechanics forefoot pressure study” + mm/degree tokens: “only forefoot ball+toes touch line, heel 12–15 mm lifted, shin 102°, knee 135°”. V2 #94 left-side succeeded; right-side needs mirrored wording “only LEFT foot (far, orange) touches”.
- **A-03.2 Compact-span:** Add “inter-foot 220–280 px, do not extend into 400+ px sprint split”; measure bbox distance, reject >300 px as collapse.
- **A-03.3 Disambiguate:** Grounded: “LEFT foot ONLY contact; RIGHT airborne with pure magenta beneath”. Flight: “both shoes >5 px above dashed line”.

## I-04 — X-inserts
- **A-04.1 Leverage bias:** Harvest unobstructed torso/pelvis frame (PR #1 phase-01) + rear near arm behind back + forward far arm ahead of chest. Score visibility 0..3 per part.
- **A-04.2 Gap assertion:** Require forearm/cuff/hand >8 px outside torso/shorts with magenta gap; validate 2× crop. Iteration X02→X02 #87→X06 shows progressive gap fixing.
- **A-04.3 Quantified taxonomy:** Always include measured angle (−41.4°,149.5°,+20°) via custom guide; plan ≥3 forearm + ≥3 thigh angles.

## I-05 — Background
- **A-05.1 Positive grounding:** Procedural positive: “shoes hover 3 mm above dashed line; pure magenta fills 100% inter-leg/under-sole”. V2 5/5 flat vs PR #8 0/8.
- **A-05.2 Master-sampled validator:** Target 249,48,229 ±18 not 255,0,255; sample corners >8 px from silhouette; compute variance + shadow.
- **A-05.3 Heal:** Keep `healArmSkinContaminants` (white `r>175,g>170,b>170` + cyan `b>125,g>100,b−r>24`) + Jacobi fill; verify via `harvest-phases` diagnostic sheet.

## I-06 — Isolation/Jigs
- **A-06.1 Visibility split:** Split `arms→nearForearm/farForearm` etc.; only V=3 eligible for `selectManifestHarvestFrame`.
- **A-06.2 Cross-section fix:** Right-handed normal (+suy,−sux) + centerX lerp + torso collar taper 11→29 px → avgCore 0.991. Check `phase-harvest-report.json`.
- **A-06.3 Flicker guard:** Retain source hash + shared pivot (80,36)/(80,124) + scale/palette in `PHASE_VARIANT_JIG_SPECS`; scrub `JointAndCycleAuditPanel`, reject >2 px pop.

## I-07 — Anatomical/Camera
- **A-07.1 Chirality lock:** Never prompt straight arm; always L-bend #21 (inner palm, thumb 12 o’clock).
- **A-07.2 Attachment guard:** After 0481e7e, assert `featherHeadNeckBase` (preserves chin to y=123.5, feathers above y=121.5), SDF capsule (80,37)→(80,123) r24..26.5 3.5 px feather, `harmonizeNeckToHeadSkin`, `trimTorsoCollarNeckStub`, garment-tint guard `g≤105 && r−g≥72`. Check 1×/2× `standing-profile-audit.png`.
- **A-07.3 Camera lock:** Prompt must include “Strict 90° orthographic right-facing lateral profile; same woman, fixed camera, full-body 1408×768 centered” + “no perspective/three-quarter/text/logos/props/collage”.

## I-08 — Audit/Validation
- **A-08.1 Mandatory log:** Before `generate_image`, write verbatim prompt+file_path+SHAs; after, append output SHA+visual decision. No log = no attempt.
- **A-08.2 Size compliance:** Split >50 LOC functions (e.g., `validateBackground` → `sampleCornerVariance`/`sampleLowerShadow`/`buildResult`).
- **A-08.3 Provenance refresh:** Run `npm run branches:compare` every turn; keep 60ca653 historical anchor comment.

## Execution loop (harvest until HRG)

1. Generate guides: `npm run render-pose-guides -- <dir>` or `npx tsx scripts/create-compact-guides.ts`
2. Generate candidates: `generate_image` with `[master, guide]` + template from `assets/`
3. Validate: `npx tsx scripts/validate-candidates.ts --dir <candidates>` + `npm run harvest-phases -- /tmp/v2-audit` + `npm run dump-cycle -- /tmp/gait-cycle-audit 16 photo-sg-chinese-female red`
4. Log: Append to `POSE_HARVEST_LOG.md` + `FDS.md §9` + update `pose-bank.json` visibility/status
5. Iterate: If AC-03/05/04 fail, change **guide geometry itself** (not adjectives) — V2 #88 lesson — and regenerate
6. Promote: Only when HRG passes (≥8 distinct + ≥3 inserts, all V=3 coverage, avgCore≥0.985, 0 defects, 2× seam pass) run `init-pose-bank` selection

