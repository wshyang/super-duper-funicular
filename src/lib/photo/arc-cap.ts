/**
 * Rounds a part's end into an arc centred on its rotation axis.
 *
 * A disc centred on a pivot is the only shape a rotation leaves unchanged, so
 * a part whose joint-adjacent end follows that disc cannot expose a corner or
 * a straight cut as it swings: the covering neighbour seals the same disc at
 * every angle. This is the rounded-end principle the joint cutter on the
 * sibling branch (`arena/917ef347`, `rounded-joint-cutter.ts`) proved on its
 * canonical canvas; here it is applied to flood regions in plate coordinates.
 */

/** One end cap: an ellipse about a rotation axis, on one side of it. */
export interface ArcCap {
  readonly pivot: readonly [number, number];
  readonly radiusX: number;
  readonly radiusY: number;
  /** The side the part's end is on, relative to the pivot. */
  readonly side: "above" | "below";
  readonly feather?: number;
}

/** A flood region in plate coordinates. */
export interface RegionImage {
  readonly width: number;
  readonly height: number;
  readonly region: Uint8Array;
}

const FADE = 1.6;

/**
 * Erases everything beyond the cap ellipse on the cut side of the pivot.
 * The far side of the pivot is untouched, so a cap only ever shapes the end
 * it names.
 */
export function capArc(image: RegionImage, cap: ArcCap): RegionImage {
  const { width, height, region } = image;
  const [cx, cy] = cap.pivot;
  const radiusX = Math.max(1, cap.radiusX);
  const radiusY = Math.max(1, cap.radiusY);
  const out = new Uint8Array(region);
  for (let y = 0; y < height; y += 1) {
    const dy = y - cy;
    const onCutSide = cap.side === "above" ? dy < 0 : dy > 0;
    if (!onCutSide) continue;
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (out[index] === 0) continue;
      const dist = Math.hypot((x - cx) / radiusX, dy / radiusY);
      if (dist > 1) out[index] = 0;
    }
  }
  return { width, height, region: out };
}

/** The cap's feather band, for callers that want the same falloff. */
export const capFeather = (cap: ArcCap): number => cap.feather ?? FADE;
