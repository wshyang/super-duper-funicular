---
name: harvest-pose-material
description: Audits, harvests and verifies photoreal running-sprite material from a plate corpus, then assembles and measures a 16-frame cycle. Use when adding pose-bank or phase plates, when harvested limbs look stretched, blobby or made of the wrong fabric, when a harvest returns zero materials, when pose diversity or phase correctness must be proven rather than asserted, or when a sprite sheet still shows the same pose in every frame.
allowed-tools: Read Write Edit Grep Glob Bash
license: MIT
metadata:
  version: "1.0.0"
  owner: super-duper-funicular
---

# Harvest Pose Material

Turns a folder of photoreal studio plates into verified limb material and a
measured 16-frame running cycle. Everything this skill asserts is a number
produced by a command, and every number is stored on the artifact it describes.

The command surface already exists in the repository:

```bash
npm run pose-material:audit   -- --pr1-root=/tmp/pr1
npm run pose-material:harvest -- --pr1-root=/tmp/pr1
npm run pose-material:demo    -- /tmp/pose-material-demo
```

The skill does not add new measurement theory; it enforces the order of
operations, the triage vocabulary and the gates that make those commands
trustworthy.

## When to use this skill

Use it when:

- new pose-bank or phase plates are added and must be admitted or rejected;
- a rendered limb is warped, stretched, blobby, mirrored, or made of jersey;
- a harvest produced **zero** materials and the reason is not obvious;
- someone claims the cycle is "more varied now" and it must be proven;
- a sprite sheet still looks like the same pose repeated;
- you are about to change the rectifier, the probe, the verifier or the bank.

Do **not** use it to:

- restyle or retune the rig (`dump-cycle` + `audit-gait-cycle` is the tool there);
- generate new imagery — this skill measures and harvests; generation is a
  separate, gap-driven decision (see `references/objective-register.md`, I-10);
- harvest static parts (head, neck, torso, pelvis); those come from the studio
  extractor and re-cutting them by box is a known defect.

## The four findings that define the method

1. **Diversity is not the bottleneck.** A 30-plate corpus produced 30 distinct
   silhouette clusters, zero duplicate pairs, mean pairwise IoU 0.442 — against
   0.947 half-cycle duplication in the original flawed spritesheet. Prompts fixed
   pose variety long ago; do not spend effort there.
2. **Pose truth is.** Measured against the rig's own attainable match, plates
   range from 0.53 to 0.82 of the ceiling. Two plates labelled "mid-stance" are
   high-knee sprints. Assert nothing from a filename.
3. **Harvestability is the scarce resource.** Of 128 part × phase slots, 106 are
   gaps. In a single right-facing profile the near upper arm sits behind the torso
   and the near thigh top behind the shorts. Occlusion is geometry, not wording.
4. **Unverified cutouts are worse than none.** Early iterations harvested the
   crimson singlet as "upper arm" at skin fraction 0.00 and produced limbs that
   rendered as skin blobs covering the shorts. A crop can look fine in a contact
   sheet and fail only when assembled.

## Preconditions

1. `npm ci` has been run (the harvest uses `tsx`).
2. `src/images/pose-material/sources.json` lists the corpus. PR #1's phase plates
   live on a sibling branch: mount them at `/tmp/pr1`
   (`git fetch origin pull/1/head:pr-1 && git worktree add /tmp/pr1 pr-1`) or pass
   `--pr1-root=<path>`. Without them the audit sees 19 of 30 sources.
3. Note the commit: `git rev-parse --short HEAD`. Every run report records it.

## Workflow

Follow the steps in order. A step that fails stops the run — do not skip ahead to
make a later step pass.

### Step 1 — Freeze the baseline

```bash
npm run pose-material:audit -- --pr1-root=/tmp/pr1
```

Record from `public/sprites/material/audit.json`:
`report.sources.length`, counts by `status`, `report.buckets.length`,
`report.gaps.length`, and `diversity.meanPairIou`.

If the source count is 19 and you expected 30, the PR #1 worktree is missing.
Fix that first; a silent corpus shrink invalidates every comparison afterwards.

### Step 2 — Triage every rejection before harvesting

Read `report.sources[*].parts[*].reasonCodes` and classify each blocker with
`references/failure-catalogue.md` § Triage:

| Code | Meaning | Correct response |
|---|---|---|
| `part-not-visible` / `low-coverage` | not in this plate | ignore; get another plate |
| `low-fill` | probe found too little foreground | ignore part |
| `weak-walls` | no two-sided edge | ignore part; likely garment |
| `width-mismatch` | measured width disagrees with the rig | ignore part |
| `merged-with-neighbour` | tube spans two limbs | ignore part |
| `wrong-material:skin=…` | region is fabric, not skin | **never** harvest; logging it is the fix |
| `pose-unverified:…` | plate is not the pose it claims | ignore whole plate |

Then classify the gaps, which is the only output that can justify new imagery:

- **Pose gap** — the part is visible but no plate holds it at that angle.
  A new pose from the same camera can close it.
- **Camera gap** — the part is structurally occluded for every pose from this
  viewpoint (near upper arm in profile; near thigh top behind shorts; far-side
  limbs). No number of new profiles closes it; it needs another viewpoint or an
  isolated limb study.

Write the two lists down. Do not generate anything yet.

### Step 3 — Harvest

```bash
npm run pose-material:harvest -- --pr1-root=/tmp/pr1
```

Read `src/images/pose-material/harvest-report.json`. Zero materials is a valid
result **only** when every attempt carries a reason; it is never fixed by
loosening a threshold. If zero materials appear and the reasons are all
`round-trip`, suspect the verifier or the rectifier contract before the corpus —
see `references/geometry-contract.md`.

### Step 4 — Verify the bank record by record

```bash
npx tsx .claude/skills/harvest-pose-material/scripts/verify-run.ts
```

Each material must carry: a measured angle and bucket, `sourceSha256`,
`skinFraction ≥ 0.45`, `roundTrip.alphaIou ≥ 0.85`, `roundTrip.meanColorDelta ≤ 24`,
a **repo-relative** `cutoutPath`, and a `cutoutSha256` that matches the file on
disk. Any material that cannot produce those numbers is not material.

### Step 5 — Render and measure the cycle

```bash
npm run pose-material:demo -- /tmp/pose-material-demo
```

The report must show: `framesRendered = 16`, `detachedIslands = 0`,
`groundDeltaMaxPx ≤ 2` (material-induced, measured against the studio-bank
baseline), `meanPairIou ≤ 0.85`, `maxPairIou ≤ 0.95`, `halfCycleIou ≤ 0.90`.

`stanceSoleSpreadPx` is **rig-owned** foot-roll behaviour, not a material defect.
Do not "fix" it by moving the ground line.

### Step 6 — Inspect the contact sheet

Open `/tmp/pose-material-demo/contact-sheet-material.png` with the image reader.
Metrics can be green while the picture is wrong: blob limbs, mirrored shading,
shorts-covered skin, a foot detached at the ankle. State plainly what you see.

This step is mandatory. A run without visual review is incomplete.

### Step 7 — Gate and report

```bash
bash .claude/skills/harvest-pose-material/scripts/run-pipeline.sh
npx tsx .claude/skills/harvest-pose-material/scripts/summarize-run.ts --out docs/POSE_MATERIAL_RUN.md
```

`run-pipeline.sh` executes audit → harvest → demo → verify and exits non-zero if
any gate fails. `summarize-run.ts` writes the run record using
`assets/run-report-template.md`.

### Step 8 — Record the decision

Add a `TURN-LNN` row to `docs/FDS.md` § 12.4 and, if a rule or threshold changed,
an `ADD-NNN` entry to `docs/ADDENDA.md`. Rejections are evidence: keep them.
Never delete a failed material to make the summary look better.

## Hard rules

These cost real debugging time. Do not relitigate them.

1. **Verify appearance on the source, inside the probe tube** — never on the
   cutout. A jersey interior is opaque, saturated and edge-rich; a histogram of a
   crop cannot say "not a limb".
2. **The rectifier must mirror the renderer's lateral mapping**: renderer
   `x = 80 − uOff`, so rectifier `across = (80 − x) · lateralScale`. A mirrored
   cutout still scores 0.58–0.69 on a naive verifier.
3. **Isotropy is one shared number.** `isotropicLateralExtent(len) = 80·len/88`,
   used by rectifier *and* verifier. Anisotropic lateral scaling renders limbs
   ~2× too wide and is the classic "skin blob".
4. **The round trip compares only foreground inside the tube footprint**, shaft
   only, caps excluded. Comparing against all anatomy in a padded box rejects
   correct tubes at IoU ≈ 0.5.
5. **Caps must be small**: proximal 3 px, distal `clamp(0.28·halfWidth, 6, 12)`.
   The renderer magnifies beyond-bone-end material by `80 / dstHalfWidthPx`.
6. **Trim the proximal end**: 0.28 for upper arm and thigh (hidden by torso and
   shorts), 0.08 elsewhere, and keep only the per-row span crossing the axis.
7. **Static parts are never re-harvested.** Head, neck, torso and pelvis come from
   `extractSimilarityAlignedPart`.
8. **Near/far identity is not provable from one profile.** Record
   `sideProvenance: 'guide-derived'` and move on. Treating it as a veto is why the
   pilot produced zero materials for months.
9. **No silent fallbacks.** A missing bucket is logged as a gap. Substituting the
   standing cutout at an extreme angle is the original "same sausage at every
   angle" defect.
10. **Never loosen a threshold to make a run pass.** Change the measurement, the
    plate or the geometry — and record which.

## Thresholds

| Quantity | Value |
|---|---|
| fill / wallContrast / widthAgreement / isolation | 0.72 / 0.42 / 0.35 / 0.20 |
| fringe / interior leak / key residue | 0.08 / 0.014 / 0.003 of plate |
| round-trip α-IoU / mean colour Δ | ≥ 0.85 / ≤ 24 |
| limb skin dominance | ≥ 0.45 |
| pose gate (`poseMatchRatio`) | ≥ 0.80 |
| bucket lattice / selection tolerance | 15° / 18° |
| cycle mean / max / half-cycle IoU | ≤ 0.85 / ≤ 0.95 / ≤ 0.90 |
| material-induced ground delta | ≤ 2 px |

Full statements: `references/acceptance-criteria.md`.

## Reference index

- `references/acceptance-criteria.md` — AC-1…AC-12 with the command that measures each.
- `references/geometry-contract.md` — rectifier/renderer contract, probe, verifier, caps, trims.
- `references/failure-catalogue.md` — the seven flaw classes, the rejection triage table, dead ends not to retry.
- `references/objective-register.md` — the six conditions (C1–C6), the eleven work items (I-1…I-11), current standing, gap classification.
- `references/run-log.md` — the runs of this skill so far and what each changed.
- `assets/run-report-template.md` — the required shape of a run report.

## Anti-patterns

- **"It looks fine in the crop."** Crops hide scale error. Only the assembled
  cycle and the round trip can see it.
- **Judging an image by its prompt.** A plate is its pixels. `poseMatchRatio` or
  nothing.
- **Averaging away a rejection.** One wrong part poisons a frame; report per part.
- **Generating to fix a measurement bug.** The mirrored-axis bug looked exactly
  like a bad corpus. Check the contract first.
- **Reporting "0 gaps" by widening tolerance.** Coverage is measured at 12°
  (acceptance) and 18° (selection); report both.
- **Committing scratch scripts.** Any `*.tmp.*` file breaks the repo-wide
  typecheck; delete them before recording the run.

## Output format

Every run produces a report in this shape (see
`assets/run-report-template.md`):

1. **Commit & corpus** — commit short hash, source counts, PR #1 root used.
2. **Audit** — accepted / conditional / rejected, buckets, gaps, diversity.
3. **Materials** — one row per material: part, angle, bucket, skin, α-IoU, Δcolour.
4. **Rejections** — counts by reason code, with the most common cause named.
5. **Cycle** — the five AC-9/AC-10 numbers with pass/fail.
6. **Visual review** — what the contact sheet actually shows, in words.
7. **Gap classification** — pose gaps vs camera gaps, with the next action.
8. **Decision** — FDS/ADDENDA references, or "no change; measured only".
