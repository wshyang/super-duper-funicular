# Pose-Bank Acceptance Criteria (Goal Definition)

Status: adopted for the pose-variation iteration starting at Call #91.
Scope: `src/images/photoreal-female-pose-bank/` (Athletic SG runner pilot) and any
future character pose bank built with `docs/POSE_BANK_PIPELINE.md`.

## 1. Why this document exists

Calls #73–#90 produced 18 candidates but zero `accepted` frames. The review notes
show three recurring, previously *unquantified* flaw classes:

1. **Phase collapse** — the generator ignores skeleton guides and regresses to two
   or three generic stride silhouettes (H03/H06/H07 rejected; X04 #85 duplicated
   X02). Rejection was manual and subjective ("reads like a generic sprint").
2. **Key contamination** — soft contact shadows and lower-background gradients were
   treated as blocking rejections, keeping otherwise-good poses `conditional`
   forever, even though hue-band shadows are mechanically recoverable.
3. **No measurable bar** — "usable for sprite capture" was never defined, so every
   frame stayed `conditional` and the pilot could not converge.

This document defines **done**. A frame is *extraction-ready* when it passes all
gates below. The pilot *works* when every canonical phase H01–H08 has at least one
extraction-ready candidate.

## 2. Gates

Automated gates are computed by `python3 scripts/audit_pose_bank.py` (thresholds
live at the top of the script and are quoted here). Visual gates are confirmed by
a human (or reviewing agent) looking at the actual pixels, never inferred from a
similar frame.

### G1 — Identity & wardrobe lock (visual)
Same woman as the master (`photoreal-female/01-master-lateral-profile-reference.png`):
face, warm skin tone, black high ponytail, proportions. Wardrobe exact: crimson
singlet with white vertical side stripe, charcoal-black fitted shorts, **both**
wristbands sky-blue, white ankle socks, white-and-crimson shoes. Strict right-facing
lateral profile, single person, no props/text/motion blur.

### G2 — Framing (auto) + scale (visual)
Full hair-to-sole silhouette inside the 1408×768 frame with ≥ 8 px margin on every
side. Subject scale visually consistent with the master (head size / torso length);
parts are re-registered at harvest, so ±10 % drift is tolerated, more is a reject.

### G3 — Key recoverability (auto)
*Replaces the old "no shadow at all" bar, which no generation ever met.*
- Background pixels must be **key-family**: hue within ±24° of the modal border key
  and saturation ≥ 0.22. Luminance variation (soft shadows, vignette) inside the
  key-family band is tolerated because `--normalize` repaints it flat.
- Exactly one dominant silhouette component; no detached non-key island > 150 px
  (loose hair wisps below that are cleanup items, not rejections).
- After normalization the background must be a single flat key color; residual
  non-key background = 0 px.

### G4 — Phase landmark compliance (auto)
Master sole baseline y≈745. Shoe clusters = bright low-saturation blobs in the lower
silhouette. `contact_width` = sole width over the bottom 6 rows of a shoe cluster.

| Phase kind (frames) | Rule |
|---|---|
| contact (H01, H05) | exactly the **front** shoe grounded, flat sole (`contact_width ≥ 55`), ahead of body centroid; rear shoe ≥ 22 px airborne |
| down (H02, H06) | exactly one grounded flat shoe ≤ 110 px ahead of centroid (loaded mid-stance, not another contact); other shoe clearly airborne |
| pass (H03, H07) | exactly the **rear** shoe grounded on the **toes** (`contact_width ≤ 46`, heel visibly raised), behind centroid; swing shoe airborne but lifted ≤ 175 px (no high-knee sprint); shoe separation ≤ 190 px (compact, no extended sprint) |
| flight (H04, H08) | both shoes ≥ 22 px above the baseline |

### G5 — Pose fidelity vs solved guide + near/far order (visual)
Joint arrangement must match the rendered solved-pose guide (knee heights, shin
directions, arm counter-swing) with no limb swap and no camera turn. For left-side
phases (H05–H08) the support limb is the **camera-far** leg: at any crossing the
near limb must occlude the far limb, and the far limb may read slightly darker.
G4 is necessary but not sufficient — e.g. H03-refined (#82) passes G4 geometry yet
fails G5 (swing knee far above guide height).

### G6 — Diversity (auto)
Within each half-cycle {H01..H04} and {H05..H08}: pairwise silhouette IoU ≤ 0.84.
Across the whole bank: any pair ≥ 0.90 means the new frame duplicated an existing
pose and is rejected regardless of prompt wording.

## 3. Definition of done for this iteration

1. `scripts/audit_pose_bank.py` committed, reproducing the human verdicts of
   Calls #73–#90 on the existing candidates (baseline report archived in
   `docs/phase-harvest-report.json` → superseded by `docs/pose-bank-audit.json`).
2. H03, H06, H07 regenerated until each passes G1–G6 (auto gates machine-checked,
   visual gates reviewed on the actual image and logged).
3. All eight canonical frames re-audited; every G1–G6 pass upgrades the frame from
   `conditional` to `accepted-for-pose` (crop approval still requires the per-part
   visibility review of `POSE_BANK_PIPELINE.md` stage 6).
4. Key-normalized plates for all accepted frames written to
   `src/images/photoreal-female-pose-bank/normalized/` with zero residual
   background contamination (auto-verified).
5. Every generation call logged verbatim (prompt, refs, hashes, verdict) in
   `docs/POSE_HARVEST_LOG.md` and `docs/FDS.md#image-prompt-log`.

## 4. Process change adopted for the iteration (hypothesis under test)

Previous attempts conditioned on *skeleton guides + text* and regenerated the pose
from scratch each time; the model repeatedly snapped back to its generic-stride
prior. The new loop conditions on **the nearest already-reviewed photo candidate**
and requests a *small pose delta* (e.g. "from H02's loaded stance, raise the heel
so only the toes touch"), keeping the master as identity anchor and the solved
guide as the angle reference. Hypothesis: small deltas in photo space are followed
far more reliably than full re-poses from a diagram. Each attempt is audited by
`audit_pose_bank.py` before any visual acceptance.

## 5. Iteration result (2026-10-18, Calls #91–#95)

| Frame | Candidate | Auto gates | Visual gates | Status |
|---|---|---|---|---|
| H01 | `H01-right-contact-refined.png` (#74) | PASS | pass (shadow now key-recoverable) | accepted-for-pose |
| H02 | `H02-right-down.png` (#75) | PASS | pass (flexion subtler than guide — caveat) | accepted-for-pose |
| H03 | `H03-right-pass-delta2.png` (#92) | PASS | pass | accepted-for-pose |
| H04 | `H04-right-flight.png` (#77) | PASS | pass (stride more extended than guide — caveat) | accepted-for-pose |
| H05 | `H05-left-contact.png` (#78) | PASS | pass | accepted-for-pose |
| H06 | `H06-left-down-delta2.png` (#94) | PASS | pass (flexion caveat, as H02) | accepted-for-pose |
| H07 | `H07-left-pass-delta.png` (#95) | PASS | pass (opposite counter-swing clearly visible) | accepted-for-pose |
| H08 | `H08-left-flight.png` (#81) | PASS | pass (extended-stride caveat) | accepted-for-pose |

Diversity: all within-half-cycle IoUs ≤ 0.69; highest cross-bank pair H03~H07 = 0.893 (< 0.90 cap; expected pass-phase mirror). Normalized plates: residual shadow ≤ 53 px halo, islands ≤ 109 px, all 8 frames. Machine report: `docs/pose-bank-audit.json`. Done-criteria items 1–5 of §3 are all met; near/far chirality and per-part crop approval remain open as designed.
