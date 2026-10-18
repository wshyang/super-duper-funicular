import type { DecodedImage } from './image-codec.ts';

export interface Silhouette {
  readonly mask: Uint8Array;
  readonly width: number;
  readonly height: number;
  readonly area: number;
  readonly bounds: {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
  };
  readonly centroid: { readonly x: number; readonly y: number };
}

export const silhouetteOf = (image: DecodedImage, alphaThreshold = 127): Silhouette => {
  const mask = new Uint8Array(image.width * image.height);
  let area = 0;
  let sumX = 0;
  let sumY = 0;
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const alpha = image.data[(y * image.width + x) * 4 + 3] ?? 0;
      if (alpha < alphaThreshold) continue;
      mask[y * image.width + x] = 1;
      area += 1;
      sumX += x;
      sumY += y;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  return {
    mask,
    width: image.width,
    height: image.height,
    area,
    bounds: maxX < 0 ? { minX: 0, minY: 0, maxX: 0, maxY: 0 } : { minX, minY, maxX, maxY },
    centroid: area === 0 ? { x: 0, y: 0 } : { x: sumX / area, y: sumY / area },
  };
};

/** IoU with the second mask translated so its centroid matches the first. */
export const centroidAlignedIou = (a: Silhouette, b: Silhouette): number => {
  const dx = Math.round(a.centroid.x - b.centroid.x);
  const dy = Math.round(a.centroid.y - b.centroid.y);
  let intersection = 0;
  let union = a.area + b.area;
  for (let y = 0; y < a.height; y += 1) {
    for (let x = 0; x < a.width; x += 1) {
      const left = a.mask[y * a.width + x] ?? 0;
      const sourceX = x - dx;
      const sourceY = y - dy;
      const inside = sourceX >= 0 && sourceY >= 0 && sourceX < b.width && sourceY < b.height;
      const right = inside ? (b.mask[sourceY * b.width + sourceX] ?? 0) : 0;
      if (left === 1 && right === 1) intersection += 1;
    }
  }
  union -= intersection;
  return union <= 0 ? 0 : intersection / union;
};

export interface FootClusters {
  readonly centers: readonly number[];
  readonly separation: number;
  readonly stanceSide: 'front' | 'back' | 'single' | 'none';
}

/** Two-foot contact estimate from the lowest silhouette band. */
export const footClusters = (silhouette: Silhouette): FootClusters => {
  const { bounds, mask, width } = silhouette;
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const bandTop = Math.max(bounds.minY, bounds.maxY - Math.round(Math.max(8, height * 0.16)));
  const columnCounts: number[] = new Array(width).fill(0);
  for (let y = bandTop; y <= bounds.maxY; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (mask[y * width + x] === 1) {
        columnCounts[x] = (columnCounts[x] ?? 0) + 1;
      }
    }
  }
  const runs: [number, number][] = [];
  let start: number | null = null;
  columnCounts.forEach((count, x) => {
    if (count > 1 && start === null) start = x;
    if (count <= 1 && start !== null) {
      if (x - start >= 3) runs.push([start, x]);
      start = null;
    }
  });
  if (start !== null && width - start >= 3) runs.push([start, width]);
  if (runs.length === 0) return { centers: [], separation: 0, stanceSide: 'none' };
  const centers = runs.map(([from, to]) => (from + to) / 2);
  if (runs.length === 1) return { centers, separation: 0, stanceSide: 'single' };
  const separation = Math.max(...centers) - Math.min(...centers);
  const lowestRun = runs.reduce(
    (best, run, index) => {
      let bestY = -1;
      for (let y = bandTop; y <= bounds.maxY; y += 1) {
        for (let x = run[0]; x < run[1]; x += 1) {
          if ((mask[y * width + x] ?? 0) === 1) bestY = Math.max(bestY, y);
        }
      }
      return bestY > best.score ? { index, score: bestY } : best;
    },
    { index: 0, score: -1 },
  );
  return {
    centers,
    separation,
    stanceSide:
      lowestRun.index === 0 ? 'back' : lowestRun.index === runs.length - 1 ? 'front' : 'single',
  };
};
