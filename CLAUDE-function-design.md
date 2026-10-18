# CLAUDE-function-design.md — Function Design & Module Structure (§7)

Adopted from `GREENFIELD.md §7` and enforced by
`src/discipline/greenfield-gate.test.ts`.

## 7.1 Size

- **≤ 20 lines** target per function body; **50 lines hard limit**.
- If a block needs a comment to explain *what* it does, extract it as a named
  function whose name is the comment.
- One level of abstraction per function: orchestration does not sit beside
  bit-twiddling.

## 7.2 Control flow

- Guard clauses first; the happy path is unindented.
- Maximum nesting depth 3. Beyond that, extract.

## 7.3 Parameters

- **≤ 3 parameters.** Four or more values become a typed parameter object.
- **No boolean flags.** `renderPlate(pose, { withJoints: true })` is a flag; split
  into `renderSilhouette(pose)` and `renderSilhouetteWithJoints(pose)`, or take a
  mode union.
- Pass the domain object, not its exploded fields. `renderPlate(pose)` beats
  `renderPlate(hipX, hipY, kneeX, kneeY, …)`.

## 7.4 Purity

- Never mutate an input object. Return a new object.
- A function either returns a value **or** performs a side effect, never both.
- Mutable raster buffers are the one sanctioned exception: a renderer owns a
  `Uint8ClampedArray` and writes into it. That writer is a Modifier, named
  `paint…`/`draw…`/`fill…`, and it returns `void`. A Query never paints.
- Pixel addressing is centralised in `src/core/raster.ts`. No module computes a
  byte offset by hand; that arithmetic is the single most duplicated bug in
  image pipelines.

## 7.5 Naming

- Booleans read as assertions: `isClamped`, `hasContact`, `shouldResample`.
- Functions read as verb + noun: `solveTwoBone`, `measureSilhouette`,
  `evaluateTemporalGate`.
- Units in the name where ambiguity is possible: `groundY`, `strideHalfPx`,
  `phaseRad`, `leanDeg`.
- No abbreviations in domain code.

## 7.6 Module layout

```
src/
  core/        raster, png io, colour, digest          (no domain knowledge)
  rig/         rig spec, IK, gait, foot roll           (pure geometry)
  control/     distance-field capsules, plate renderer (pure → raster)
  analysis/    silhouette metrics, acceptance gates    (pure → report)
  discipline/  mechanical gate tests
scripts/       CLI entry points (the only place with I/O + time)
test/          end-to-end pipeline tests
```

- Group by domain, not by file type.
- Files ≤ 400 lines typical, 800 hard.
- No circular imports between peer domains. `analysis/` may import `core/`;
  `control/` may import `core/` and `rig/`; `core/` imports nothing local.

## 7.7 Smell → remedy

| Smell | Remedy |
|---|---|
| Function over 50 lines | Extract Function |
| Nesting over 3 | Guard Clauses |
| Four parameters | Parameter Object |
| Boolean parameter | Mode union or split function |
| Same derivation computed twice | Explaining variable |
| A literal that encodes one plate's quirk | Measure it in the persona record |
| Renderer that also decides | Separate Query from Modifier |
| God module | Per-domain split + barrel |
| Speculative generality | Delete it |
