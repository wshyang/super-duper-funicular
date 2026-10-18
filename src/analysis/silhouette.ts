import { pixelIndex } from '../core/raster.js';
import type { Point2D, RasterImage, Rect } from '../core/types.js';
import type { Rgb } from '../profile/master-profile.js';
import { isChromaPixel } from './chroma.js';

export interface SilhouetteStats {
  readonly area: number;
  readonly bounds: Rect | null;
  readonly centroid: Point2D;
}

export function silhouetteStats(image: RasterImage, alphaThreshold = 16): SilhouetteStats {
  let area = 0;
  let sumX = 0;
  let sumY = 0;
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if ((image.data[pixelIndex(image, x, y) + 3] ?? 0) <= alphaThreshold) continue;
      area++;
      sumX += x;
      sumY += y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return {
    area,
    bounds: maxX < 0 ? null : { minX, minY, maxX, maxY },
    centroid: area === 0 ? { x: 0, y: 0 } : { x: sumX / area, y: sumY / area },
  };
}

/** Intersection-over-union of two alpha silhouettes, ignoring sub-threshold alpha. */
export function silhouetteIou(a: RasterImage, b: RasterImage, alphaThreshold = 16): number {
  let intersection = 0;
  let union = 0;
  const width = Math.min(a.width, b.width);
  const height = Math.min(a.height, b.height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inA = (a.data[pixelIndex(a, x, y) + 3] ?? 0) > alphaThreshold;
      const inB = (b.data[pixelIndex(b, x, y) + 3] ?? 0) > alphaThreshold;
      if (inA && inB) intersection++;
      if (inA || inB) union++;
    }
  }
  return union === 0 ? 1 : intersection / union;
}

/** IoU restricted to a horizontal band; used to score limbs separately from the trunk. */
export function bandIou(a: RasterImage, b: RasterImage, minY: number, maxY: number): number {
  const width = Math.min(a.width, b.width);
  const height = Math.min(a.height, b.height);
  const top = Math.max(0, Math.floor(minY));
  const bottom = Math.min(height - 1, Math.ceil(maxY));
  let intersection = 0;
  let union = 0;
  for (let y = top; y <= bottom; y++) {
    for (let x = 0; x < width; x++) {
      const inA = (a.data[pixelIndex(a, x, y) + 3] ?? 0) > 16;
      const inB = (b.data[pixelIndex(b, x, y) + 3] ?? 0) > 16;
      if (inA && inB) intersection++;
      if (inA || inB) union++;
    }
  }
  return union === 0 ? 1 : intersection / union;
}

/** Counts opaque connected components, optionally ignoring those smaller than `minArea`. */
/**
 * Detached fragments: opaque components other than the largest one. The body is
 * one connected surface by construction — the two layers overlap at every joint
 * — so any second component is a defect, and the count is directly comparable
 * to a threshold of zero. Counting *all* components (the previous definition)
 * makes zero unreachable: every healthy frame has exactly one.
 */
export function countOpaqueIslands(image: RasterImage, minArea = 1, alphaThreshold = 16): number {
  const width = image.width;
  const height = image.height;
  const visited = new Uint8Array(width * height);
  const isOpaque = (x: number, y: number): boolean =>
    (image.data[pixelIndex(image, x, y) + 3] ?? 0) > alphaThreshold;
  let total = 0;
  let largest = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const start = y * width + x;
      if (visited[start] || !isOpaque(x, y)) continue;
      const area = floodFill(image, x, y, visited);
      if (area < minArea) continue;
      total++;
      largest = Math.max(largest, area);
    }
  }
  return total - (largest > 0 ? 1 : 0);
}

function floodFill(image: RasterImage, startX: number, startY: number, visited: Uint8Array): number {
  const width = image.width;
  const stack: number[] = [startY * width + startX];
  let area = 0;
  while (stack.length > 0) {
    const index = stack.pop() as number;
    if (visited[index]) continue;
    visited[index] = 1;
    const x = index % width;
    const y = (index - x) / width;
    if ((image.data[pixelIndex(image, x, y) + 3] ?? 0) <= 16) continue;
    area++;
    if (x > 0) stack.push(index - 1);
    if (x < width - 1) stack.push(index + 1);
    if (y > 0) stack.push(index - width);
    if (y < image.height - 1) stack.push(index + width);
  }
  return area;
}

/** Lowest opaque row — the contact point that must sit on the ground line. */
export function lowestOpaqueRow(image: RasterImage): number {
  for (let y = image.height - 1; y >= 0; y--) {
    for (let x = 0; x < image.width; x++) {
      if ((image.data[pixelIndex(image, x, y) + 3] ?? 0) > 16) return y;
    }
  }
  return -1;
}

/**
 * Opaque or semi-opaque pixels that would still be keyed by the *same* rule the
 * plate was keyed with. Fringe from a chroma key is a hue error, not a distance
 * error: the earlier version compared against the key colour with a Manhattan
 * radius of 120, which flagged desaturated mauve blends (171,115,138) that no
 * viewer would call a fringe, and would have missed a genuinely magenta edge
 * that happened to sit 130 away.
 */
export function countChromaSpill(image: RasterImage, key: Rgb, alphaThreshold = 8): number {
  let spill = 0;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const i = pixelIndex(image, x, y);
      if ((image.data[i + 3] ?? 0) < alphaThreshold) continue;
      if (isChromaPixel(image.data[i] ?? 0, image.data[i + 1] ?? 0, image.data[i + 2] ?? 0, key)) spill++;
    }
  }
  return spill;
}