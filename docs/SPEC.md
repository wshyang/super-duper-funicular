# SPEC — Concise Functional Contract (Pipeline Rev-2 Branch)

Companion to `docs/FDS.md` (canonical). This file is the short contract; on conflict, the FDS wins.

## 1. Objects
1. `ImageAsset` — filed plate/sheet with `sha256`, pixel hash, dHash, dimensions, provenance.
2. `PersonaCalibration` (`persona-calibration.v1`) — landmarks, bone lengths/widths (px), crop windows, stripe rects, luminance band, `groundY`, ankle pivot, orientation, revision, provenance.
3. `PartCutout` — `160×160` RGBA, semicircular pivot caps, `+x`-facing, states `candidate|accepted|rejected`.
4. `ArticulatedPose` — 17-part Z-ordered rig over gait phase φ (inherited contract, PR `#1` FDS §3.3).

## 2. Pipeline stages (Rev-2)
`S0 persona def → S1 master gen (≤3 calls) → S2 calibration record → S3 deterministic decompose → S4 medial synthesis → S5 Part Contract gate → S6 assemble & bake → S7 regression audit`.

## 3. Contracts
- **Part Contract:** `PC-01..PC-12` (`docs/PIPELINE_REV2.md` §4); all must pass for `candidate → accepted`; failures append structured rejections to `docs/FDS.md#image-prompt-log`.
- **Registration Contract:** fixed canvas, record `groundY` ± 1 px at stated ankle pivot, dst bone lengths == record values, orientation `+x`.
- **Determinism:** same (master bytes, record, rig spec) ⇒ identical part SHA-256 (`PC-12`).
- **Sheet self-test:** baked cycle sheets must pass `FLAW-01..04` negatives (unique poses per column count, lead-leg swap, two zero-crossings of foot separation, baseline jitter ≤ 1 px).

## 4. Discipline contracts
- Addenda in same change (`ADD-NNN`); verbatim image prompt log; per-turn `TURN-L*` learning entry; 4-way provenance in reports; function ≤ 50 LOC / ≤ 3 params / no flag args; files ≤ 800 LOC; `data-testid` on interactive elements; real-asset tests, zero mocks; watched-branch inspection only outside the checkout.

## 5. Surfaces (this branch)
- Implemented (P1–P2, `ADD-007`): `npm test` (contract + decomposer + calibration + discipline gates), `npm run decompose` (`#surf-decompose-run`; writes parts, contact sheet, golden manifest, `part-contract-report.json` = `#surf-part-rejections` seed), committed goldens (`#surf-regression-diff` baseline).
- Designed, not implemented: `#surf-calibration-review` CLI (record edits are manual JSON + schema gate today), `#surf-sheet-bake`, inherited `#surf-cycle-dump`.
