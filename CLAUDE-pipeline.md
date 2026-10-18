# CLAUDE-pipeline.md — Pipeline Invariants & Anti-Patterns (§P)

The architecture is described in [`docs/PIPELINE.md`](./docs/PIPELINE.md). This
file is the short list of rules that keeps it that way.

## P.1 One geometric truth

A frame's pose is defined **once**, by the rig, before any image model runs.
Every later stage may measure the frame; only the rig may define it. If a
generated frame disagrees with the rig, the frame is warped toward the rig or
rejected — the rig is never bent to fit the picture.

## P.2 One appearance source per persona

A persona has exactly one verified master photograph. All frames of that persona
derive from it. Two masters (one for the torso, one for the arm) is the defect
that produced a 203 px male arm on a 166 cm female runner.

## P.3 Parts are derived, never authoritative

Downstream consumers may need per-part cutouts (an articulated 2D rig, an SVG
export). Those parts are **cut from accepted whole frames** along the rig's joint
lines. A part is therefore always consistent with the frame it came from, and a
new persona does not require a new set of ten studio plates.

Cutting a part from a frame is a lossy projection; the frame stays the record.

## P.4 Joint geometry is a shared contract

Two segments that share a joint share its pivot coordinate and its cap radius,
and both are expressed in the same units as the rig. A cut is valid only if the
two caps are concentric about the solved pivot after rotation. This is the
property the rounded-cap trick exists to guarantee; it is verified, not assumed.

## P.5 Silhouette tolerance is a number, not a feeling

The acceptance gate has explicit thresholds:

| Measure | Threshold | Why |
|---|---|---|
| Silhouette IoU vs. control plate | ≥ 0.92 per frame | Below this the frame is a different pose |
| Adjacent-phase IoU | within the band implied by the rig | A spike means a pop |
| Centroid jitter (adjacent) | ≤ 1.5 px | Otherwise the character slides |
| Ground-line delta on contact frames | ≤ 1 px | Otherwise the character floats or sinks |
| Detached islands | 0 | Specks read as dirt |
| Magenta-spill pixels | 0 | Fringing reads as glow |
| Limb count | exactly 4 (2 arms, 2 legs) | The most common generation failure |

Thresholds live in one module (`src/analysis/thresholds.ts`) and are quoted in
the manifest so a report is reproducible.

## P.6 No per-persona crop constants

Measurement replaces literals. The persona record stores widths, lengths, and
garment boundaries *derived from the plate* by the profiler, with the profile
exported next to the plate. If a value cannot be measured, it is a documented
estimate with its rationale — not a magic number sprinkled through an extractor.

## P.7 Deterministic fallback everywhere

Every stage that can fail has a deterministic path: if generation is
unavailable, the control plate itself is a renderable sprite (flat-shaded), and
the cycle still animates. The pipeline's worst case is "less photographic",
never "no output".

## P.8 No parallel sources of truth in documentation

One pipeline document, one FDS, one addenda register, one validation ledger.
Duplicated copies of a comparison table in four files is how a repository spends
half its lines describing itself. See `ADD-003`.
