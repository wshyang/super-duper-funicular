import type { CutPart } from "./cut.ts";

/**
 * Rounds a limb's ends in bone-local coordinates.
 *
 * `arc-cap.ts` trims a part on the far side of a joint plane with an ellipse
 * about the pivot. That works when the part's mass sits along its bone, and
 * fails when the mass lies sideways of the pivot: measured on this plate, a cap
 * small enough to round the jaw also erased the ponytail (1,788 px), because
 * the ponytail hangs 130 px below `headBase` and any pivot-centred boundary
 * small enough to shape the jaw cuts it too. The deltoid (~70 px off the
 * shoulder), the forefoot (46 px) and the sole (81 px) fail the same way.
 *
 * A bone-local cap shapes corners near the joint and opens into the shaft
 * over a blend band. It remains subtractive: it cannot reconstruct missing
 * texture, and off-axis anatomy beyond the joint plane can still be erased.
 * Per-part visual acceptance is mandatory; defaults remain disabled after the
 * first magnified knee probe showed a crescent gap (see docs/FDS.md L001).
 *
 * Ported from the Stride Lab branch (`arena/263385da`, commit `b227e2f`,
 * `src/motion/photo/end-cuts.ts`) and rewritten for plate pixels: named radii
 * in source pixels instead of rig units, and the mask applied to the cut part's
 * alpha so the registered crop box, the pivot and the IK lengths are untouched.
 */

/** One rounded end: a semicircle of `radius`, opening into the shaft over `blend`. */
export interface EndCap {
  readonly enabled: boolean;
  /** Half the opaque width of the limb across that end, in plate pixels. */
  readonly radius: number;
  /** How far inside the joint plane the cap still trims corners. */
  readonly blend: number;
}

/** Both ends of one part, plus the width of the falloff band. */
export interface PartEndCuts {
  /** The proximal end, at the bone's `from` joint. */
  readonly start: EndCap;
  /** The distal end, at the bone's `to` joint. */
  readonly end: EndCap;
  /** Falloff width in plate pixels; 0 cuts hard. */
  readonly feather: number;
}

/** A bone in plate pixels, proximal joint to distal joint. */
export interface Bone {
  readonly from: readonly [number, number];
  readonly to: readonly [number, number];
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const smooth = (t: number): number => t * t * (3 - 2 * t);

/** The bone's length in plate pixels: the cap at each end is centred on a joint. */
export const boneLength = (bone: Bone): number =>
  Math.hypot(bone.to[0] - bone.from[0], bone.to[1] - bone.from[1]);

/**
 * Plate coordinates into bone-local ones: `y` runs 0 at the proximal joint to
 * `length` at the distal one, `x` is the signed transverse offset. The cap only
 * ever reads `x` and `y`, so it is a property of the bone, not of the plate.
 */
export function boneLocal(bone: Bone, point: readonly [number, number]): readonly [number, number] {
  const span = boneLength(bone);
  if (span < 1e-9) return [0, 0];
  const axisX = (bone.to[0] - bone.from[0]) / span;
  const axisY = (bone.to[1] - bone.from[1]) / span;
  const dx = point[0] - bone.from[0];
  const dy = point[1] - bone.from[1];
  return [dx * axisY - dy * axisX, dx * axisX + dy * axisY];
}

/**
 * One end's alpha in bone-local coordinates.
 *
 * Beyond the joint plane (`y < 0`) the boundary is the circle of radius
 * `radius` about the pivot — the shape a rotation leaves unchanged. Inside it,
 * the boundary is the pair of straight lines at `±radius`, which keeps the
 * shaft whole, and the two are joined over `blend` pixels so the corner where
 * they meet cannot survive as a step.
 */
export function capAlpha(
  point: readonly [number, number],
  cap: EndCap,
  feather: number,
): number {
  if (!cap.enabled) return 1;
  const [x, y] = point;
  const distance = y < 0 ? Math.hypot(x, y) : Math.abs(x);
  const edge =
    feather === 0
      ? distance <= cap.radius
        ? 1
        : 0
      : smooth(clamp01((cap.radius - distance) / feather + 0.5));
  const blend =
    cap.blend === 0 ? (y > 0 ? 1 : 0) : smooth(clamp01(y / cap.blend));
  return edge + (1 - edge) * blend;
}

/** Both ends at once; a segment can be capped at both without interference. */
export const endCutAlpha = (
  point: readonly [number, number],
  length: number,
  cuts: PartEndCuts,
): number =>
  capAlpha(point, cuts.start, cuts.feather) *
  capAlpha([point[0], length - point[1]], cuts.end, cuts.feather);

/**
 * Multiplies a cut part's alpha by its two end caps.
 *
 * Only alpha is ever reduced, the crop box and the colour data are returned
 * unchanged, and the pivot pixel keeps full coverage — the part still covers
 * its own rotation axis, which is what the covering neighbour relies on.
 */
export function applyEndCuts(part: CutPart, bone: Bone, cuts: PartEndCuts): CutPart {
  const { width, height, pixels } = part;
  const length = boneLength(bone);
  const out = new Uint8ClampedArray(pixels);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4 + 3;
      const alpha = out[offset] ?? 0;
      if (alpha === 0) continue;
      const local = boneLocal(bone, [x + part.x, y + part.y]);
      const mask = endCutAlpha(local, length, cuts);
      if (mask >= 1) continue;
      out[offset] = Math.round(alpha * mask);
    }
  }
  return { id: part.id, x: part.x, y: part.y, width, height, pixels: out };
}

/** A part whose ends are not capped: both ends disabled, nothing to feather. */
export const noEndCuts: PartEndCuts = {
  start: { enabled: false, radius: 0, blend: 0 },
  end: { enabled: false, radius: 0, blend: 0 },
  feather: 0,
};
