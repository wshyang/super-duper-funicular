import type {
  ArticulatedPose,
  PhotorealAssetTuningSpec,
  Point2D,
  RasterImage,
} from '../shared/types.js';
import type { AnatomicalRigSpec } from '../runner/body-proportions.js';
import type {
  CapsuleSpec,
  PoseTargetGeometry,
  Registration,
  SilhouetteMask,
  TargetPartGeometry,
} from './pose-material-types.js';

const ALPHA_FOREGROUND = 96;

export function isSkinPixel(image: RasterImage, index: number): boolean {
  const r = image.data[index] ?? 0;
  const g = image.data[index + 1] ?? 0;
  const b = image.data[index + 2] ?? 0;
  if (r < g || g < b) return false;
  if (r - b < 18) return false;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max < 70 || max - min < 18) return false;
  const delta = max - min;
  const hue = 60 * ((g - b) / delta);
  return hue >= 6 && hue <= 46;
}

export function buildSilhouetteMask(image: RasterImage): SilhouetteMask {
  const data = new Uint8Array(image.width * image.height);
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  let count = 0;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if ((image.data[(y * image.width + x) * 4 + 3] ?? 0) <= ALPHA_FOREGROUND) continue;
      data[y * image.width + x] = 1;
      count++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  const safeBounds = count === 0
    ? { minX: 0, minY: 0, maxX: 0, maxY: 0 }
    : { minX, minY, maxX, maxY };
  return {
    width: image.width,
    height: image.height,
    data,
    ...safeBounds,
    count,
    headCentroid: estimateHeadCentroid(data, image.width, safeBounds, count),
    faceWidthPx: measureHeadWidth(image, data, safeBounds, count),
  };
}

function estimateHeadCentroid(
  data: Uint8Array,
  width: number,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  count: number,
): Point2D {
  if (count === 0) return { x: 0, y: 0 };
  const height = bounds.maxY - bounds.minY + 1;
  const bandBottom = bounds.minY + Math.max(4, Math.round(height * 0.1));
  let sumX = 0;
  let sumY = 0;
  let n = 0;
  for (let y = bounds.minY; y <= bandBottom; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      if (!data[y * width + x]) continue;
      sumX += x;
      sumY += y;
      n++;
    }
  }
  return n === 0 ? { x: bounds.minX, y: bounds.minY } : { x: sumX / n, y: sumY / n };
}

/**
 * Width of the head band (crown + upper skull) in pixels. Unlike total figure
 * height this is pose-invariant, so it is the anchor for scale/identity checks.
 */
function measureHeadWidth(
  image: RasterImage,
  data: Uint8Array,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  count: number,
): number {
  if (count === 0) return 0;
  const height = bounds.maxY - bounds.minY + 1;
  const bandBottom = bounds.minY + Math.max(4, Math.round(height * 0.14));
  let widest = 0;
  for (let y = bounds.minY; y <= bandBottom; y++) {
    let run = 0;
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      const index = (y * image.width + x) * 4;
      if (data[y * image.width + x] && isSkinPixel(image, index)) {
        run++;
        widest = Math.max(widest, run);
      } else {
        run = 0;
      }
    }
  }
  return widest;
}

export function isMaskForeground(mask: SilhouetteMask, point: Point2D): boolean {
  const x = Math.round(point.x);
  const y = Math.round(point.y);
  if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return false;
  return mask.data[y * mask.width + x] === 1;
}

export function distanceToSegment(point: Point2D, start: Point2D, end: Point2D): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq < 1e-6) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq));
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

export function pointInCapsule(point: Point2D, capsule: CapsuleSpec): boolean {
  return distanceToSegment(point, capsule.start, capsule.end) <= capsule.halfWidth;
}

export function sampleCapsuleInterior(capsule: CapsuleSpec, step: number): Point2D[] {
  const points: Point2D[] = [];
  const dx = capsule.end.x - capsule.start.x;
  const dy = capsule.end.y - capsule.start.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / length;
  const uy = dy / length;
  const r = Math.max(1, capsule.halfWidth * 0.75);
  for (let t = 0; t <= length; t += step) {
    for (let o = -r; o <= r; o += step) {
      points.push({
        x: capsule.start.x + ux * t - uy * o,
        y: capsule.start.y + uy * t + ux * o,
      });
    }
  }
  return points;
}

export function projectPointToRig(
  point: Point2D,
  registration: Registration,
): Point2D {
  return {
    x: (point.x - registration.translateX) / registration.scale,
    y: (point.y - registration.translateY) / registration.scale,
  };
}

export function projectPointToImage(
  point: Point2D,
  registration: Registration,
): Point2D {
  return {
    x: point.x * registration.scale + registration.translateX,
    y: point.y * registration.scale + registration.translateY,
  };
}

/**
 * Pose-stable anchors: figure top (head crown) and the head-band centroid are
 * almost invariant across gait phases, unlike the bbox centre or the feet (which
 * move through flight). Registering on them avoids the classic error of "the
 * stride changed, so the registration shifted".
 */
export function registerSilhouette(
  mask: SilhouetteMask,
  target: PoseTargetGeometry,
): Registration {
  const figureHeightPx = mask.maxY - mask.minY + 1;
  if (mask.count === 0 || figureHeightPx <= 0) {
    return { scale: 1, translateX: 0, translateY: 0, poseF1: 0, figureHeightPx: 0 };
  }
  const targetHeight = target.figureBottom - target.figureTop;
  const scale = figureHeightPx / targetHeight;
  const translateX = mask.headCentroid.x - scale * target.headCenter.x;
  const translateY = mask.minY - scale * target.figureTop;
  return {
    scale,
    translateX,
    translateY,
    poseF1: 0,
    figureHeightPx,
  };
}

interface MaskPointCache {
  readonly stride: number;
  readonly xs: Float32Array;
  readonly ys: Float32Array;
}

interface TargetGrid {
  readonly minX: number;
  readonly minY: number;
  readonly width: number;
  readonly height: number;
  readonly cell: number;
  readonly occupancy: Uint8Array;
  readonly capsulePoints: Map<number, MaskPointCache>;
}

const maskPointCache = new WeakMap<SilhouetteMask, Map<number, MaskPointCache>>();
const targetGridCache = new WeakMap<PoseTargetGeometry, TargetGrid>();

const GRID_CELL = 2;

function maskSamplePoints(mask: SilhouetteMask, stride: number): MaskPointCache {
  const perMask = maskPointCache.get(mask) ?? new Map<number, MaskPointCache>();
  const cached = perMask.get(stride);
  if (cached) return cached;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let y = mask.minY; y <= mask.maxY; y += stride) {
    for (let x = mask.minX; x <= mask.maxX; x += stride) {
      if (!mask.data[y * mask.width + x]) continue;
      xs.push(x);
      ys.push(y);
    }
  }
  const built: MaskPointCache = { stride, xs: Float32Array.from(xs), ys: Float32Array.from(ys) };
  perMask.set(stride, built);
  maskPointCache.set(mask, perMask);
  return built;
}

/**
 * The target silhouette is rasterised once into a coarse occupancy grid over rig
 * space. Membership tests are then O(1), which matters because registration
 * search evaluates hundreds of alignments per source.
 */
function targetGrid(target: PoseTargetGeometry): TargetGrid {
  const cached = targetGridCache.get(target);
  if (cached) return cached;
  const box = capsuleBoundingBox(target.parts.map((entry) => entry.capsule));
  const minX = Math.floor(box.minX) - 4;
  const minY = Math.floor(box.minY) - 4;
  const width = Math.ceil(box.maxX - minX) + 5;
  const height = Math.ceil(box.maxY - minY) + 5;
  const columns = Math.ceil(width / GRID_CELL);
  const occupancy = new Uint8Array(columns * Math.ceil(height / GRID_CELL));
  for (let gy = 0; gy * GRID_CELL < height; gy++) {
    for (let gx = 0; gx < columns; gx++) {
      const point = { x: minX + gx * GRID_CELL, y: minY + gy * GRID_CELL };
      if (target.parts.some((part) => pointInCapsule(point, part.capsule))) {
        occupancy[gy * columns + gx] = 1;
      }
    }
  }
  const built: TargetGrid = {
    minX,
    minY,
    width,
    height,
    cell: GRID_CELL,
    occupancy,
    capsulePoints: new Map(),
  };
  targetGridCache.set(target, built);
  return built;
}

function capsuleSamplePoints(target: PoseTargetGeometry, stride: number): MaskPointCache {
  const grid = targetGrid(target);
  const cached = grid.capsulePoints.get(stride);
  if (cached) return cached;
  const xs: number[] = [];
  const ys: number[] = [];
  for (const part of target.parts) {
    for (const point of sampleCapsuleInterior(part.capsule, stride)) {
      xs.push(point.x);
      ys.push(point.y);
    }
  }
  const built: MaskPointCache = { stride, xs: Float32Array.from(xs), ys: Float32Array.from(ys) };
  grid.capsulePoints.set(stride, built);
  return built;
}

function isTargetForeground(grid: TargetGrid, rigX: number, rigY: number): boolean {
  const gx = Math.round((rigX - grid.minX) / grid.cell);
  const gy = Math.round((rigY - grid.minY) / grid.cell);
  if (gx < 0 || gy < 0) return false;
  const columns = Math.ceil(grid.width / grid.cell);
  const index = gy * columns + gx;
  if (gx >= columns || index >= grid.occupancy.length) return false;
  return grid.occupancy[index] === 1;
}

/**
 * Best-alignment registration. The head anchor proposes an alignment; a
 * translation search then maximises silhouette agreement, so a low score means
 * the plate really shows a different pose rather than a mis-anchored template.
 */
export function refineRegistration(
  mask: SilhouetteMask,
  registration: Registration,
  target: PoseTargetGeometry,
  searchPx = 36,
): Registration {
  const points = maskSamplePoints(mask, 6);
  let bestF1 = scorePose(mask, registration, points, target, 6);
  const search = (centre: Registration, radius: number, step: number): Registration => {
    let localBest = centre;
    let localF1 = bestF1;
    for (let dy = -radius; dy <= radius; dy += step) {
      for (let dx = -radius; dx <= radius; dx += step) {
        const candidate: Registration = {
          ...centre,
          translateX: centre.translateX + dx,
          translateY: centre.translateY + dy,
        };
        const f1 = scorePose(mask, candidate, points, target, 6);
        if (f1 > localF1) {
          localF1 = f1;
          localBest = candidate;
        }
      }
    }
    bestF1 = localF1;
    return localBest;
  };
  const coarse = search(registration, searchPx, 6);
  return search(coarse, 6, 2);
}

function scorePose(
  mask: SilhouetteMask,
  registration: Registration,
  maskPoints: MaskPointCache,
  target: PoseTargetGeometry,
  stride: number,
): number {
  const precision = precisionOf(maskPoints, registration, targetGrid(target));
  const recall = recallOf(mask, registration, capsuleSamplePoints(target, stride));
  return precision + recall <= 0 ? 0 : (2 * precision * recall) / (precision + recall);
}

function precisionOf(
  maskPoints: MaskPointCache,
  registration: Registration,
  grid: TargetGrid,
): number {
  let inside = 0;
  for (let i = 0; i < maskPoints.xs.length; i++) {
    const rigX = ((maskPoints.xs[i] ?? 0) - registration.translateX) / registration.scale;
    const rigY = ((maskPoints.ys[i] ?? 0) - registration.translateY) / registration.scale;
    if (isTargetForeground(grid, rigX, rigY)) inside++;
  }
  return maskPoints.xs.length === 0 ? 0 : inside / maskPoints.xs.length;
}

function recallOf(
  mask: SilhouetteMask,
  registration: Registration,
  capsulePoints: MaskPointCache,
): number {
  let covered = 0;
  for (let i = 0; i < capsulePoints.xs.length; i++) {
    const imageX = (capsulePoints.xs[i] ?? 0) * registration.scale + registration.translateX;
    const imageY = (capsulePoints.ys[i] ?? 0) * registration.scale + registration.translateY;
    if (isMaskForeground(mask, { x: imageX, y: imageY })) covered++;
  }
  return capsulePoints.xs.length === 0 ? 0 : covered / capsulePoints.xs.length;
}

export function measurePoseF1(
  mask: SilhouetteMask,
  registration: Registration,
  target: PoseTargetGeometry,
  stride = 3,
): number {
  return scorePose(
    mask,
    registration,
    maskSamplePoints(mask, stride),
    target,
    stride,
  );
}

export function capsuleBoundingBox(capsules: readonly CapsuleSpec[]): {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
} {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const capsule of capsules) {
    minX = Math.min(minX, capsule.start.x - capsule.halfWidth, capsule.end.x - capsule.halfWidth);
    maxX = Math.max(maxX, capsule.start.x + capsule.halfWidth, capsule.end.x + capsule.halfWidth);
    minY = Math.min(minY, capsule.start.y - capsule.halfWidth, capsule.end.y - capsule.halfWidth);
    maxY = Math.max(maxY, capsule.start.y + capsule.halfWidth, capsule.end.y + capsule.halfWidth);
  }
  return { minX, minY, maxX, maxY };
}

function part(
  partId: TargetPartGeometry['partId'],
  side: TargetPartGeometry['side'],
  start: Point2D,
  end: Point2D,
  halfWidth: number,
): TargetPartGeometry {
  return { partId, side, capsule: { partId, start, end, halfWidth } };
}

/**
 * The target silhouette is a union of anatomical capsules with the persona's
 * tuned widths. It is a measurement reference, not render art: it is what the
 * generated plate is compared against.
 */
/**
 * Figure extent is measured from pose landmarks (crown of the head to the lowest
 * sole), not from inflated capsules: capsule half-widths would push the extent
 * below the ground line and make every flight frame look like scale drift.
 */
export function measurePoseExtent(
  pose: ArticulatedPose,
  rig: AnatomicalRigSpec,
  tuning: PhotorealAssetTuningSpec,
): { readonly top: number; readonly bottom: number; readonly height: number } {
  const top = pose.headCenter.y - rig.headRadius * tuning.headScale;
  const sole = (leg: ArticulatedPose['nearLeg']): number =>
    Math.max(leg.heelPoint.y, leg.ballPoint.y, leg.tipPoint.y) + 2;
  const bottom = Math.max(sole(pose.nearLeg), sole(pose.farLeg));
  return { top, bottom, height: Math.max(1, bottom - top) };
}

export function buildTargetGeometry(
  pose: ArticulatedPose,
  rig: AnatomicalRigSpec,
  tuning: PhotorealAssetTuningSpec,
): PoseTargetGeometry {
  const parts = buildTargetParts(pose, rig, tuning);
  const extent = measurePoseExtent(pose, rig, tuning);
  return {
    pose,
    rig,
    parts,
    figureTop: extent.top,
    figureBottom: extent.bottom,
    headCenter: pose.headCenter,
  };
}

function buildTargetParts(
  pose: ArticulatedPose,
  rig: AnatomicalRigSpec,
  tuning: PhotorealAssetTuningSpec,
): TargetPartGeometry[] {
  const hairWidth = Math.max(4, rig.headRadius * 0.42);
  const neckWidth = Math.max(4, tuning.torsoWidthPx * 0.2);
  return [
    part('head', 'midline', pose.headCenter, pose.headCenter, rig.headRadius * tuning.headScale),
    part('hairAccessory', 'midline', pose.hairAnchor, pose.hairMidWave, hairWidth * 0.9),
    part('hairAccessory', 'midline', pose.hairMidWave, pose.hairTip, hairWidth * 0.7),
    part('neck', 'midline', pose.collar, pose.neck, neckWidth),
    part('torso', 'midline', pose.pelvis, pose.collar, tuning.torsoWidthPx * 0.5),
    part('pelvis', 'midline', pose.pelvis, pose.pelvis, tuning.pelvisWidthPx * 0.5),
    ...limbParts(pose.nearArm, 'near', tuning, 'Arm'),
    ...limbParts(pose.farArm, 'far', tuning, 'Arm'),
    ...limbParts(pose.nearLeg, 'near', tuning, 'Leg'),
    ...limbParts(pose.farLeg, 'far', tuning, 'Leg'),
  ];
}

function limbParts(
  limb: ArticulatedPose['nearLeg'],
  side: 'near' | 'far',
  tuning: PhotorealAssetTuningSpec,
  kind: 'Arm' | 'Leg',
): TargetPartGeometry[] {
  const prefix = side === 'near' ? 'near' : 'far';
  const upper = kind === 'Arm' ? 'UpperArm' : 'Thigh';
  const lower = kind === 'Arm' ? 'Forearm' : 'Shin';
  const upperId = `${prefix}${upper}` as const;
  const lowerId = `${prefix}${lower}` as const;
  const footId = `${prefix}Foot` as const;
  const upperWidth = kind === 'Arm' ? tuning.upperArmWidthPx : tuning.thighWidthPx;
  const lowerWidth = kind === 'Arm' ? tuning.forearmWidthPx : tuning.shinWidthPx;
  const entries: TargetPartGeometry[] = [
    part(upperId, side, limb.hipOrShoulder, limb.midJoint, upperWidth * 0.5),
    part(lowerId, side, limb.midJoint, limb.endEffector, lowerWidth * 0.5),
  ];
  if (kind === 'Arm') {
    const tip = {
      x: limb.endEffector.x + Math.cos(limb.distalAngleRad) * tuning.handLengthPx,
      y: limb.endEffector.y + Math.sin(limb.distalAngleRad) * tuning.handLengthPx,
    };
    entries.push(part(`${prefix}Hand` as const, side, limb.endEffector, tip, tuning.handWidthPx * 0.5));
  } else {
    entries.push(part(footId, side, limb.heelPoint, limb.tipPoint, tuning.footLengthScale * 11));
  }
  return entries;
}
