import type { KeyedImage } from "./chroma.ts";

/**
 * Registers a second photographic plate onto the first so a cleanly shot part
 * (an arm-free torso) can replace the pixels the original plate never had. Two
 * corresponding anchor pairs fix the similarity: rotation, uniform scale, and
 * translation — enough to line two studio frames up without shear.
 */

export type Point = readonly [number, number];

/** The transform's parts, kept explicit so tests can assert the maths. */
export interface Similarity {
  readonly scale: number;
  readonly cos: number;
  readonly sin: number;
  readonly tx: number;
  readonly ty: number;
}

/** A patch plate's fit onto the base plate, in base-plate pixels. */
export interface PatchPlate {
  readonly source: string;
  /** Anchor pair measured on the patch plate. */
  readonly from: readonly [Point, Point];
  /** The same pair measured on the base plate. */
  readonly to: readonly [Point, Point];
  /** Where the patch may replace pixels, in base-plate pixels. */
  readonly clip: readonly Point[];
}

const delta = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];

/** Solves the similarity that maps `from` onto `to`, anchors exactly. */
export function fitSimilarity(from: readonly [Point, Point], to: readonly [Point, Point]): Similarity {
  const d0 = delta(from[1], from[0]);
  const d1 = delta(to[1], to[0]);
  const length0 = Math.hypot(d0[0], d0[1]);
  const length1 = Math.hypot(d1[0], d1[1]);
  if (length0 < 1e-6 || length1 < 1e-6) throw new Error("patch anchors must be distinct");
  const scale = length1 / length0;
  const cos = (d0[0] * d1[0] + d0[1] * d1[1]) / (length0 * length1);
  const sin = (d0[0] * d1[1] - d0[1] * d1[0]) / (length0 * length1);
  const tx = to[0][0] - (scale * cos * from[0][0] - scale * sin * from[0][1]);
  const ty = to[0][1] - (scale * sin * from[0][0] + scale * cos * from[0][1]);
  return { scale, cos, sin, tx, ty };
}

/** Destination pixel back to the patch plate's own coordinates. */
export function sourceAt(sim: Similarity, x: number, y: number): Point {
  const dx = x - sim.tx;
  const dy = y - sim.ty;
  return [(dx * sim.cos + dy * sim.sin) / sim.scale, (-dx * sim.sin + dy * sim.cos) / sim.scale];
}

const sample = (image: KeyedImage, x: number, y: number): readonly [number, number, number, number] => {
  const x0 = Math.max(0, Math.min(image.width - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(image.height - 1, Math.floor(y)));
  const x1 = Math.min(image.width - 1, x0 + 1);
  const y1 = Math.min(image.height - 1, y0 + 1);
  const fx = Math.max(0, Math.min(1, x - x0));
  const fy = Math.max(0, Math.min(1, y - y0));
  if (x < 0 || y < 0 || x > image.width - 1 || y > image.height - 1) return [0, 0, 0, 0];
  const corners = [
    [y0 * image.width + x0, (1 - fx) * (1 - fy)],
    [y0 * image.width + x1, fx * (1 - fy)],
    [y1 * image.width + x0, (1 - fx) * fy],
    [y1 * image.width + x1, fx * fy],
  ] as const;
  let alpha = 0;
  const colour = [0, 0, 0];
  for (const [index, weight] of corners) {
    const a = image.alpha[index] ?? 0;
    alpha += a * weight;
    for (let channel = 0; channel < 3; channel += 1) {
      colour[channel] = (colour[channel] ?? 0) + ((image.data[index * 4 + channel] ?? 0) / 255) * a * weight;
    }
  }
  if (alpha <= 1e-6) return [0, 0, 0, 0];
  return [
    Math.round(((colour[0] ?? 0) / alpha) * 255),
    Math.round(((colour[1] ?? 0) / alpha) * 255),
    Math.round(((colour[2] ?? 0) / alpha) * 255),
    alpha,
  ];
};

/** Inverse-mapped bilinear warp of a keyed plate into destination coordinates. */
export function warpKeyed(image: KeyedImage, sim: Similarity, width: number, height: number): KeyedImage {
  const data = new Uint8ClampedArray(width * height * 4);
  const alpha = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [sx, sy] = sourceAt(sim, x, y);
      const [r, g, b, a] = sample(image, sx, sy);
      const index = y * width + x;
      const offset = index * 4;
      data[offset] = r;
      data[offset + 1] = g;
      data[offset + 2] = b;
      data[offset + 3] = Math.round(a * 255);
      alpha[index] = a;
    }
  }
  return { width, height, data, alpha };
}

/** Barycentric point-in-polygon for the clip boundary. */
const insideClip = (x: number, y: number, clip: readonly Point[]): boolean => {
  let inside = false;
  for (let i = 0, j = clip.length - 1; i < clip.length; j = i, i += 1) {
    const [xi, yi] = clip[i] as Point;
    const [xj, yj] = clip[j] as Point;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

/**
 * Replaces the base plate's pixels with the patch wherever the patch is opaque
 * inside the clip. The patch's own transparent holes (a neck hole, an arm hole)
 * deliberately keep the base plate's pixels, so the original neck and limbs
 * show through the replacement garment exactly where it has no fabric.
 */
export function compositeKeyed(base: KeyedImage, patch: KeyedImage, clip: readonly Point[]): KeyedImage {
  const data = new Uint8ClampedArray(base.data);
  const alpha = new Float32Array(base.alpha);
  for (let y = 0; y < base.height; y += 1) {
    for (let x = 0; x < base.width; x += 1) {
      const index = y * base.width + x;
      const a = patch.alpha[index] ?? 0;
      if (a < 0.5 || !insideClip(x + 0.5, y + 0.5, clip)) continue;
      const offset = index * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        data[offset + channel] = patch.data[offset + channel] ?? 0;
      }
      alpha[index] = a;
    }
  }
  return { width: base.width, height: base.height, data, alpha };
}
