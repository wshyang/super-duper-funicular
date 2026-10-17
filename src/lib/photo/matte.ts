import type { KeyedImage } from "./chroma.ts";
import { isSkin, type PartMatte } from "./cut.ts";

/**
 * Colour mattes as a hard invariant of the cut.
 *
 * Flood fences keep a matted part on one colour family while it is being
 * filled, but neighbours' growth and unowned leftovers can still push a
 * strap's fabric into a skin part or a socket's skin into a fabric part. These
 * helpers make the invariant total: a patch plate contributes only the pixels
 * its target part may legally carry, and every matted region is purged of
 * colour it is not allowed to own.
 */

/** True where the pixel's colour class contradicts the part's matte. */
export function matteRejects(data: Uint8ClampedArray, index: number, matte: PartMatte): boolean {
  const offset = index * 4;
  const skin = isSkin(data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0);
  return skin === (matte === "fabric");
}

/** Drops every pixel a fabric part may not carry. Pure. */
export function fabricOnly(image: KeyedImage): KeyedImage {
  const data = new Uint8ClampedArray(image.data);
  const alpha = new Float32Array(image.alpha);
  for (let index = 0; index < alpha.length; index += 1) {
    if (!matteRejects(image.data, index, "fabric")) continue;
    alpha[index] = 0;
    data[index * 4 + 3] = 0;
  }
  return { width: image.width, height: image.height, data, alpha };
}

/** Purges every matted region of pixels its matte rejects. */
export function purgeMatte(
  image: KeyedImage,
  regions: Uint8Array[],
  mattes: readonly (PartMatte | undefined)[],
): void {
  mattes.forEach((matte, part) => {
    const region = regions[part];
    if (matte === undefined || region === undefined) return;
    for (let index = 0; index < region.length; index += 1) {
      if (region[index] === 1 && matteRejects(image.data, index, matte)) region[index] = 0;
    }
  });
}

/** How leftover pixels may be re-homed: which parts accept which colour. */
export interface RefillPlan {
  readonly mattes: readonly (PartMatte | undefined)[];
  /** Optional fence mask: 0 means never assign. */
  readonly blocked?: Uint8Array;
}

/**
 * Re-homes pixels the purge orphaned. Ownership spreads like the original
 * unassigned fill — through any opaque pixel — but a region may only ever
 * receive a pixel its own matte accepts, so an armhole's skin island lands on
 * the skin part and the fabric part keeps its invariant.
 */
export function refillMatted(image: KeyedImage, regions: Uint8Array[], plan: RefillPlan): void {
  const { width, height, alpha, data } = image;
  const owner = new Int16Array(width * height).fill(-1);
  const queue: number[] = [];
  regions.forEach((region, part) => {
    for (let index = 0; index < region.length; index += 1) {
      if (region[index] === 1 && owner[index] === -1) {
        owner[index] = part;
        queue.push(index);
      }
    }
  });
  for (let head = 0; head < queue.length; head += 1) {
    const index = queue[head] as number;
    const part = owner[index] as number;
    const x = index % width;
    const y = (index - x) / width;
    for (const [nx, ny] of [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ] as const) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const next = ny * width + nx;
      if (owner[next] !== -1 || (alpha[next] ?? 0) < 0.5) continue;
      if (plan.blocked !== undefined && plan.blocked[next] === 0) continue;
      const matte = plan.mattes[part];
      if (matte !== undefined && matteRejects(data, next, matte)) continue;
      owner[next] = part;
      regions[part]![next] = 1;
      queue.push(next);
    }
  }
}
