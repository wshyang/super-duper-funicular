import type { CutPart } from "./cut.ts";

/** The fields `sealBall` needs to address a cut-out crop's pixels. */
type BallPart = Pick<CutPart, "width" | "height" | "pixels">;

/**
 * The only part of a keyed plate these cuts need: the shape of the frame and how
 * opaque each pixel is. Kept structural so the pure cut maths can be tested
 * without decoding a PNG.
 */
export interface OpaqueImage {
  readonly width: number;
  readonly height: number;
  /** Straight-alpha RGBA; the ball is painted into this. */
  readonly data: Uint8ClampedArray;
  readonly alpha: Float32Array;
}

/** A rotation axis and the radius of the ball that turns on it, in plate pixels. */
export interface JointCircle {
  readonly pivot: readonly [number, number];
  readonly radius: number;
}

/** Which part owns each side of a joint. `child: null` rounds the parent only. */
export interface JointLink {
  readonly parent: number;
  readonly child: number | null;
}

const inside = (x: number, y: number, width: number, height: number): boolean =>
  x >= 0 && y >= 0 && x < width && y < height;

/**
 * The ball is cut this much wider than its socket. The socket's own rim is
 * feather-softened like any silhouette edge, and a hairline of page would show
 * through where the two meet; letting the ball overhang by a pixel puts its
 * opaque rim *over* the socket's, so the seam is invisible at rest.
 */
export const BALL_OVERHANG = 1.5;

/**
 * Gives the ball a solid surface.
 *
 * The ball has to be fully opaque, because only a disc can cover its socket at
 * every angle. Where the plate had no subject there is nothing to copy, so the
 * hollow is filled by relaxing from the surrounding skin: the transparent
 * pixels inside the disc are solved as a smooth membrane pinned to the real
 * texture around them. That reads as a rounded joint end rather than a hole.
 */
function fillBall(image: OpaqueImage, joint: JointCircle): void {
  const { width, height, data } = image;
  const [cx, cy] = joint.pivot;
  const radius = joint.radius;
  const left = Math.max(0, Math.floor(cx - radius));
  const top = Math.max(0, Math.floor(cy - radius));
  const right = Math.min(width - 1, Math.ceil(cx + radius));
  const bottom = Math.min(height - 1, Math.ceil(cy + radius));
  const span = right - left + 1;
  const rows = bottom - top + 1;
  const inDisc = (x: number, y: number): boolean => (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;

  const known = new Float32Array(span * rows * 4);
  const solved = new Float32Array(span * rows * 4);
  const blank = new Uint8Array(span * rows);
  // Only interior pixels may pin the membrane. A silhouette's outermost ring
  // is a blend of skin and backdrop, so it reads as a dark green fringe; using
  // it as a seed would spread that fringe across the whole joint face.
  const solid = (x: number, y: number): boolean => {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) return false;
        if ((data[(ny * width + nx) * 4 + 3] ?? 0) < 230) return false;
      }
    }
    return true;
  };
  let hollow = 0;
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      if (!inDisc(x, y)) continue;
      const cell = (y - top) * span + (x - left);
      const source = (y * width + x) * 4;
      if (solid(x, y)) {
        for (let channel = 0; channel < 3; channel += 1) known[cell * 4 + channel] = data[source + channel] ?? 0;
      } else {
        blank[cell] = 1;
        hollow += 1;
      }
    }
  }
  if (hollow === 0) return;
  solved.set(known);

  // Jacobi relaxation: each hollow pixel becomes the mean of its four
  // neighbours, and pixels outside the disc simply do not vote. The disc's rim
  // therefore keeps the rim's own colour, so no backdrop can creep inwards.
  const nextBuffer = new Float32Array(solved.length);
  const neighbourAverage = (cell: number, channel: number, from: Float32Array): number => {
    const x = (cell % span) + left;
    const y = Math.floor(cell / span) + top;
    let total = 0;
    let count = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < left || ny < top || nx > right || ny > bottom) continue;
      if (!inDisc(nx, ny)) continue;
      const neighbour = (ny - top) * span + (nx - left);
      total += from[neighbour * 4 + channel] ?? 0;
      count += 1;
    }
    return count === 0 ? (from[cell * 4 + channel] ?? 0) : total / count;
  };
  for (let pass = 0; pass < 256; pass += 1) {
    nextBuffer.set(solved);
    for (let cell = 0; cell < blank.length; cell += 1) {
      if (blank[cell] !== 1) continue;
      for (let channel = 0; channel < 3; channel += 1) {
        nextBuffer[cell * 4 + channel] = neighbourAverage(cell, channel, solved);
      }
    }
    solved.set(nextBuffer);
  }

  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      if (!inDisc(x, y)) continue;
      const cell = (y - top) * span + (x - left);
      if (blank[cell] !== 1) continue;
      const target = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) data[target + channel] = Math.round(solved[cell * 4 + channel] ?? 0);
      data[target + 3] = 255;
    }
  }
}

/**
 * Cuts a ball-and-socket joint.
 *
 * A disc centred on the pivot is the only boundary a rotation cannot change:
 * the circle maps onto itself at every angle. So the parent is cut back to that
 * circle (a socket) and the child is handed the same circle of pixels (a ball).
 * At any angle the ball fills the socket exactly, which means no wedge can open,
 * no straight edge can slide past its neighbour, and the silhouette is fixed.
 *
 * The child is expected to be drawn after the parent. Pass `child: null` to
 * round the parent's end without a ball, for a joint hidden under clothing.
 */
export function cutJoint(
  image: OpaqueImage,
  regions: readonly Uint8Array[],
  link: JointLink,
  joint: JointCircle,
): void {
  const { width, height } = image;
  const parent = regions[link.parent];
  if (parent === undefined) throw new Error("joint has no parent region");
  const child = link.child === null ? undefined : regions[link.child];
  if (link.child !== null && child === undefined) throw new Error("joint has no child region");

  const [cx, cy] = joint.pivot;
  const ball = { pivot: joint.pivot, radius: joint.radius + BALL_OVERHANG };
  if (child !== undefined) fillBall(image, ball);
  const reach = ball.radius;
  for (let y = Math.max(0, Math.floor(cy - reach)); y <= Math.min(height - 1, Math.ceil(cy + reach)); y += 1) {
    for (let x = Math.max(0, Math.floor(cx - reach)); x <= Math.min(width - 1, Math.ceil(cx + reach)); x += 1) {
      const distance = Math.hypot(x - cx, y - cy);
      const index = y * width + x;
      if (distance <= joint.radius) parent[index] = 0;
      if (child !== undefined && distance <= reach) child[index] = 1;
    }
  }
}

/**
 * Restores the ball's rim to full opacity after the crop has been feathered.
 *
 * Feathering softens every edge that borders transparency, and a ball's rim is
 * one of them, so the parent's socket shows through as a hairline. Re-sealing
 * the disc once the crop exists is what makes the joint disappear at rest.
 */
export function sealBall(part: BallPart, ball: JointCircle): void {
  const { width, height, pixels } = part;
  const [cx, cy] = ball.pivot;
  const radius = ball.radius;
  for (let y = Math.max(0, Math.floor(cy - radius)); y <= Math.min(height - 1, Math.ceil(cy + radius)); y += 1) {
    for (let x = Math.max(0, Math.floor(cx - radius)); x <= Math.min(width - 1, Math.ceil(cx + radius)); x += 1) {
      if (Math.hypot(x - cx, y - cy) > radius) continue;
      pixels[(y * width + x) * 4 + 3] = 255;
    }
  }
}

/**
 * How much background is still visible inside a joint's disc, in plate pixels.
 * Zero means the seam is closed: the ball covers the socket at that rotation.
 * Used by `tools/check-joints.ts` as the acceptance measure for a joint.
 */
export function seamGap(
  ctx: { getImageData(x: number, y: number, w: number, h: number): { data: Uint8ClampedArray } },
  joint: JointCircle,
  options: { readonly scale: number; readonly originX: number; readonly originY: number },
): number {
  const [cx, cy] = joint.pivot;
  const r = joint.radius * options.scale;
  const sx = options.originX + cx * options.scale;
  const sy = options.originY + cy * options.scale;
  const left = Math.max(0, Math.floor(sx - r));
  const top = Math.max(0, Math.floor(sy - r));
  const size = Math.ceil(r * 2) + 2;
  const { data } = ctx.getImageData(left, top, size, size);
  let gap = 0;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (Math.hypot(left + x - sx, top + y - sy) > r) continue;
      if ((data[(y * size + x) * 4 + 3] ?? 0) < 16) gap += 1;
    }
  }
  return gap;
}

/** True when every pixel of a joint's disc is opaque in the rendered frame. */
export const isSealed = (gap: number): boolean => gap === 0;

export const discMask = (joint: JointCircle, width: number, height: number): Uint8Array => {
  const mask = new Uint8Array(width * height);
  const [cx, cy] = joint.pivot;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!inside(x, y, width, height)) continue;
      if (Math.hypot(x - cx, y - cy) <= joint.radius) mask[y * width + x] = 1;
    }
  }
  return mask;
};
