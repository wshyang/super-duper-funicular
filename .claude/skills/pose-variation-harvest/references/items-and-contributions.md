# Reference: Required Items I-01..I-08 — Contributions

Source: `docs/CORE_OBJECTIVE_AND_ITEMS.md` Section 2.

## I-01 — Locked Identity Master (H00)
**What:** One accepted 1408×768 right-facing profile at `src/images/photoreal-female/01-master-lateral-profile-reference.png`, immutable, SHA `143b4521…` in `pose-bank.json` identityAnchor. All generations reference only this + one guide.

**Contribution:** Prevents face/outfit pop when switching phases (PR #8 #84 black wristband drift is direct failure mode). Provides scale baseline (crown y, sole y) for `AnatomicalRigSpec` alignment.

## I-02 — High-Resolution Pose-Control Guides (1408×768)
**What:** Diagrams via `renderPoseGuideRaster` (dark head/torso, blue=near, orange=far, dashed ground, joint dots). Replaced early 220×256 rig renders (proven “not dependable” — H01≈H02).

**Contribution:** Geometry beats words. “Heel slightly lifted” loses to sprint prior (F-01); a diagram drawing shin at 102° vs vertical is unambiguous. V2 guides (H03-v2 stride 0.62, X07 +20°) encode needed compact toe-off / low-forward forearm angles.

## I-03 — Canonical 8-Phase Gait Set (H01–H08)
**What:** Right-contact 0.00, Right-down 0.125, Right-pass 0.250, Right-flight 0.375, Left-contact 0.500, Left-down 0.625, Left-pass 0.750, Left-flight 0.875, anti-phase φ+0.5.

**Contribution:** Temporal cycle: contact → loaded cushion → heel-off/toe-roll → airborne. Missing H03/H06/H07 left 5/8 distinct (like flawed sheet’s 4 unique). Must cover both legs’ support/swing for alternating gait.

## I-04 — Targeted Visibility Inserts (X-inserts)
**What:** Hold body/legs (usually H02) fixed, vary one limb: X05 −41.4° forward/up, X06 149.5° rear/down, X07 +20° low-forward, X04 opposed-shin, etc. Outside canonical gait.

**Contribution:** Canonical gait repeats near-torso forearm angles. Inserts force rare angles (forearm 8 px outside torso, high-knee vs hamstring curl). Need ≥3 to achieve “every limb ≥2 angles”.

## I-05 — Chroma-Key Clean Background & Matte Pipeline
**What:** Flat matte magenta (`MASTER_MAGENTA` ≈249,48,229 ±18) no floor/gradient/shadow + healing (`healArmSkinContaminants`) + `background-validator.ts`.

**Contribution:** Cutout operation — soft shadow (PR #8 H01 #73) makes shoe sole inseparable → spill → purple fringe. Clean background = harvestable, not just pretty.

## I-06 — Limb Isolation & Rounded-End Jig Extraction
**What:** 17 parts on 160×160 with semicircular ends at (80,36)/(80,124) + 6 px Hermite + Jacobi balls, via `phase-frame-harvester.ts` cross-section with right-handed normal (+suy,−sux).

**Contribution:** Actual usable material stitched by `photoreal-rig.ts`. Only V=3 (isolated with gap) gives readable pivot. Metrics `avgCore≥0.985`, `avgChroma≥0.75` quantify usability.

## I-07 — Anatomical & Camera Consistency
**What:** 90° orthographic right profile, lateral=near front / medial=far behind, 90° L-bend for far arm (#21), joint ranges, smooth head-neck-torso seam (no crimson shelf/mushroom-cap).

**Contribution:** Prevents uncanny/rig-break. PIPE-ERR-11..14 neck step made all 3 personas fail audit despite good limbs. Camera lock ensures 220×256 registration stable.

## I-08 — Traceable Prompt Audit & Automated Validation
**What:** Every `generate_image` logs verbatim prompt + master/guide/output SHA + visual decision in `FDS.md §9` + `POSE_HARVEST_LOG.md` + `pose-bank.json`; gates `npm test 55/55, typecheck, build, branches:compare, harvest-phases, dump-cycle`.

**Contribution:** Turns “generic sprint” mystery into diagnosable IMG-ERR with single-variable fix (Call #80 shoulder topology). Gates prevent regression (V2 fixed <50 LOC + 60ca653 provenance).

