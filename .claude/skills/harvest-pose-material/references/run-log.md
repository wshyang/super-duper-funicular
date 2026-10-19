# Run Log

What each run of this skill did, what it caught, and what changed as a result.
Newest last. Keep entries short: numbers, the defect, the change.

---

## Run 1 — 2026-10-19, commit `97a3c12`

**Setup.** 30 sources (master + 18 pose-bank + 11 phase, PR #1 mounted at `/tmp/pr1`).

**Result.** 6 materials — H01 near/far thigh (58.3° / 56.2°), H03 near/far forearm
(13.2°), PR1-phase-09 near/far upper arm (97.2° / 94.3°). 26 rejections. Cycle:
16 frames, 0 islands, 0 px material-induced ground delta, IoU 0.515 / 0.845 / 0.819.

**What it caught.**

1. **Gate G5 failed on a real defect.** PR1-phase-09 is an `anatomy-study` plate
   whose upper arms banked as material. AC-2 was documented but never enforced.
   Fixed at harvest: study plates now emit `wardrobe:anatomy-study` rejections
   instead of material, dropping the bank to 4 (H01 thighs, H03 forearms).
2. **Gate G2 failed on my own thresholds.** The skill's first intake thresholds
   (`fringe < 0.02`, zero key residue) were inherited uncalibrated and rejected
   2 of 2 accepted plates. Measured corpus values: fringe 0.044–0.059, leak
   0.002–0.003, residue 0.07–0.16 %. Thresholds recalibrated and annotated; the
   original numbers were unattainable at 1408 × 768 with antialiased edges.
3. **Audit and harvest disagreed again** — the audit called a jersey-covered near
   upper arm eligible while the harvest refused it, because the audit never applied
   the appearance gate to the probe result. Both now use `skinFractionInCapsule`
   with the same threshold.
4. **Pose gating was too blunt.** Demoting every part when source-level
   `poseMatchRatio < 0.80` deleted correct limbs (H03 fell from accepted to
   "no eligible parts"). Changed to a source-level `pose-unverified` reason: the
   plate is demoted, its measured parts survive. Result: buckets 7 → 34, gaps
   106 → 74 with no threshold loosened.

**Visual review.** Contact sheet clean: limbs read as limbs, shading continuous,
near/far distinguishable. Coverage visibly sparse — only thighs and forearms carry
photographic material, upper arms and shins remain studio cutouts.

**Next.** Every remaining gap needs classification: the near upper arm, near shin
and near thigh top are **camera gaps** (occluded from a single profile for every
pose), so no further prompting from this viewpoint can close them.

---

## How to add an entry

Copy the shape above:

- **Setup** — commit, corpus size, PR #1 root.
- **Result** — material count with angles, rejection count, the five cycle numbers.
- **What it caught** — each gate failure and the change it forced. If a gate failed
  and nothing changed, say so explicitly and justify it.
- **Visual review** — what the contact sheet showed.
- **Next** — the gap classification, or "no change; measured only".
