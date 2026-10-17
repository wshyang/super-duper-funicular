import type { RgbaImage } from "./decode.ts";
import type { LabelResult } from "./components.ts";
import type { SheetCell } from "./sheet.ts";
import type { SheetLayout } from "./sheet.ts";
import { isKeyBlend, magentaScore } from "./keying.ts";

export interface SpriteMetrics {
  readonly width: number;
  readonly height: number;
  readonly area: number;
  /** Lowest opaque pixel inside the sprite crop: the ground contact candidate. */
  readonly footContactY: number;
  readonly pelvisX: number;
  readonly pelvisY: number;
  readonly anchorX: number;
  readonly anchorY: number;
}

export interface CutSprite {
  readonly rgba: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
  readonly metrics: SpriteMetrics;
}

const PNG_MAGIC_SIGNATURE = 137;
void PNG_MAGIC_SIGNATURE;

/**
 * Cuts one figure out of its cell. The figure's own connected blob defines the
 * mask, and the soft chroma key defines the edge: no other artwork, no stray
 * magenta pocket, no pink halo. Colour is decontaminated so the sprite sits on
 * any background without a fringe.
 */
export function cutCell(image: RgbaImage, cell: SheetCell, labels: LabelResult): CutSprite {
  const width = cell.maxX - cell.minX + 1;
  const height = cell.maxY - cell.minY + 1;
  const isFigure = new Uint8Array(width * height);
  const memberIds = new Set(cell.componentIds);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const label = labels.labels[(cell.minY + y) * image.width + (cell.minX + x)] ?? 0;
      if (memberIds.has(label)) isFigure[y * width + x] = 1;
    }
  }
  const source = cropRgba(image, cell.minX, cell.minY, width, height);
  const cleaned = decontaminate(source, isFigure, width, height);
  const rgba = new Uint8ClampedArray(width * height * 4);
  const reachable = floodAlpha(cleaned, width, height, isFigure);
  for (let index = 0; index < width * height; index += 1) {
    if (reachable[index] === 0) continue;
    const offset = index * 4;
    rgba[offset] = cleaned[offset] ?? 0;
    rgba[offset + 1] = cleaned[offset + 1] ?? 0;
    rgba[offset + 2] = cleaned[offset + 2] ?? 0;
    rgba[offset + 3] = cleaned[offset + 3] ?? 0;
  }
  const metrics = measureSprite(rgba, width, height);
  return { rgba, width, height, metrics };
}

const KEY = { r: 253, g: 74, b: 253 };

/**
 * Removes the magenta halo properly. JPEG blends each edge pixel with the key
 * colour, so its RGB is a mixture of art and magenta and cannot be keyed by
 * hue alone. For each edge pixel we take the nearest fully solid art pixel as
 * the true colour, then project the blended pixel onto the art-to-key line to
 * recover how much of it was ink. The output colour is the art colour and the
 * alpha is the recovered coverage, which is what an anti-aliased cut-out needs.
 */
function decontaminate(source: Uint8ClampedArray, isFigure: Uint8Array, width: number, height: number): Uint8ClampedArray {
  const output = new Uint8ClampedArray(width * height * 4);
  const interior = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (isFigure[index] !== 1) continue;
      const offset = index * 4;
      // "Solid" means the pixel carries no key colour at all. Judging by colour
      // rather than by neighbourhood keeps two-pixel outlines intact.
      const blended = isKeyBlend(source[offset] ?? 0, source[offset + 1] ?? 0, source[offset + 2] ?? 0);
      interior[index] = blended ? 0 : 1;
    }
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const offset = index * 4;
      if (isFigure[index] !== 1) continue;
      if (interior[index] === 1) {
        output[offset] = source[offset] ?? 0;
        output[offset + 1] = source[offset + 1] ?? 0;
        output[offset + 2] = source[offset + 2] ?? 0;
        output[offset + 3] = 255;
        continue;
      }
      const anchor = nearestInterior(source, interior, x, y, width, height);
      if (anchor === null) {
        // No solid art nearby: the pixel is a pure background sliver.
        continue;
      }
      const coverage = estimateCoverage(
        { r: source[offset] ?? 0, g: source[offset + 1] ?? 0, b: source[offset + 2] ?? 0 },
        anchor,
      );
      if (coverage < 0.06) continue;
      output[offset] = anchor.r;
      output[offset + 1] = anchor.g;
      output[offset + 2] = anchor.b;
      output[offset + 3] = Math.round(coverage * 255);
    }
  }
  return output;
}

interface RgbSample {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

function nearestInterior(
  source: Uint8ClampedArray,
  interior: Uint8Array,
  x: number,
  y: number,
  width: number,
  height: number,
  maxRadius = 6,
): RgbSample | null {
  for (let radius = 1; radius <= maxRadius; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (interior[ny * width + nx] !== 1) continue;
        const offset = (ny * width + nx) * 4;
        return { r: source[offset] ?? 0, g: source[offset + 1] ?? 0, b: source[offset + 2] ?? 0 };
      }
    }
  }
  return null;
}

/** Coverage `a` in `pixel = a * art + (1 - a) * key`, by projection onto that line. */
export function estimateCoverage(pixel: RgbSample, art: RgbSample): number {
  const vx = art.r - KEY.r;
  const vy = art.g - KEY.g;
  const vz = art.b - KEY.b;
  const px = pixel.r - KEY.r;
  const py = pixel.g - KEY.g;
  const pz = pixel.b - KEY.b;
  const denominator = vx * vx + vy * vy + vz * vz;
  if (denominator < 1e-6) return 1;
  const alpha = (px * vx + py * vy + pz * vz) / denominator;
  return Math.min(1, Math.max(0, alpha));
}

function cropRgba(image: RgbaImage, x: number, y: number, width: number, height: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row += 1) {
    const start = ((y + row) * image.width + x) * 4;
    data.set(image.data.subarray(start, start + width * 4), row * width * 4);
  }
  return data;
}

/**
 * Keeps the anti-aliased edge (alpha > 0.15) that is connected to the figure
 * mask, and drops everything else. This is why a magenta pocket between the arm
 * and the torso disappears while the outline stays smooth.
 */
function floodAlpha(rgba: Uint8ClampedArray, width: number, height: number, isFigure: Uint8Array): Uint8Array {
  const reachable = new Uint8Array(width * height);
  const queue: number[] = [];
  for (let index = 0; index < width * height; index += 1) {
    if (isFigure[index] === 1) {
      reachable[index] = 1;
      queue.push(index);
    }
  }
  while (queue.length > 0) {
    const current = queue.pop() as number;
    const y = Math.floor(current / width);
    const x = current - y * width;
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const neighbour = ny * width + nx;
        if (reachable[neighbour] === 1) continue;
        if ((rgba[neighbour * 4 + 3] ?? 0) < 40) continue;
        reachable[neighbour] = 1;
        queue.push(neighbour);
      }
    }
  }
  return reachable;
}

const isShortsNavy = (red: number, green: number, blue: number): boolean =>
  red < 96 && green < 108 && blue > 44 && blue < 150 && blue > red + 12 && green < blue + 12;

/** Pelvis is the centroid of the shorts, a colour no other part uses. */
function findPelvis(rgba: Uint8ClampedArray, width: number, height: number): { x: number; y: number } {
  let count = 0;
  let sumX = 0;
  let sumY = 0;
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    if ((rgba[offset + 3] ?? 0) < 128) continue;
    if (!isShortsNavy(rgba[offset] ?? 0, rgba[offset + 1] ?? 0, rgba[offset + 2] ?? 0)) continue;
    count += 1;
    sumX += index % width;
    sumY += Math.floor(index / width);
  }
  if (count === 0) return { x: width / 2, y: height / 2 };
  return { x: sumX / count, y: sumY / count };
}

export function measureSprite(rgba: Uint8ClampedArray, width: number, height: number): SpriteMetrics {
  let area = 0;
  let minY = height;
  let maxY = -1;
  let sumX = 0;
  let sumY = 0;
  for (let index = 0; index < width * height; index += 1) {
    if ((rgba[index * 4 + 3] ?? 0) < 16) continue;
    area += 1;
    const y = Math.floor(index / width);
    const x = index - y * width;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    sumX += x;
    sumY += y;
  }
  const pelvis = findPelvis(rgba, width, height);
  return {
    width,
    height,
    area,
    footContactY: maxY,
    pelvisX: pelvis.x,
    pelvisY: pelvis.y,
    anchorX: area === 0 ? width / 2 : sumX / area,
    anchorY: area === 0 ? height / 2 : sumY / area,
  };
}

/** Count of opaque, strongly magenta pixels; must be zero for a clean cut-out. */
export function magentaLeak(rgba: Uint8ClampedArray): number {
  let count = 0;
  for (let index = 0; index < rgba.length; index += 4) {
    if ((rgba[index + 3] ?? 0) < 32) continue;
    if (isKeyBlend(rgba[index] ?? 0, rgba[index + 1] ?? 0, rgba[index + 2] ?? 0)) count += 1;
  }
  return count;
}

export interface RegisteredSprite {
  readonly rgba: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

/**
 * Places every sprite on one canvas using its pelvis as the pivot. Horizontal
 * drift disappears, and the vertical bounce stays in the legs where a run loop
 * needs it. Translation only: the art is never rescaled.
 */
export function registerSprites(sprites: readonly CutSprite[], margin = 6): {
  readonly width: number;
  readonly height: number;
  readonly frames: readonly RegisteredSprite[];
} {
  const maxWidth = Math.max(...sprites.map((sprite) => sprite.width)) + margin * 2;
  const maxHeight = Math.max(...sprites.map((sprite) => sprite.height)) + margin * 2;
  const pivotX = maxWidth / 2;
  const pivotY = maxHeight * 0.42;
  const frames = sprites.map((sprite) => {
    const offsetX = Math.round(pivotX - sprite.metrics.pelvisX);
    const offsetY = Math.round(pivotY - sprite.metrics.pelvisY);
    const rgba = new Uint8ClampedArray(maxWidth * maxHeight * 4);
    for (let y = 0; y < sprite.height; y += 1) {
      const targetY = y + offsetY;
      if (targetY < 0 || targetY >= maxHeight) continue;
      for (let x = 0; x < sprite.width; x += 1) {
        const targetX = x + offsetX;
        if (targetX < 0 || targetX >= maxWidth) continue;
        const source = (y * sprite.width + x) * 4;
        if ((sprite.rgba[source + 3] ?? 0) === 0) continue;
        const target = (targetY * maxWidth + targetX) * 4;
        rgba[target] = sprite.rgba[source] ?? 0;
        rgba[target + 1] = sprite.rgba[source + 1] ?? 0;
        rgba[target + 2] = sprite.rgba[source + 2] ?? 0;
        rgba[target + 3] = sprite.rgba[source + 3] ?? 0;
      }
    }
    return { rgba, width: maxWidth, height: maxHeight, offsetX, offsetY };
  });
  return { width: maxWidth, height: maxHeight, frames };
}

/**
 * Silhouette occupancy on a 16x16 grid, normalised to the sprite's own box.
 * Returned as a 0/1 vector so two poses can be compared with a plain mean
 * absolute difference, independently of how big the sprite is.
 */
export function poseSignatureVector(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  grid = 16,
): number[] {
  const cells = new Array<number>(grid * grid).fill(0);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let index = 0; index < width * height; index += 1) {
    if ((rgba[index * 4 + 3] ?? 0) < 16) continue;
    const y = Math.floor(index / width);
    const x = index - y * width;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  if (maxX < 0) return new Array<number>(grid * grid).fill(0);
  const spanX = Math.max(1, maxX - minX + 1);
  const spanY = Math.max(1, maxY - minY + 1);
  for (let index = 0; index < width * height; index += 1) {
    if ((rgba[index * 4 + 3] ?? 0) < 16) continue;
    const y = Math.floor(index / width);
    const x = index - y * width;
    const gx = Math.min(grid - 1, Math.floor(((x - minX) / spanX) * grid));
    const gy = Math.min(grid - 1, Math.floor(((y - minY) / spanY) * grid));
    cells[gy * grid + gx] = (cells[gy * grid + gx] ?? 0) + 1;
  }
  const threshold = Math.max(1, Math.round(((spanX * spanY) / (grid * grid)) * 0.06));
  return cells.map((count) => (count >= threshold ? 1 : 0));
}

/** Compact text form of a pose vector, for the JSON manifest. */
export const encodeSignature = (vector: readonly number[]): string => vector.join("");

/** Mean absolute difference between two pose vectors: 0 identical, 1 opposite. */
export function signatureDistance(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length || a.length === 0) return 1;
  let total = 0;
  for (let index = 0; index < a.length; index += 1) total += Math.abs((a[index] ?? 0) - (b[index] ?? 0));
  return total / a.length;
}
