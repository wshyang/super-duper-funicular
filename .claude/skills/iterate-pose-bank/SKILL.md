---
name: iterate-pose-bank
description: Regenerate, audit and accept photoreal pose-bank candidates for sprite capture using the acceptance-gated delta-edit loop. Use when a pose-bank frame is rejected / needs-regeneration / conditional, when generated poses collapse into generic strides that ignore skeleton guides, when candidates fail chroma-key or shadow review, when deriving opposite half-cycle frames, or when building a pose bank for a new character from an accepted identity master.
compatibility: Requires python3 with pillow, numpy, scipy (pip install --break-system-packages pillow numpy scipy), an image-generation capability that accepts reference images, and repo tooling under scripts/.
allowed-tools: Read, Grep, Glob, Bash(python3:*), Bash(sha256sum:*)
---

# Agent Skill: Acceptance-Gated Pose-Bank Iteration (`iterate-pose-bank`)

Converges a stalled pose-variation pilot into accepted, extraction-ready pose plates.
Proven on Calls #91–#95: three phases that failed 4/4 from-scratch regenerations
(H03/H06/H07) reached all-gates PASS in 2, 2 and 1 calls with this loop.

**Goal definition (read before anything):** `docs/POSE_BANK_ACCEPTANCE.md` — gates
G1 identity/wardrobe (visual), G2 framing/scale, G3 key recoverability, G4 phase
foot/ground landmarks, G5 guide fidelity + near/far order (visual), G6 silhouette
diversity. A frame is done when all six pass; automated gates are machine-checked,
visual gates are judged on actual pixels, never inferred.

---

## Step 1 — Triage the manifest

```bash
python3 .claude/skills/iterate-pose-bank/scripts/pose_bank_status.py \
  src/images/photoreal-female-pose-bank/pose-bank.json
```

Lists per-frame status and attempts, verifies identity-anchor and candidate SHA-256
hashes against disk, and prints the work queue (`needs-regeneration` / `rejected` /
`conditional` frames). Exit code 1 means there is work or hash drift — never edit an
asset whose hash does not match its manifest entry; investigate first.

## Step 2 — Baseline audit of existing candidates

```bash
python3 scripts/audit_pose_bank.py --json /tmp/pose-audit.json <candidate paths…>
```

For every frame in the work queue, record which gates fail and why (the report names
the failing landmark, e.g. "shoe separation 260px > 190 — extended sprint drift").
View each failing candidate and its solved guide with the vision tool so the needed
*delta* can be named in joint terms. Diagnose any non-key island with:

```bash
python3 .claude/skills/iterate-pose-bank/scripts/locate_islands.py <candidate.png>
```

## Step 3 — Generate by small delta, never by re-pose

Core finding: **from-scratch generation against a skeleton guide snaps back to the
model's generic-stride prior; editing the nearest reviewed photo with 2–3 named
joint corrections does not.**

1. Pick the base: the reviewed candidate (any status) geometrically closest to the
   target pose. For an opposite half-cycle frame, base = the *accepted* counterpart
   plate and swap only the visible cues (arm counter-swing, near-limb occlusion).
2. Compose the prompt from `references/prompt-templates.md` (delta-edit, repaint-only,
   or counterpart-swap template). Always: full wardrobe lock block verbatim, ≤3
   corrections, each naming a joint and a direction/angle, guide image attached as
   *reference only*.
3. **Log the exact prompt + base/guide SHA-256 in `docs/POSE_HARVEST_LOG.md` before
   generating** (repo rule: FDS `#image-prompt-log` discipline, one call per
   candidate, outputs are immutable evidence).
4. Generate one candidate, then immediately re-run Step 2 on it **and** view it.
   Additionally view a zoomed crop of every newly airborne shoe/sock and every
   edited joint junction — the ghosted-shoe defect (S2) can pass all automated
   gates and is caught only by eye. Match any failure against
   `references/failure-signatures.md` — most defects seen so far are known
   signatures with a known next prompt (e.g. ghosted airborne shoe → repaint-only
   template; it fixed 2/2 on first try).
5. Stop rule: if a frame is not accepted after 3 calls, stop prompting — change the
   *geometry input* instead (new solved-joint guide encoding the exact angles, or a
   different base plate). More adjectives never worked.

## Step 4 — Full-bank verification and normalization

When the queue is empty, audit all eight canonical frames together and emit flat-key
plates:

```bash
python3 scripts/audit_pose_bank.py --json docs/pose-bank-audit.json \
  --normalize src/images/photoreal-female-pose-bank/normalized <all 8 best candidates>
python3 .claude/skills/iterate-pose-bank/scripts/contact_sheet.py /tmp/bank-sheet.png <same 8>
```

Check: 8/8 PASS; within-half-cycle IoU ≤ 0.84; no cross-bank pair ≥ 0.90 (counterpart
pairs φ vs φ+0.5 legitimately run high — H03~H07 = 0.893 is expected, 0.95 is not).
Re-audit `normalized/` (expect shade_px ≈ 0, islands ≤ 150 px) and **visually diff one
normalized plate against its source** — confirm flat background *and* intact subject
(the normalizer once ate crimson-singlet sheen; that bug class is caught only by eye).
View the contact sheet: the bank must read as one coherent alternating gait cycle.

## Step 5 — Record the outcome

For every call: append verdict + output SHA-256 to `docs/POSE_HARVEST_LOG.md`; update
frame status and attempt entries in `pose-bank.json` (`accepted-for-pose` = all gates
pass; `accepted` is reserved for crop-approved); keep rejected candidates on disk as
immutable evidence; close the session with an FDS version row + ADDENDA entry. Record
honest caveats (near/far chirality is pixel-unverifiable in strict profile; log it,
do not claim it).

---

## Hard-won rules (do not relearn these)

- Shadows are **recoverable**, not fatal: key-family shadow pixels flatten in
  normalization. Reject for shadow only if hue leaves the key family.
- Newly **airborne footwear ghosts** (magenta spill, detached island ~2–3k px) more
  often than not. Budget one repaint-only follow-up call for it.
- Wardrobe details **flip** under edits (a wristband once turned black). Enumerate
  them verbatim in every prompt and re-check them in every review.
- Audit gates are **necessary, not sufficient**: #82 passed geometry yet failed
  visual guide fidelity. Never skip the eyeball pass against the solved guide.
- Verify identity against the **H00 master**, not the edit base — edit chains drift.
- When the auditor and a human verdict disagree, recalibrate the auditor thresholds
  against the human call and commit the change; the auditor is versioned in-repo.
