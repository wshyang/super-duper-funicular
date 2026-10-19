---
name: pose-variation-harvest
description: Vary character poses to generate more usable material for sprite capture. Use when user asks to vary poses, generate pose banks, harvest sprite jigs, fix generic sprint collapse or ground-shadow, or iterate pose variation until it works. Triggers on phrases like "vary character poses", "more usable material", "sprite capture", "pose bank", "H03 H06 H07", "X-inserts", "ground shadow", "sprint prior", "pose variation harvest".
argument-hint: "[persona] [phase]"
---

# Pose Variation Harvest — Repeatable Agent Skill

Distills the core objective, required items, acceptance criteria, challenges, and mitigations from PR #1 + PR #8 + V2 iteration into a repeatable workflow for generating diverse, chroma-key-clean running-phase banks for 17-part articulated sprite capture.

## Objective

Produce a bank (≥8 canonical H01–H08 + ≥3 targeted X-inserts) where every limb has ≥2 isolatable angles, every frame has flat magenta background with crisp shoe edges, and every generation is traceably logged and audit-gated so the flawed 6×8 sheet can be retired.

## When to use this skill

- User asks to vary character poses, generate pose banks, or get more usable sprite material
- User asks to examine PR #1 / PR #8 or iterate pose generation
- User asks to fix generic sprint collapse, ground-shadow, wristband drift, or near/far ambiguity
- User asks to distill core objective / acceptance criteria / challenges into sections
- User says “make it repeatable” or “structure as skill”

## When NOT to use this skill

- Pure rig/animation without photoreal generation (use `audit-gait-cycle` instead)
- Single-image art tasks not tied to harvest bank
- Tasks requiring <17-part or non-lateral capture

## Required Context

- Locked identity master: `src/images/photoreal-female/01-master-lateral-profile-reference.png` (SHA `143b4521…`)
- Existing harvest state: `docs/POSE_HARVEST_LOG.md`, `src/images/photoreal-female-pose-bank/pose-bank.json`, `PHASE_FRAME_COMPLIANCE_LEDGER`
- Current acceptance gates: `docs/ACCEPTANCE_CRITERIA.md`, `docs/CORE_OBJECTIVE_AND_ITEMS.md`
- Guide renderer: `src/pipeline/pose-guide-renderer.ts`, `scripts/render-pose-guides.ts`

## Process

This skill is intentionally divided into **five closed sections** — each must be fully completed before the next opens. Do not interleave.

### Section 1 — Distill Core Objective

Read `references/core-objective.md` (Section 1 of `CORE_OBJECTIVE_AND_ITEMS.md`). Confirm:
- Original flawed sheet: 4 unique poses doubled to 8, unilateral lead-leg, 147 px foot gap (FLAW-01..05)
- Goal: bank where every limb has ≥2 V=3 isolatable angles, flat magenta, traceable logs

> Output: one-sentence objective + 4 decompositions (identity lock, diversity, cleanliness, traceability).

### Section 2 — Enumerate Required Items (I-01..I-08)

Read `references/items-and-contributions.md`. For each item, record how it contributes to the objective:

| ID | Item |
|---|---|
| I-01 | Locked Identity Master (H00) |
| I-02 | High-Resolution Pose-Control Guides (1408×768) |
| I-03 | Canonical 8-Phase Gait Set (H01–H08) |
| I-04 | Targeted Visibility Inserts (X-inserts) |
| I-05 | Chroma-Key Clean Background & Matte Pipeline |
| I-06 | Limb Isolation & Rounded-End Jig Extraction |
| I-07 | Anatomical & Camera Consistency |
| I-08 | Traceable Prompt Audit & Automated Validation |

> Output: enumerated list with contribution sentence per item.

### Section 3 — Define Acceptance Criteria per Item (How Measured)

Read `references/acceptance-criteria-detailed.md` (Section 3). For each I-01..I-08, copy criteria table (threshold + instrument):
- I-01: SHA immutability via `sha256sum`; wristband `b>125,g>100,b−r>24`
- I-02: 1408×768 + ≥12 px / ≥15° guide distinctness
- I-03: support-state per φ + inter-phase Δ≥12 px / ≥15° + no sprint collapse + anti-phase
- I-04: angle uniqueness ±10° + >8 px magenta gap
- I-05: corner variance <8 + shadow <2% via `background-validator.ts` + `magentaSpill=0`
- I-06: visibility 0..3 per part + `avgCore≥0.985` via `harvest-phases` + no edge crop
- I-07: 90° orthographic + L-bend chirality + smooth head-neck seam at 2×
- I-08: verbatim prompt + SHA log + `npm test 55/55, typecheck, build, branches:compare`

> Output: per-item AC tables.

### Section 4 — Detail Challenges per Item

Read `references/challenges-taxonomy.md` (Section 4). For each I-01..I-08, list challenges with PR evidence:

- I-01: outfit drift (X02 #84 black wristband), safety-filter rewrite (literal “unclothed” → empty/bike-shorts), scale jitter
- I-02: low-res 220×256 indistinctness (H01≈H02), color/pixel copy confusion, custom guide cost
- I-03: sprint prior (H03 #76/#82/#91, H07 #80, X04 #85), support vs flight ambiguity (IMG-ERR-19), anti-phase confusion (H05≡H01)
- I-04: open-torso bias (near arm behind torso), gap closure (hand touches hip), angle specificity without guide
- I-05: ground-shadow prior (PR #8 0/8 clean), heal necessity (duplicate wristband, white stripe), pure-#FF00FF mismatch (actual 249,48,229)
- I-06: touching silhouettes (V≤2), cross-section pinch (PIPE-ERR-09), flicker
- I-07: straight-cylinder chirality illusion (need #21 L-bend), head-neck regression (PIPE-ERR-11..14), perspective drift
- I-08: prompt discipline burden, ≤50 LOC gate, provenance lag

> Output: per-item challenge list with severity + evidence.

### Section 5 — Address Challenges per Item (Mitigations)

Read `references/mitigations-playbook.md` (Section 5). For each I-01..I-08, apply mitigation:

- **I-01:** Repeat “both sky-blue wristbands” 3× + negative “no black wristband” + heal heuristic; declare bare-limb variants as `ORTHO-A..C` with sports bra + bikini brief
- **I-02:** Mandate 1408×768 `renderPoseGuideRaster` + anti-copy instruction (“do not copy colors/pixels”) + script `create-compact-guides.ts` with `stride 0.62` overrides
- **I-03:** De-sprinted wording (“biomechanics pressure study”, mm/degree tokens), compact-span 220–280 px, disambiguate flight vs grounded (“only LEFT foot touches”, “both shoes >5 px above line”)
- **I-04:** Leverage open-torso bias (harvest unobstructed torso/pelvis frame), gap >8 px assertion, quantified angle taxonomy (−41.4°,149.5°,+20°) via custom guides
- **I-05:** Positive grounding (“hover 3 mm above dashed line, pure magenta fills every gap”), master-sampled validator (249,48,229 ±18), heal contaminants
- **I-06:** Split `arms→nearForearm/farForearm` visibility, fix right-handed normal `(+suy,−sux)` + `centerX` lerp, shared pivot/scale + flicker check
- **I-07:** 90° L-bend (Call #21), attachment guard (`featherHeadNeckBase`, SDF capsule, `harmonizeNeckToHeadSkin`), camera lock phrase
- **I-08:** Log verbatim prompt+SHA before/after, split >50 LOC functions, run `branches:compare` every turn

Then **execute** the harvest loop:

1. **Generate guides:** `npm run render-pose-guides -- <guide-dir>` or `npx tsx scripts/create-compact-guides.ts` (see `references/guide-generator-usage.md`)
2. **Generate candidates:** `generate_image` with `images: [master, guide]`, template from `assets/prompt-template-H03.txt` (see `references/prompt-templates.md`)
3. **Validate:** `npx tsx scripts/validate-candidates.ts --dir src/images/photoreal-female-pose-bank/candidates` + `npm run harvest-phases -- /tmp/v2-audit` + `npm run dump-cycle -- /tmp/gait-cycle-audit 16 photo-sg-chinese-female red`
4. **Log:** Append to `docs/POSE_HARVEST_LOG.md` + `docs/FDS.md §9` + update `pose-bank.json` visibility/status
5. **Iterate:** If AC-03/05/04 fail, change **guide geometry itself** (not adjectives) — per V2 #88 lesson — and regenerate
6. **Promote:** Only when HRG passes (≥8 distinct + ≥3 inserts, all V=3 coverage, `avgCore≥0.985`, `0 islands/spill/uncovered`, 2× seam pass) run `scripts/init-pose-bank.ts` to select harvest frames

## Constraints

- Never overwrite H00 master; never chain generated frames as identity references
- Never mark extraction-ready by heuristic alone — `read_file` visual mandatory
- Never use pure #FF00FF expectation — validator must use master-sampled 249,48,229
- Keep `SKILL.md` <500 lines; heavy detail lives in `references/` (progressive disclosure)
- Follow `GREENFIELD.md` + `FDS_BUILDER.md` discipline; keep functions ≤50 LOC, files ≤800 LOC

## Verification

- `npm test -- --run` 55/55
- `npm run typecheck` 0 errors
- `npm run build` clean
- `npm run branches:compare` refreshed
- `npx tsx scripts/validate-candidates.ts` passes AC-05 per new frames
- `read_file` on 2× joint-crops-sheet shows no sprint-collapse / gap closure / wristband drift

## Output

Return:
- Distilled objective sentence
- Enumerated I-01..I-08 with contributions
- Per-item AC tables + measurement instruments
- Per-item challenges with PR evidence
- Per-item mitigations with concrete next steps
- List of generated guides/candidates + validation results + promotion decision

## References

- `references/core-objective.md` — Section 1 distilled objective + flawed sheet decomposition
- `references/items-and-contributions.md` — Section 2 enumerated items + contributions
- `references/acceptance-criteria-detailed.md` — Section 3 AC thresholds + measurement
- `references/challenges-taxonomy.md` — Section 4 challenges per item (F-01..F-08, PIPE-ERR-11..14)
- `references/mitigations-playbook.md` — Section 5 mitigations per item + execution playbook
- `references/prompt-templates.md` — prompt wording templates (H03, H06, H07, X07)
- `references/guide-generator-usage.md` — guide creation CLI + overrides
- `scripts/create-compact-guides.ts` — compact toe-off + X07 low-forward guide generator
- `scripts/validate-candidates.ts` — AC-05 background + AC-06 coverage validator
- `assets/prompt-template-H03.txt` — copy-paste H03 template
- `assets/pose-bank-profile-template.json` — profile JSON for `init-pose-bank`
- `assets/skill-checklist.md` — per-turn checklist

## Examples

See `examples.md` (in same directory) for before/after: H03 generic collapse → H07 grounded toe-off success.

