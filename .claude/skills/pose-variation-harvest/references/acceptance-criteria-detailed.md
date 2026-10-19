# Reference: Acceptance Criteria per Item — Thresholds & Instruments

Source: `docs/ACCEPTANCE_CRITERIA.md` + `docs/CORE_OBJECTIVE_AND_ITEMS.md` Section 3.

## I-01 — Identity Master
- **I-01.1 Master immutability:** SHA `143b4521c2865a9393a5d332be553ed36659fd408402559296df362958458af6` unchanged; `pose-bank.json` identityAnchor. Measure: `sha256sum` + `git diff`.
- **I-01.2 Outfit lock:** Crimson singlet + white stripe, charcoal shorts, both sky-blue wristbands, white socks, white-crimson shoes; no bikini rewrite unless declared bare-limb. Measure: `read_file` side-by-side + `b>125,g>100,b−r>24`.
- **I-01.3 Single person:** 1 head, 1 ponytail, 2 arms, 2 legs, no clones. Measure: visual count + `audit-report.json` detachedIslands.

## I-02 — Pose Guides
- **I-02.1 Resolution:** 1408×768, dark central, blue near, orange far, dashed ground. Measure: dimensions + visual.
- **I-02.2 Distinctness:** Neighbors differ ≥12 px knee height or ≥15° shin angle. Measure: guide pixel/angle.
- **I-02.3 Hygiene:** Only H00 + one guide per generation. Measure: `POSE_HARVEST_LOG.md` SHAs.

## I-03 — Canonical 8-Phase
- **I-03.1 Support-state:** H01/H05 grounded heel/midfoot + trailing recovery; H02/H06 knee ≥10° more flexed, 5–15 px lower; H03/H07 forefoot toe-off only (ball+toes, heel 12–15 mm lifted); H04/H08 both shoes >5 px above ground. Measure: visual vs guide + `isGrounded`.
- **I-03.2 Distinctness:** Neighbors Δ≥12 px or ≥15°, foot span Δ≥30 px contact vs flight. Measure: bbox/angle.
- **I-03.3 No sprint collapse:** H03/H07 compact not high-knee + extended rear. Measure: visual reject + IMG-ERR log.
- **I-03.4 Anti-phase:** Near φ vs far φ+0.5 opposite; feet not fused <15 px. Measure: foot bbox separation.

## I-04 — X-inserts
- **I-04.1 Angle uniqueness:** Not in H01–H08; e.g., X05 −41.4°, X06 149.5°, X07 +20° ±10°. Measure: guide annotation vs output.
- **I-04.2 Gap:** Target forearm/cuff/hand >8 px outside torso/shorts with magenta gap. Measure: 2× crop (PR #8 X02 first failed).
- **I-04.3 Outfit:** Production outfit + both wristbands. Measure: visual + heuristic.

## I-05 — Background
- **I-05.1 Flat magenta:** Background >8 px from silhouette ≤3% deviating >18 from MASTER_MAGENTA 249,48,229; StdDev <8. Measure: `background-validator.ts`.
- **I-05.2 Zero spill:** `totalMagentaSpillPixels=0`. Measure: `audit-report.json`.
- **I-05.3 Shoe edge:** Grounded sole crisp, flight ≥5 px magenta under sole. Measure: 2× crop.
- **I-05.4 Heal:** No duplicate wristband, white stripe spill, ghost shoe. Measure: `healArmSkinContaminants` + visual.

## I-06 — Limb Isolation
- **I-06.1 Visibility:** Every frame explicit 0..3 per 17 parts. Measure: `pose-bank.json` / `PHASE_LEDGER`.
- **I-06.2 Coverage:** Across accepted bank, each part ≥1 V=3 + ≥2 angle variants for thigh/shin/forearm/foot. Measure: coverage matrix.
- **I-06.3 No crop:** Segment fully inside 1408×768 with ≥5 px padding. Measure: visual.
- **I-06.4 Metrics:** Per-jig core ≥0.90 (avg ≥0.985), chroma ≥0.70 (avg ≥0.75), 0 uncovered. Measure: `phase-harvest-report.json`.

## I-07 — Anatomical/Camera
- **I-07.1 Plausibility:** No extra/missing/fused, joint within range. Measure: visual.
- **I-07.2 Chirality:** Lateral=near front, medial=far behind, L-bend #21. Measure: guide color vs silhouette.
- **I-07.3 Seam:** No crimson shelf/mushroom-cap, `dstHalfWidthPx=round(19*headScale)`. Measure: 2× joint-crops + standing audit.
- **I-07.4 Hair:** Ponytail trails opposite motion. Measure: visual.

## I-08 — Audit/Validation
- **I-08.1 Log:** Verbatim prompt + master/guide/output SHA + visual decision in `FDS.md §9` + `POSE_HARVEST_LOG.md`. Measure: `CLAUDE.md` Rule 2 audit.
- **I-08.2 Manifest:** `pose-bank.json`/LEDGER sole truth, status ∈ {accepted, conditional, rejected, needs-regeneration}. Measure: JSON schema.
- **I-08.3 Gates:** `npm test 55/55, typecheck, build, branches:compare, harvest-phases, dump-cycle` all pass with 0 islands/spill/uncovered. Measure: CI.
- **I-08.4 Human:** No heuristic-only promotion; `read_file` mandatory. Measure: review log.

**Harvest Readiness Gate (HRG) = all above +** ≥8 distinct phases + ≥3 inserts, coverage met, 0 defects, 2× seam pass, no >2 px joint pop on scrub.

