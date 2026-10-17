import type { Vec2 } from "../geometry/vec.ts";
import type { KeyedImage } from "./chroma.ts";

export type PhotoPartId =
  | "head"
  | "neck"
  | "torso"
  | "upperArm"
  | "forearm"
  | "thigh"
  | "shin"
  | "shoe"
  | "shoeToe";

export interface Segment {
  readonly from: readonly [number, number];
  readonly to: readonly [number, number];
}

export interface PartCutSpec {
  readonly id: PhotoPartId;
  /** A pixel that is certainly inside this part in the neutral plate. */
  readonly seed: readonly [number, number];
  /** How far the mask may grow into already-opaque pixels, in plate pixels. */
  readonly extension: number;
  /** Regions to remove after segmentation (e.g. the far shoe behind the near). */
  readonly erase?: readonly (readonly (readonly [number, number])[])[];
}

export interface CutPart {
  readonly id: PhotoPartId;
  /** Top-left of the crop in plate pixels. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8ClampedArray;
}

const inside = (x: number, y: number, width: number, height: number): boolean =>
  x >= 0 && y >= 0 && x < width && y < height;

/** Rasterises the cut lines into a blocking grid two pixels thick. */
export function rasteriseBarriers(
  width: number,
  height: number,
  segments: readonly Segment[],
): Uint8Array {
  const blocked = new Uint8Array(width * height);
  for (const segment of segments) {
    const [x0, y0] = segment.from;
    const [x1, y1] = segment.to;
    const steps = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0)) * 2);
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      const x = Math.round(x0 + (x1 - x0) * t);
      const y = Math.round(y0 + (y1 - y0) * t);
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (!inside(x + dx, y + dy, width, height)) continue;
          blocked[(y + dy) * width + x + dx] = 1;
        }
      }
    }
  }
  return blocked;
}

/** Four-connected flood fill over opaque, unblocked pixels. */
export function floodRegion(
  image: KeyedImage,
  blocked: Uint8Array,
  seed: readonly [number, number],
): Uint8Array {
  const { width, height, alpha } = image;
  const region = new Uint8Array(width * height);
  const queue: number[] = [];
  const start = seed[1] * width + seed[0];
  if ((alpha[start] ?? 0) < 0.5) throw new Error(`seed ${seed.join(",")} is not on the subject`);
  region[start] = 1;
  queue.push(start);
  for (let head = 0; head < queue.length; head += 1) {
    const index = queue[head] as number;
    const x = index % width;
    const y = (index - x) / width;
    const neighbours = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ] as const;
    for (const [nx, ny] of neighbours) {
      if (!inside(nx, ny, width, height)) continue;
      const next = ny * width + nx;
      if (region[next] === 1 || blocked[next] === 1) continue;
      if ((alpha[next] ?? 0) < 0.5) continue;
      region[next] = 1;
      queue.push(next);
    }
  }
  return region;
}

/** Grows a region into neighbouring opaque pixels, up to `passes` pixels out. */
export function extendRegion(image: KeyedImage, region: Uint8Array, passes: number): Uint8Array {
  const { width, height, alpha } = image;
  let current = region;
  for (let pass = 0; pass < passes; pass += 1) {
    const next = new Uint8Array(current);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        if (current[index] === 1) continue;
        if ((alpha[index] ?? 0) < 0.5) continue;
        let touches = false;
        for (let dy = -1; dy <= 1 && !touches; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (!inside(x + dx, y + dy, width, height)) continue;
            if (current[(y + dy) * width + x + dx] === 1) {
              touches = true;
              break;
            }
          }
        }
        if (touches) next[index] = 1;
      }
    }
    current = next;
  }
  return current;
}

/**
 * Assigns every still-unclaimed opaque pixel to the nearest claimed region.
 * Cut lines a few pixels thick, and any sliver the barriers isolate, would
 * otherwise punch transparent holes straight through a texture.
 */
export function fillUnassigned(
  image: KeyedImage,
  regions: readonly Uint8Array[],
  blocked?: Uint8Array,
): void {
  const { width, height, alpha } = image;
  const owner = new Int16Array(width * height).fill(-1);
  const queue: number[] = [];
  regions.forEach((region, partIndex) => {
    for (let index = 0; index < region.length; index += 1) {
      if (region[index] === 1 && owner[index] === -1) {
        owner[index] = partIndex;
        queue.push(index);
      }
    }
  });
  for (let head = 0; head < queue.length; head += 1) {
    const index = queue[head] as number;
    const x = index % width;
    const y = (index - x) / width;
    const neighbours = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ] as const;
    for (const [nx, ny] of neighbours) {
      if (!inside(nx, ny, width, height)) continue;
      const next = ny * width + nx;
      if (owner[next] !== -1) continue;
      if ((alpha[next] ?? 0) < 0.5) continue;
      if (blocked !== undefined && blocked[next] === 0) continue;
      owner[next] = owner[index] as number;
      regions[owner[index] as number]![next] = 1;
      queue.push(next);
    }
  }
}

/** Removes a polygon from a region with an even-odd point-in-polygon test. */
export function erasePolygon(region: Uint8Array, width: number, points: readonly (readonly [number, number])[]): void {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  for (let y = Math.max(0, Math.floor(minY)); y <= Math.ceil(maxY); y += 1) {
    for (let x = Math.max(0, Math.floor(minX)); x <= Math.ceil(maxX); x += 1) {
      if (pointInPolygon(x + 0.5, y + 0.5, points)) region[y * width + x] = 0;
    }
  }
}

export function pointInPolygon(x: number, y: number, points: readonly (readonly [number, number])[]): boolean {
  let insidePolygon = false;
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
    const [xi, yi] = points[index] as readonly [number, number];
    const [xj, yj] = points[previous] as readonly [number, number];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) insidePolygon = !insidePolygon;
  }
  return insidePolygon;
}

/**
 * Cuts one part: crop to the region's bounds (plus a pixel of margin), copy the
 * keyed RGBA, and carry colour into transparent pixels so canvas filtering
 * cannot pull green in from outside the silhouette.
 */
export function cutPart(image: KeyedImage, region: Uint8Array, id: PhotoPartId): CutPart {
  const { width, height, data } = image;
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (region[y * width + x] === 0) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error(`empty region for ${id}`);
  const left = Math.max(0, minX - 1);
  const top = Math.max(0, minY - 1);
  const right = Math.min(width - 1, maxX + 1);
  const bottom = Math.min(height - 1, maxY + 1);
  const cropWidth = right - left + 1;
  const cropHeight = bottom - top + 1;
  const pixels = new Uint8ClampedArray(cropWidth * cropHeight * 4);
  for (let y = 0; y < cropHeight; y += 1) {
    for (let x = 0; x < cropWidth; x += 1) {
      const source = (y + top) * width + (x + left);
      const target = (y * cropWidth + x) * 4;
      if (region[source] === 0) continue;
      const offset = source * 4;
      pixels[target] = data[offset] ?? 0;
      pixels[target + 1] = data[offset + 1] ?? 0;
      pixels[target + 2] = data[offset + 2] ?? 0;
      pixels[target + 3] = data[offset + 3] ?? 0;
    }
  }
  featherSilhouette(pixels, cropWidth, cropHeight);
  return { id, x: left, y: top, width: cropWidth, height: cropHeight, pixels };
}

/**
 * Softens the outermost ring of alpha a little. Cut-outs arrive with a binary
 * matte from the key, which paints a stair-stepped edge at display size; one
 * gentle step of falloff reads as a photographed edge instead.
 */
function featherSilhouette(pixels: Uint8ClampedArray, width: number, height: number): void {
  const alphaAt = (x: number, y: number): number => pixels[(y * width + x) * 4 + 3] ?? 0;
  const edge: number[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (alphaAt(x, y) === 0) continue;
      const open =
        (x === 0 || alphaAt(x - 1, y) === 0) ||
        (x === width - 1 || alphaAt(x + 1, y) === 0) ||
        (y === 0 || alphaAt(x, y - 1) === 0) ||
        (y === height - 1 || alphaAt(x, y + 1) === 0);
      if (open) edge.push((y * width + x) * 4 + 3);
    }
  }
  for (const index of edge) {
    const value = pixels[index] ?? 0;
    pixels[index] = Math.round(value * 0.62);
  }
}

/**
 * Grows every region by `passes` pixels into any opaque neighbour, regardless
 * of which part already owns it. Neighbouring parts then share a one- or
 * two-pixel band, so a hard cut edge never shows as a dotted seam where two
 * textures abut: whichever part is drawn last simply covers the join.
 */
export function growRegions(
  image: KeyedImage,
  regions: readonly Uint8Array[],
  passes: number,
  blocked?: Uint8Array,
): void {
  const { width, height, alpha } = image;
  for (let pass = 0; pass < passes; pass += 1) {
    const additions = regions.map((region) => {
      const extra: number[] = [];
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const index = y * width + x;
          if (region[index] === 1) continue;
          if ((alpha[index] ?? 0) < 0.5) continue;
          if (blocked !== undefined && blocked[index] === 0) continue;
          if (!hasNeighbour(region, width, height, x, y)) continue;
          extra.push(index);
        }
      }
      return extra;
    });
    additions.forEach((extra, partIndex) => {
      const region = regions[partIndex] as Uint8Array;
      for (const index of extra) region[index] = 1;
    });
  }
}

const hasNeighbour = (region: Uint8Array, width: number, height: number, x: number, y: number): boolean => {
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      if (!inside(x + dx, y + dy, width, height)) continue;
      if (region[(y + dy) * width + x + dx] === 1) return true;
    }
  }
  return false;
};

/** Darkens and cools a part for the far side, as the vector palette does. */
export function tintFar(part: CutPart, factor = 0.88): CutPart {
  const pixels = new Uint8ClampedArray(part.pixels);
  for (let index = 0; index < pixels.length; index += 4) {
    if ((pixels[index + 3] ?? 0) === 0) continue;
    for (let channel = 0; channel < 3; channel += 1) {
      const value = pixels[index + channel] ?? 0;
      const cooled = channel === 2 ? 6 : 0;
      pixels[index + channel] = Math.round(Math.min(255, value * factor + cooled));
    }
  }
  return { ...part, pixels };
}

/** Widest opaque run in any single row, in pixels. */
export function widestRow(part: CutPart): number {
  let widest = 0;
  for (let y = 0; y < part.height; y += 1) {
    let run = 0;
    for (let x = 0; x < part.width; x += 1) {
      const opaque = (part.pixels[(y * part.width + x) * 4 + 3] ?? 0) > 128;
      run = opaque ? run + 1 : 0;
      if (run > widest) widest = run;
    }
  }
  return widest;
}

/** Tallest opaque run in any single column, in pixels. */
export function tallestColumn(part: CutPart): number {
  let tallest = 0;
  for (let x = 0; x < part.width; x += 1) {
    let run = 0;
    for (let y = 0; y < part.height; y += 1) {
      const opaque = (part.pixels[(y * part.width + x) * 4 + 3] ?? 0) > 128;
      run = opaque ? run + 1 : 0;
      if (run > tallest) tallest = run;
    }
  }
  return tallest;
}

/**
 * Removes everything below `limitY` (a row in the part's own pixels). Foot
 * textures from a different shoot can extend past the sole the solver grounds
 * on; left alone, that surplus swings through the floor on every heel peel.
 */
export function clipBelow(part: CutPart, limitY: number): CutPart {
  const limit = Math.max(0, Math.round(limitY));
  if (limit >= part.height) return part;
  const pixels = new Uint8ClampedArray(part.pixels);
  for (let y = limit; y < part.height; y += 1) {
    for (let x = 0; x < part.width; x += 1) pixels[(y * part.width + x) * 4 + 3] = 0;
  }
  return { ...part, pixels, height: Math.max(1, limit) };
}

export const pivotOf = (part: CutPart, pivot: Vec2): Vec2 => ({ x: pivot.x - part.x, y: pivot.y - part.y });
