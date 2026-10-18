import { loadImage } from '../../src/pipeline/image-io.js';
import { applyAlpha } from '../../src/pipeline/chroma-key.js';
import { computeKeyedAlpha } from '../../src/pipeline/chroma-key.js';
import { computeSilhouetteBounds, computeSoleBaselineY } from '../../src/pipeline/silhouette-metrics.js';
import { computeDHash64, dHashHammingDistance } from '../../src/pipeline/dhash.js';
import type { RasterImage } from '../../src/shared/types.js';

const FLIGHT_PHASES = new Set([0.375, 0.875]);

export interface KeyedPlate {
  readonly masked: RasterImage;
  readonly heightFraction: number;
  readonly widthFraction: number;
  readonly soleY: number;
  readonly centroidX: number;
  readonly dHash: string;
}

export function keyPlate(path: string): KeyedPlate {
  const plate = loadImage(path);
  const masked = applyAlpha(plate, computeKeyedAlpha(plate));
  const bounds = computeSilhouetteBounds(masked);
  return {
    masked,
    heightFraction: (bounds.maxY - bounds.minY + 1) / plate.height,
    widthFraction: (bounds.maxX - bounds.minX + 1) / plate.width,
    soleY: computeSoleBaselineY(masked, bounds),
    centroidX: (bounds.minX + bounds.maxX) / 2,
    dHash: computeDHash64(masked),
  };
}

export function contactClassForPhase(phase: number): 'stance' | 'flight' {
  return FLIGHT_PHASES.has(phase) ? 'flight' : 'stance';
}

export function minimumHamming(dHash: string, others: readonly string[]): number {
  return others.reduce((minimum, other) => Math.min(minimum, dHashHammingDistance(dHash, other)), Number.POSITIVE_INFINITY);
}
