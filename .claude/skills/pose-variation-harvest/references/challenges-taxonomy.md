# Reference: Challenges per Item (Evidence from PR #1 / PR #8)

Source: `docs/CORE_OBJECTIVE_AND_ITEMS.md` Section 4 + `docs/POSE_VARIATION_FLAW_ANALYSIS.md` F-01..F-08.

## I-01 — Identity Master
- **C-01.1 Outfit drift:** Wristband token rare; X02 #84 rendered one wristband dark/black not sky-blue. Skin tone drift without SHA tracking.
- **C-01.2 Safety rewrite:** Literal “unclothed” → empty `NONE` (PR #1 #82) or bike-shorts+sports-bra rewrite losing singlet/stripe/wristbands (PR #1 #83).
- **C-01.3 Scale jitter:** Different φ without locked master gave 709 vs 707 px (5.5 cm drift).

## I-02 — Pose Guides
- **C-02.1 Low-res indistinctness:** 220×256 rig renders made H01≈H02; model cannot tell cushion from contact (PR #8 pilot).
- **C-02.2 Copy confusion:** Model copies guide flat colors onto skin or small cutout rendering instead of joint positions.
- **C-02.3 Creation cost:** Custom inserts need solving `ArticulatedPose` with overridden `stride/kneeDrive` and angle verification >15°.

## I-03 — Canonical 8-Phase
- **C-03.1 Sprint prior (CRITICAL):** “Running/sprint” prior = high-knee 45° + extended rear 160°. H03 #76/#82 (even 1408×768), H07 #80, H06 #79, X04 #85 all collapsed; V2 #91/#95 right-side still failed while H07 left-side #94 succeeded → right-side prior stronger.
- **C-03.2 Support vs flight ambiguity:** “Heel lifted high” + “thigh raised” floated to airborne pointed toe (IMG-ERR-19).
- **C-03.3 Anti-phase confusion:** H05 visually identical to H01; reviewer cannot tell support side (near/far unverifiable).

## I-04 — X-inserts
- **C-04.1 Open-torso bias (HIGH):** Model keeps near arm behind torso to keep singlet empty (PR #1 #74/#77).
- **C-04.2 Gap closure:** First X02 hand touched hip/shorts; need >8 px magenta gap but model minimizes negative space.
- **C-04.3 Angle specificity:** “Opposite angles” without geometry produced no genuine difference (X04 #85 same stride as #84); only quantified guides (−41.4°,149.5°,+20°) worked.

## I-05 — Background
- **C-05.1 Ground-shadow prior (CRITICAL):** “Foot near ground” → soft occlusion; PR #8 0/8 clean despite negatives.
- **C-05.2 Heal necessity:** Duplicate cyan wristband (IMG-ERR-18, PIPE-ERR-10), white stripe spill need `healArmSkinContaminants`.
- **C-05.3 Pure-#FF00FF mismatch:** Actual generative magenta ≈249,48,229 not 255,0,255; hardcoded validator false negatives until master-sampled.

## I-06 — Limb Isolation
- **C-06.1 Touching silhouettes:** Running self-occludes; many frames V≤2 not V=3 (PR #8 5/8 conditional).
- **C-06.2 Cross-section pinch:** Longitudinal scaling pinched widths 10–27 px; left-handed normal flipped anterior/posterior (PIPE-ERR-09). Fixed by (+suy,−sux) + centerX.
- **C-06.3 Flicker:** Different source frames without shared pivot/scale cause >2 px joint pop on scrub.

## I-07 — Anatomical/Camera
- **C-07.1 Chirality illusion:** Straight 180° arm → front-facing right elbow with twisted wrist; fixed by 90° L-bend #21 (inner palm, thumb 12 o’clock).
- **C-07.2 Head-neck regression (HIGH):** 5 compounding regressions: pre-mirror seal inversion (crimson turtleneck shelf, PE-11), guillotine cut (mushroom-cap, PE-12), capsule corner (PE-13), garment-tint false positive (PE-14). Fixed in 0481e7e.
- **C-07.3 Perspective drift:** H03 #76 pitched 10–15° to 3/4 despite “90° orthographic”.

## I-08 — Audit/Validation
- **C-08.1 Discipline burden:** Must log verbatim prompt+hashes before counting attempt (32 logged #01–#85).
- **C-08.2 Gate brittleness:** ≤50 LOC/fn, ≤800 LOC/file, pure JSX, etc.; V2 `background-validator` first 72→ split.
- **C-08.3 Provenance lag:** `N_WAY_COMPARISON.md` must be refreshed via `npm run branches:compare` (60ca653 historical anchor).

