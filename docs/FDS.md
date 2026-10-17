# Functional Design Spec — Funicular Runner Lab v1.0.0

Harmonised greenfield implementation of a sprite-motion / stride laboratory. Dual audience: coding agents and human reviewers.

## 1. Problem

The source JPEG (`incorrect running sprites.jpeg`) is a 6-color × 8-frame sheet with duplicated half-cycles, unilateral lead-leg lock, missing crossover, and baseline jitter. The product must (a) diagnose those flaws on real pixels, (b) synthesise a biomechanically grounded runner, (c) leave a photographic-rig path for later skinning.

## 2. Objects

- **GaitControls** — cadence, strideLength, dutyFactor, lean, armSwing, bobGain. Constraints in `GAIT_LIMITS`. Invalid values clamp; no user-facing error because sliders cannot exceed bounds.
- **GaitParameters** — derived physical timings. dutyFactor must stay < 0.5 so a flight phase exists.
- **BodyMetrics** — persona-scoped lengths in body-heights. Crown at 1.0 when standing.
- **ArticulatedPose** — 17-part intent: hair, head, neck, torso/pelvis, near/far thigh, shin, foot (hind+fore), upper arm, forearm/hand.
- **Palette** — six colourways matching the source sheet.
- **CycleMetrics** — crossoverCount, flightCount, maxFootDelta, unilateralLock.

## 3. States (playback)

`playing` | `paused`. Legal: either → the other via Play. Forbidden: skipping phase wrap (phase always `mod 1`).

## 4. Features (Phase 1)

1. Procedural male/female runners with 2-bone IK, midfoot strike → sole roll → heel-off → toe-off.
2. Studio: play/pause, persona, palette, cadence/stride/lean.
3. Diagnostics: crossover, flight, lock.
4. Magenta chroma-key primitive and hashing for later sheet cut.
5. Live n-way comparison ledger vs three unmerged PRs.

Phase 2 (deferred): photographic near/far plates, rounded joint cutter activation, SVG stitcher, Playwright e2e.

## 5. Adopted strengths (from peer branches)

| Source | Adopted |
| --- | --- |
| Sprite Motion Lab (917ef347) | 17-part inventory, image-prompt audit, magenta key without eating jersey, SVG stitcher as Phase 2, React + Vite 0.0.0.0 |
| Stride Lab (263385da) | Studio UX split (stage/controls), motion settings hook, photo end-cut research, Playwright later |
| Procedural (77ffb088) | Evidence-led FDS learning, `npm run validate`, `branches:compare`, bone-local end-caps deferred until visual proof, vanilla-quality gait constants, dutyFactor < 0.5 |

Rejected: blindly enabling end-caps (PR3: crescent gap still visible). Rejected: copying React 19 + Playwright + Python extractor in Phase 1 (scope). Rejected: claiming photoreal parity without plates on this branch.

## 6. Image prompt log

None this turn. Historical prompts on peer branches are not reconstructed as verbatim here.

## 7. Continuous learning log

### TURN-L01 — 2026-10-17

- **Trigger:** Adopt greenfield; n-way compare unmerged PRs; implement harmonised lab.
- **Evidence:** `git ls-remote` heads `e172b0f1` (917ef347), `b227e2fe` (263385da), `43352cf3` (77ffb088); inspected trees via `git show` without switching session branch `arena/24e7b955`.
- **Learnings:** PR1 richest photoreal+SVG; PR2 richest interactive studio; PR3 most honest quality plan and compare script. All three already run n-way docs — this branch must keep the ledger live.
- **Decisions:** ADD-001 stack; Phase 1 procedural lab; photoreal/SVG/end-caps Phase 2.
- **Validation:** `npm run validate` — typecheck clean, 9/9 tests, production build (`dist/`). Canvas getContext missing in jsdom is logged, paintPose no-ops. Docker/e2e not run.
- **Next:** extract real sheet grid, photo plates, visual cycle dump.

## 8. Open gaps vs peers

Photoreal assets, SVG frames, Playwright, Python extract, 177-test surface, rounded-joint cutter, far-side photo plates.
