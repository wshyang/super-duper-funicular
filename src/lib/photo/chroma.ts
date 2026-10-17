import type { RgbaImage } from "../pipeline/decode.ts";

/**
 * Chroma key for a photographic green screen. A studio backdrop is never one
 * colour - it falls off towards the edges - so the key is a *green dominance*
 * score, `(g - max(r, b)) / 255`, which is scale-invariant: a bright and a dark
 * patch of the same backdrop score the same. Skin, red kit and navy shorts all
 * score at or below zero, so nothing on the subject can key itself out.
 */
export interface KeyedImage {
  readonly width: number;
  readonly height: number;
  /** Straight-alpha RGBA with despilled edges. */
  readonly data: Uint8ClampedArray;
  /** 0..1 per pixel: 1 = subject, 0 = backdrop. */
  readonly alpha: Float32Array;
}

const SOFT_LOW = 0.02;
const SOFT_HIGH = 0.09;

const clamp01 = (value: number): number => (value < 0 ? 0 : value > 1 ? 1 : value);

/** Green dominance of one pixel, in -1..1. Backdrop is around +0.3. */
export const greenScore = (red: number, green: number, blue: number): number =>
  (green - Math.max(red, blue)) / 255;

/**
 * Recovers opacity by inverting `pixel = art * a + backdrop * (1 - a)` along the
 * green axis: the subject's own green can only be as high as the backdrop's, so
 * the residual dominance is proportional to the leftover backdrop. Then the
 * classic despill (`g = min(g, max(r, b))`) removes the fringe colour that the
 * alpha alone would leave on hair and fabric edges.
 */
export function greenKey(image: RgbaImage): KeyedImage {
  const { width, height, data } = image;
  const alpha = new Float32Array(width * height);
  const output = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    const red = data[offset] ?? 0;
    const green = data[offset + 1] ?? 0;
    const blue = data[offset + 2] ?? 0;
    const score = greenScore(red, green, blue);
    const coverage = clamp01((SOFT_HIGH - score) / (SOFT_HIGH - SOFT_LOW));
    alpha[index] = coverage;
    // Clamp green to the strongest of the other channels everywhere, not only
    // on soft edges: a dark patch of backdrop keys as fully opaque yet still
    // carries a green cast, and that sort of pixel becomes the silhouette's
    // fringe as soon as anything interpolates from it.
    const despilled = Math.min(green, Math.max(red, blue));
    output[offset] = red;
    output[offset + 1] = despilled;
    output[offset + 2] = blue;
    output[offset + 3] = Math.round(coverage * 255);
  }
  return { width, height, data: output, alpha };
}

/** Tight bounds of every pixel with meaningful coverage. */
export function alphaBounds(image: KeyedImage, minimum = 0.5): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = image.width;
  let maxX = -1;
  let minY = image.height;
  let maxY = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if ((image.alpha[y * image.width + x] ?? 0) < minimum) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, maxX, minY, maxY };
}

/** Nearest colour carried into transparent pixels, so filtering cannot bleed green. */
export function bleedAlpha(image: KeyedImage, passes = 2): void {
  const { width, height, data, alpha } = image;
  for (let pass = 0; pass < passes; pass += 1) {
    const next = new Uint8ClampedArray(data);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        if ((alpha[index] ?? 0) > 0.02) continue;
        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const neighbour = ny * width + nx;
            if ((alpha[neighbour] ?? 0) <= 0.02) continue;
            const offset = neighbour * 4;
            r += next[offset] ?? 0;
            g += next[offset + 1] ?? 0;
            b += next[offset + 2] ?? 0;
            count += 1;
          }
        }
        if (count === 0) continue;
        const offset = index * 4;
        next[offset] = Math.round(r / count);
        next[offset + 1] = Math.round(g / count);
        next[offset + 2] = Math.round(b / count);
      }
    }
    data.set(next);
  }
}
