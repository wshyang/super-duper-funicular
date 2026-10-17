# FDS — Harmonised Runner (living spec, FDS_BUILDER v2.0 conventions)
Version 0.1 · 2026-10-17 · Status: DRAFT-IMPLEMENTED (stage 3 v1)
## Purpose / users / core capabilities
Fix the flawed reference sheet (`incorrect running sprites.jpeg`, visually inspected: near-identical leg poses across frames, no true alternating gait, floating feet) with a *procedural* articulated runner whose gait is computed (IK + foot-roll), skinnable, auditable over a full cycle — converging all sibling branches to behavioural feature parity (ledger: `docs/N_WAY_COMPARISON.md`).
## Objects (phase 1)
`Persona{id,label,skin,top,shorts,shoe,hair,scale}` · `GaitParams{strideHz,leanDeg,bounce,armSwingDeg}` · `Pose{phase,hip,neckBase,head,joints,footRoll}` · `PaintOp{kind,from,to,r,color,part}` · `CycleAudit{samples,maxKneeFlexionDeg,footCrossings,symmetric,notes}`. No DB (CLAUDE-database dormant). Relationships: Pose→PaintOp[] via Persona; CycleAudit over Pose[phase∈[0,1)).
## Features (BDD)
- FEAT-01 Pose engine: Given phase∈[0,1), When `poseAt`, Then periodic pose, half-cycle symmetric, IK preserves segment lengths (tests/core.test.ts).
- FEAT-02 Render: Given pose+persona, When `buildScene`, Then far-side parts paint before near-side, joints rounded (capsule caps).
- FEAT-03 Workbench: Given app open, When play/scrub/motion/persona controls used (every control `data-testid`'d), Then canvas + audit line update. Failure: unknown persona → falls back to first persona. Empty state: n/a (no lists).
- FEAT-04 Cycle audit: Given 32+ samples, When `auditCycle`, Then ≥2 foot crossings, symmetry flag, honest "analytic only" note.
## NFR
PERF: pose+scene <1ms/frame (pure math). A11Y: labelled controls. SEC: no backend/data. Validation: `npm run validate` (typecheck+vitest+build).
## Image-prompt-log {#image-prompt-log}
No `generate_image` calls made on this branch to date (2026-10-17). Future calls must append verbatim prompt + target + references here; regenerations append Regeneration Justification (CLAUDE rule 4). Do not fabricate sibling branches' historical prompts — theirs live in #1 `docs/FDS.md`, #3 `docs/PHOTO-PROMPTS.md`.
## Continuous-learning-log {#continuous-learning-log}
### TURN-L01 · 2026-10-17 · Foundation + n-way synthesis (stage 1→3)
- **Trigger:** adopt greenfield, compare unmerged sibling branches, build harmonised CLAUDE/FDS, then implement.
- **Evidence inspected:** `git ls-remote` SHAs (ledger §1); PRs #1–#3 via `gh`; tree/CLAUDE/package/test inventories of pr/1, pr/2, pr/3, pr/extra (ce6d2a6e) via `git show`/`ls-tree` in fetched refs (session branch never switched); upstream greenfield cloned read-only; reference JPEG viewed directly (gait flaw confirmed visually).
- **Learnings:** (i) #1/#3 independently invented near-identical continuous-learning + 3-way parity discipline — strong signal, adopted and generalised to n-way; (ii) #3's dependency-free `lib/` domain split and `branches:compare` are the most portable assets; #1's prompt-audit log is unique and adopted; #2's Playwright e2e + motion families are the UX/test benchmark; ce6's small co-located-test core is the readability benchmark; (iii) file-count/test-count ≠ visual quality (#3's own rule).
- **Adopted/rectified/deferred:** ADD-001..003, CROSS-01..05 in ADDENDA. Deferred photo/extraction/SVG — asset-heavy, needs behavioural specs first.
- **Validation executed:** `npm run validate` green (6/6 tests, build ok); `npm run branches:compare` executed live. **Not run:** browser/visual filmstrip sign-off, Docker smoke, Playwright — audit output therefore labelled analytic-only in-app.
- **Next actions:** refresh ledger hashes post-push; CROSS-05 extraction on the real JPEG with byte-reproducible manifest; enlarged filmstrip visual audit; Playwright smoke.
