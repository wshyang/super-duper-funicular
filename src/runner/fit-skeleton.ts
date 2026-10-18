import type { Point2D, SkeletonSpec } from '../shared/rig.js';
import { BONE_FRACTIONS } from './rig.js';
import { rasterizeRigMask, solveRigPose, specToVector, vectorToSpec } from './rig.js';

const PELVIS_STEP_FRACTION = 0.02;
const ANGLE_STEP_RAD = 0.1;
const SWEEP_COUNT = 3;
const CANDIDATE_OFFSETS = [-1, -0.5, 0, 0.5, 1] as const;
const PELVIS_BOUND_FRACTION = 0.06;
const PITCH_BOUND_RAD = 0.3;
const SUPPORT_WEIGHT = 0.45;

interface AlignContext {
  readonly mask: Uint8Array;
  readonly width: number;
  readonly height: number;
  readonly figureHeightPx: number;
  readonly distanceTransform: Float64Array;
  readonly lower: readonly number[];
  readonly upper: readonly number[];
}

interface FitResult {
  readonly spec: SkeletonSpec;
  readonly iou: number;
}

/**
 * Align a seeded pose (limb angles fixed) to a plate silhouette by tuning pelvis
 * position, torso pitch and head tilt only. Limb angles come from the audited
 * per-key pose table and are never modified here.
 */
export function alignSkeletonToSilhouette(mask: Uint8Array, width: number, height: number, init: SkeletonSpec, distanceTransform?: Float64Array): FitResult {
  const figureHeightPx = estimateMaskHeight(mask, width, height);
  const context: AlignContext = { mask, width, height, figureHeightPx, distanceTransform: distanceTransform ?? new Float64Array(width * height), ...boundsFromInit(init, figureHeightPx) };
  let vector = specToVector(init);
  let best: FitResult = { spec: init, iou: scoreOf(vector, context).iou };
  for (let sweep = 0; sweep < SWEEP_COUNT; sweep++) {
    const decay = 1 / (1 + sweep);
    for (const paramIndex of [0, 1, 2, 3]) {
      const step = stepForParam(paramIndex, figureHeightPx) * decay;
      best = optimizeParam(vector, paramIndex, step, best, context);
      vector = specToVector(best.spec);
    }
  }
  return best;
}

function boundsFromInit(init: SkeletonSpec, figureHeightPx: number): { lower: number[]; upper: number[] } {
  const vector = specToVector(init);
  const pelvisBound = PELVIS_BOUND_FRACTION * figureHeightPx;
  const lower = vector.map((value, index) => (index <= 1 ? value - pelvisBound : value - PITCH_BOUND_RAD));
  const upper = vector.map((value, index) => (index <= 1 ? value + pelvisBound : value + PITCH_BOUND_RAD));
  return { lower, upper };
}

function optimizeParam(vector: number[], paramIndex: number, step: number, bestSoFar: FitResult, context: AlignContext): FitResult {
  let best = bestSoFar;
  for (const offset of CANDIDATE_OFFSETS) {
    if (offset === 0) continue;
    const candidate = [...vector];
    candidate[paramIndex] = clampToBounds(vector[paramIndex] + offset * step, context.lower[paramIndex], context.upper[paramIndex]);
    const challenger = scoreOf(candidate, context);
    if (challenger.iou > best.iou) best = challenger;
  }
  return best;
}

function scoreOf(vector: readonly number[], context: AlignContext): FitResult {
  const spec = vectorToSpec(vector);
  const pose = solveRigPose(spec, context.figureHeightPx);
  const raster = rasterizeRigMask(pose, context.width, context.height);
  return { spec, iou: maskIoU(raster, context.mask) + SUPPORT_WEIGHT * supportScore(pose, context) };
}

function supportScore(pose: ReturnType<typeof solveRigPose>, context: AlignContext): number {
  const samples: readonly { readonly point: Point2D; readonly radiusFraction: number }[] = [
    { point: pose.waist, radiusFraction: 0.052 },
    { point: pose.neckBase, radiusFraction: 0.045 },
    { point: pose.headCenter, radiusFraction: BONE_FRACTIONS.headRadius },
  ];
  let sum = 0;
  for (const sample of samples) {
    const capPx = sample.radiusFraction * context.figureHeightPx;
    const deviation = Math.abs(dtAt(sample.point, context) - capPx) / Math.max(1, capPx);
    sum += 1 - Math.min(1, deviation);
  }
  return sum / samples.length;
}

function dtAt(point: Point2D, context: AlignContext): number {
  const x = Math.round(point.x);
  const y = Math.round(point.y);
  if (x < 0 || y < 0 || x >= context.width || y >= context.height) return 0;
  return context.distanceTransform[y * context.width + x];
}

function clampToBounds(value: number, lower: number, upper: number): number {
  return Math.max(lower, Math.min(upper, value));
}

function stepForParam(paramIndex: number, figureHeightPx: number): number {
  return paramIndex <= 1 ? PELVIS_STEP_FRACTION * figureHeightPx : ANGLE_STEP_RAD;
}

export function maskIoU(a: Uint8Array, b: Uint8Array): number {
  let intersection = 0;
  let union = 0;
  for (let index = 0; index < a.length; index++) {
    const inA = a[index] === 1;
    const inB = b[index] === 1;
    if (inA && inB) intersection++;
    if (inA || inB) union++;
  }
  return union === 0 ? 0 : intersection / union;
}

export function estimateMaskHeight(mask: Uint8Array, width: number, height: number): number {
  let minY = height;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x] === 1) {
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return maxY <= minY ? 1 : maxY - minY + 1;
}
