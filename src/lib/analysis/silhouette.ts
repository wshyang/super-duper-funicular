import type { Raster } from '../../shared/types.ts';
import { alphaMask } from '../render/raster.ts';

export interface Silhouette {
  readonly width: number;
  readonly height: number;
  readonly mask: Uint8Array;
}

export function silhouetteOf(raster: Raster): Silhouette {
  return { width: raster.width, height: raster.height, mask: alphaMask(raster) };
}

/** Centroid-aligned silhouette IoU (the metric behind FLAW-01). */
export function alignedIou(a: Silhouette, b: Silhouette): number {
  const ca = centroidColumn(a);
  const cb = centroidColumn(b);
  const shift = Math.round(ca - cb);
  let intersection = 0;
  let union = 0;
  for (let y = 0; y < a.height; y += 1) {
    for (let x = 0; x < a.width; x += 1) {
      const xa = x;
      const xb = x - shift;
      const inA = (a.mask[y * a.width + xa] ?? 0) === 1;
      const inB = xb >= 0 && xb < b.width ? (b.mask[y * b.width + xb] ?? 0) === 1 : false;
      if (inA || inB) union += 1;
      if (inA && inB) intersection += 1;
    }
  }
  return union === 0 ? 0 : intersection / union;
}

export function centroidColumn(s: Silhouette): number {
  let sum = 0;
  let n = 0;
  for (let y = 0; y < s.height; y += 1) {
    for (let x = 0; x < s.width; x += 1) {
      if ((s.mask[y * s.width + x] ?? 0) === 1) {
        sum += x;
        n += 1;
      }
    }
  }
  return n === 0 ? 0 : sum / n;
}

/** Bottom-band runs: foot blobs near the ground line (FLAW-02/03 evidence). */
export function bottomBandRuns(s: Silhouette, bandFraction: number): Array<{ start: number; end: number }> {
  const top = Math.floor(s.height * (1 - bandFraction));
  const columns: number[] = [];
  for (let x = 0; x < s.width; x += 1) {
    let hit = 0;
    for (let y = top; y < s.height; y += 1) {
      if ((s.mask[y * s.width + x] ?? 0) === 1) {
        hit = 1;
        break;
      }
    }
    columns.push(hit);
  }
  const runs: Array<{ start: number; end: number }> = [];
  let start: number | null = null;
  columns.forEach((value, x) => {
    if (value === 1 && start === null) start = x;
    if ((value === 0 || x === columns.length - 1) && start !== null) {
      runs.push({ start, end: value === 0 ? x - 1 : x });
      start = null;
    }
  });
  return runs.filter((run) => run.end - run.start >= 2);
}
