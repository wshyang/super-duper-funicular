# SPEC — module contracts and invariants

This is the engineering contract behind `docs/PIPELINE.md`. The pipeline document
says *what* we are building and why; this one says what each module is allowed to
assume and what it must guarantee, so that a change can be judged without
watching sixteen frames.

Everything here is enforced by code in `src/discipline/gate.ts` where possible,
and by `npm run validate` always.

---

## 1. Coordinate spaces

| Space | Units | Origin | Used by |
|---|---|---|---|
| **sprite** | px, 220 × 256 | top-left, `y` down | rig, pose, renderer |
| **master** | px, arbitrary (currently 1408 × 768) | top-left, `y` down | profiler, atlas |
| **atlas** | cells, 96 × 44 per bone | `u ∈ [0,1]` along the bone, `v ∈ [-1,1]` across | atlas, sampler |

The only bridge between sprite and master is a `Correspondence`
(`src/profile/register.ts`). Nothing else may convert between them, and no module
outside `persona.ts` may hold a master-space constant.

**Invariant C1.** `toMaster` is monotone in `y` and continuous: a joint row maps
to one master row, and the six stretch parameters are the only free variables.

**Invariant C2.** `applyCorrespondence` scales a bone's half-widths by
`scale × (0.5 + 0.5 × localStretch)`, so a bone stretched vertically also widens.
Without this, a stretched torso samples a tile that is too narrow and the texture
smears.

---

## 2. Bones

`src/rig/bones.ts` defines exactly 17 bones and their four attributes:

| Attribute | Meaning | Who depends on it |
|---|---|---|
| `layer` | `back` or `front` | renderer: two passes only |
| `paintOrder` | 1..8 inside a layer | renderer, atlas visibility |
| `priority` | coarse front/back rank | atlas tie-break |
| `halfWidth{Proximal,Distal}` | capsule radius in the current space | atlas unwrap, renderer feather |

**Invariant B1.** `layer` and `paintOrder` are constants of anatomy, not of the
photograph, the pose, or the persona. A persona may change a *length* or a
*width*; it may never change the order in which a hand paints over a forearm.

**Invariant B2.** The set of bone ids is closed. The atlas is a
`Record<BoneId, AtlasTile>`; a missing bone is a type error, not a runtime branch.

---

## 3. Atlas

`src/atlas/unwrap.ts`.

**Invariant A1 (containment).** A tile cell may only receive pixels that were
assigned to that bone. Assignment happens once, in `buildAtlas`, through a
`Claim` callback; there is no second path into the accumulator.

**Invariant A2 (evidence ordering).** Pixels are claimed in this order, and each
stage only sees what the previous stage did not take:

1. occlusion-aware assignment (material → most forward containing bone → distance)
2. recovery for starved bones (`< 40` observed cells), inside their own capsule
3. fringe, within 2.5 capsule radii, at reduced weight

Synthesis happens strictly after all three.

**Invariant A3 (counted synthesis).** Every cell that is not `observed` is either
left transparent or filled by `interpolateGap`, which requires an observation on
*both* sides of the hole. There is no extrapolation past the last observation.
`report.syntheticFraction` counts what was filled, including the mirrored far
side.

**Invariant A4 (no invented fringe).** The sampler clamps `v` to `[-1, 1]`; the
renderer never reads outside that band. The tile is therefore a closed surface.

---

## 4. Renderer

`src/render/skin.ts`.

**Invariant R1 (two passes).** Frame assembly is `back` then `front`. There is no
per-frame depth sort.

**Invariant R2 (determinism).** For a given `(pose, context)`, the output bytes
are identical across runs. There is no clock, no randomness, no environment. The
discipline gate bans `Date.now`, `Math.random`, `process.env` and `new Date(`
inside `src/core`, `src/rig`, `src/atlas`, `src/control`, `src/analysis`,
`src/profile`, `src/render`.

**Invariant R3 (feather bound).** A bone's coverage feather is at most
`1 + 0.9 / halfWidth` in normalised units, so the visible edge is never wider
than about one pixel regardless of limb scale.

---

## 5. Gates

Two levels, both machine-readable.

**Per frame** (`src/analysis/gates.ts`):

| Gate | Threshold | Why |
|---|---|---|
| `adjacentPop` | `≤ 0.22` silhouette IoU drop between neighbouring phases | catches popping |
| `centroidJitterPx` | `≤ 1.5` head-centre horizontal drift between phases | catches sliding |
| `contactGroundSpreadPx` | `≤ 2` spread of the lowest opaque row across stance frames | catches floating |

**Per persona** (`scripts/audit-cycle.ts`, `out/audit/<id>/audit-report.json`):

| Check | Threshold | Why |
|---|---|---|
| `atlas.syntheticFraction` | `≤ 0.35` | bounds invention |
| `atlas.bonesWithoutEvidence` | `0` | a bone with no photograph is a drawing |
| `atlas.unassignedFraction` | `≤ 0.12` | bounds photographed surface that is lost |
| `correspondence.silhouetteIou` | `≥ 0.35` | the rig at least resembles the plate |
| `keying.holesInsideSubject` | `≤ 0.002` | the key must not eat the subject |
| `frames.maxIslands` | `0` detached fragments | one surface per figure |
| `frames.spillPixels` | `0` | no backdrop colour in the output |
| `discipline.violations` | `0` | file/function size, determinism |

**Rule G1.** A gate that cannot fail is a bug. `countOpaqueIslands` used to count
every component, so a healthy frame scored 1 against a threshold of 0; it now
counts components *other than the largest*.

**Rule G2.** A threshold is a design budget stated before the measurement, and it
lives in `src/analysis/thresholds.ts` or next to the check that uses it. A
threshold edited to make a build pass is a lie with a decimal point.

---

## 6. File formats

`persona.json` (`out/profile/<id>/`)

```jsonc
{
  "detectedKey": { "r": 220, "g": 74, "b": 164 },
  "landmarks": { "headTop": 39, "neck": 157, "shoulder": 219, "sole": 746 },
  "correspondence": { "scale": 3.4488, "originX": 708.5, "originY": 378.4,
                      "headStretch": 1.32, "neckStretch": 1.60,
                      "torsoStretch": 0.78, "thighStretch": 0.98,
                      "shinStretch": 0.98, "armStretch": 0.78,
                      "iou": 0.458 }
}
```

`atlas-report.json` — per bone: observed cells, synthetic cells, measured
half-width. Plus `subjectPixels`, `unassignedSubjectPixels`,
`syntheticFraction`.

`manifest.json` — written **after** every frame it names. Contains the phase
list, pivots, foot anchors, gates, and the atlas report.

**Invariant F1.** A manifest never references a file that does not exist.

---

## 7. Layers of dependency

```
core  →  (nothing)
rig   →  core
profile → core, analysis
atlas →  core, rig, profile, analysis
render → core, rig, atlas, profile
analysis → core
discipline → (filesystem only)
scripts → everything
```

`analysis/chroma.ts` exists so that the plate keyer (`profile`) and the output
auditor (`analysis`) share one definition of "this pixel is backdrop". Two copies
of that rule is how the previous branches ended up auditing with a looser test
than they keyed with.

**Invariant D1.** No module imports upward in this list. `analysis` may not
import `profile`, which is why `Rgb` is imported there as a type only.

---

## 8. What is deliberately not specified

- **3/4 and frontal views.** The occlusion order is a lateral-view statement. A
  second view needs its own order and its own atlas, and that is a new pipeline,
  not a parameter.
- **Cloth simulation, hair simulation.** Hair is one capsule with a lag term.
  It is the weakest visual element in the output and is listed as such in
  `docs/VALIDATION.md`.
- **Sub-pixel motion blur, motion lines, ground contact shadows.** Delivery
  concerns, deliberately left to the consumer.
