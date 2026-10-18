# CLAUDE-conventions.md — Naming, Contracts & Coordinates (§6)

Adopted from `GREENFIELD.md §6`, contextualised for a raster pipeline.

## 6.1 Coordinate and unit conventions

These are the conventions every module must share. Getting them wrong is the
most common source of "the limb points the wrong way" bugs.

- **Image space:** origin top-left, `x` right, `y` down, integer pixel centres at
  `(x + 0.5, y + 0.5)`.
- **Subject faces right (+x).** Anterior is `+x`, posterior is `-x`, superior is
  `-y`. Every asset in the pipeline assumes a right-facing subject; a left-facing
  plate is mirrored at ingest, once, and the mirroring is recorded in the
  manifest.
- **Angles** are radians in maths code and degrees only in specs, prompts, and
  CLI flags. The unit suffix is mandatory: `leanDeg`, `tiltRad`.
- **Phase** is normalised `[0, 1)`; frame `k` of `n` samples `k / n`.
- **Ground line** is a single global `groundY` per rig. Nothing may derived its
  own.
- **Lengths in pixels** carry a `Px` suffix in names; scale factors do not.

## 6.2 Typed contracts

`src/core/types.ts` (and each domain's `types.ts`) define the wire shapes once.
Both the emitter and the consumer import them; a renamed field is a compile
error, not a runtime `undefined` inside a JSON manifest.

## 6.3 Manifests

Every generated artefact set ships a JSON manifest beside it:

- `schemaVersion`, `generatedBy` (script name + version), `sourceHashes`;
- per frame: `id`, `phase`, `pivot`, `trimBox`, `footAnchor`, `silhouetteArea`,
  `gateReport`;
- a top-level `gates` block with pass/fail and the thresholds used.

A consumer must be able to reject a frame bank whose manifest is missing,
incomplete, or failing — all-or-nothing readiness, never partial.

## 6.4 File naming

- Source plates: `NN-role-view.png` (`01-master-lateral.png`,
  `07-near-arm-lateral.png`).
- Derived frames: `frame-NN-phase-XXX.png` with zero padding and phase in
  degrees.
- Never overwrite a rejected candidate; suffix `-candidate-NN` and record the
  verdict in the generation log.

## 6.5 User-facing copy

Internal identifiers (`ADD-041`, `IMG-ERR-14`, `PIPE-ERR-07`) are audit
vocabulary. They belong in documents and test names, never in UI labels or
exported asset names.

## 6.6 Committed vs generated

- Committed: source plates, code, specs, small fixtures, manifests.
- Not committed: `out/`, atlases, contact sheets, intermediate cutouts.
  `.gitignore` lists them; a clean checkout plus `npm run plates` reproduces
  them byte-for-byte.
