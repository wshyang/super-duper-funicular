import type { ArticulatedPose, Point2D, RasterImage, RgbaColor } from '../shared/types.js';
import type { AnatomicalRigSpec } from '../runner/body-proportions.js';
import { createRaster, fillRaster, writePixel } from './raster.js';

export interface PoseGuideRenderOptions {
  readonly width?: number;
  readonly height?: number;
  readonly background?: RgbaColor;
  readonly marginX?: number;
  readonly marginY?: number;
}

const DEFAULT_GUIDE_SIZE = { width: 1408, height: 768 } as const;
const COLORS = {
  background: { r: 239, g: 242, b: 247, a: 255 },
  torso: { r: 34, g: 47, b: 67, a: 255 },
  near: { r: 0, g: 143, b: 224, a: 255 },
  far: { r: 239, g: 119, b: 36, a: 255 },
  hair: { r: 38, g: 46, b: 60, a: 255 },
  ground: { r: 115, g: 126, b: 145, a: 255 },
} satisfies Record<string, RgbaColor>;

/**
 * Render a high-resolution, identity-neutral pose guide from the solved runner
 * joints. Blue marks the camera-near limbs, orange marks camera-far limbs, and
 * the dark centerline marks pelvis/torso/head. This avoids using a low-resolution
 * character render as the only pose cue during image regeneration.
 */
export interface LockedGuideBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

export function computeLockedGuideBounds(
  poses: readonly ArticulatedPose[],
  rig: AnatomicalRigSpec,
  width = DEFAULT_GUIDE_SIZE.width,
  height = DEFAULT_GUIDE_SIZE.height,
  marginX = Math.round(width * 0.08),
  marginY = Math.round(height * 0.06),
): LockedGuideBounds {
  const allPoints = poses.flatMap((pose) => collectGuidePoints(pose, rig));
  const bounds = boundsOf(allPoints, rig.headRadius + 16);
  const scale = Math.min(
    (width - marginX * 2) / Math.max(1, bounds.maxX - bounds.minX),
    (height - marginY * 2) / Math.max(1, bounds.maxY - bounds.minY),
  );
  const offsetX = (width - (bounds.maxX - bounds.minX) * scale) / 2 - bounds.minX * scale;
  const offsetY = (height - (bounds.maxY - bounds.minY) * scale) / 2 - bounds.minY * scale;
  return { minX: bounds.minX, maxX: bounds.maxX, minY: bounds.minY, maxY: bounds.maxY, scale, offsetX, offsetY };
}

export function renderPoseGuideRaster(
  pose: ArticulatedPose,
  rig: AnatomicalRigSpec,
  options: PoseGuideRenderOptions = {},
): RasterImage {
  const width = options.width ?? DEFAULT_GUIDE_SIZE.width;
  const height = options.height ?? DEFAULT_GUIDE_SIZE.height;
  const raster = createRaster(width, height);
  fillRaster(raster, options.background ?? COLORS.background);

  const guidePoints = collectGuidePoints(pose, rig);
  const bounds = boundsOf(guidePoints, rig.headRadius + 16);
  const marginX = options.marginX ?? Math.round(width * 0.08);
  const marginY = options.marginY ?? Math.round(height * 0.06);
  const scale = Math.min(
    (width - marginX * 2) / Math.max(1, bounds.maxX - bounds.minX),
    (height - marginY * 2) / Math.max(1, bounds.maxY - bounds.minY),
  );
  const offsetX = (width - (bounds.maxX - bounds.minX) * scale) / 2 - bounds.minX * scale;
  const offsetY = (height - (bounds.maxY - bounds.minY) * scale) / 2 - bounds.minY * scale;
  const map = (point: Point2D): Point2D => ({
    x: point.x * scale + offsetX,
    y: point.y * scale + offsetY,
  });

  const groundY = map({ x: 0, y: rig.groundY }).y;
  drawDashedHorizontal(raster, groundY, marginX, width - marginX, COLORS.ground, 2, 20, 14);

  // Far-side limbs sit behind the centerline and near-side limbs.
  drawLimb(raster, pose.farLeg, map, COLORS.far, scale);
  drawLimb(raster, pose.farArm, map, COLORS.far, scale);

  drawSegment(raster, map(pose.pelvis), map(pose.chest), COLORS.torso, Math.max(10, scale * 7));
  drawSegment(raster, map(pose.chest), map(pose.collar), COLORS.torso, Math.max(10, scale * 7));
  drawSegment(raster, map(pose.collar), map(pose.neck), COLORS.torso, Math.max(8, scale * 5));
  drawCircle(raster, map(pose.headCenter), Math.max(12, rig.headRadius * scale), COLORS.torso);
  drawJoint(raster, map(pose.pelvis), COLORS.torso, scale);
  drawJoint(raster, map(pose.chest), COLORS.torso, scale);
  drawJoint(raster, map(pose.collar), COLORS.torso, scale);

  drawLimb(raster, pose.nearLeg, map, COLORS.near, scale);
  drawLimb(raster, pose.nearArm, map, COLORS.near, scale);
  drawPolyline(raster, [pose.hairAnchor, pose.hairMidWave, pose.hairTip].map(map), COLORS.hair, Math.max(6, scale * 3));
  drawCircle(raster, map(pose.hairAnchor), Math.max(7, scale * 3), COLORS.hair);

  return raster;
}

export function renderPoseGuideRasterWithLockedBounds(
  pose: ArticulatedPose,
  rig: AnatomicalRigSpec,
  locked: LockedGuideBounds,
  options: PoseGuideRenderOptions = {},
): RasterImage {
  const width = options.width ?? DEFAULT_GUIDE_SIZE.width;
  const height = options.height ?? DEFAULT_GUIDE_SIZE.height;
  const raster = createRaster(width, height);
  fillRaster(raster, options.background ?? COLORS.background);
  const map = (point: Point2D): Point2D => ({
    x: point.x * locked.scale + locked.offsetX,
    y: point.y * locked.scale + locked.offsetY,
  });
  const groundY = map({ x: 0, y: rig.groundY }).y;
  const marginX = options.marginX ?? Math.round(width * 0.08);
  drawDashedHorizontal(raster, groundY, marginX, width - marginX, COLORS.ground, 2, 20, 14);
  drawLimb(raster, pose.farLeg, map, COLORS.far, locked.scale);
  drawLimb(raster, pose.farArm, map, COLORS.far, locked.scale);
  drawSegment(raster, map(pose.pelvis), map(pose.chest), COLORS.torso, Math.max(10, locked.scale * 7));
  drawSegment(raster, map(pose.chest), map(pose.collar), COLORS.torso, Math.max(10, locked.scale * 7));
  drawSegment(raster, map(pose.collar), map(pose.neck), COLORS.torso, Math.max(8, locked.scale * 5));
  drawCircle(raster, map(pose.headCenter), Math.max(12, rig.headRadius * locked.scale), COLORS.torso);
  drawJoint(raster, map(pose.pelvis), COLORS.torso, locked.scale);
  drawJoint(raster, map(pose.chest), COLORS.torso, locked.scale);
  drawJoint(raster, map(pose.collar), COLORS.torso, locked.scale);
  drawLimb(raster, pose.nearLeg, map, COLORS.near, locked.scale);
  drawLimb(raster, pose.nearArm, map, COLORS.near, locked.scale);
  drawPolyline(raster, [pose.hairAnchor, pose.hairMidWave, pose.hairTip].map(map), COLORS.hair, Math.max(6, locked.scale * 3));
  drawCircle(raster, map(pose.hairAnchor), Math.max(7, locked.scale * 3), COLORS.hair);
  return raster;
}

export function measureGuideLimbTorsoGapRigPx(
  pose: ArticulatedPose,
  _rig: AnatomicalRigSpec,
  limb: 'nearArm' | 'farArm' | 'nearLeg' | 'farLeg',
): number {
  // Tight bounding box gap in 220×256 rig space between the limb's four key points
  // and the torso central segment (pelvis-chest-collar). Negative if overlapping.
  const limbPointsArr = limbPoints(pose[limb]);
  const torsoMinX = Math.min(pose.pelvis.x, pose.chest.x, pose.collar.x) - 8;
  const torsoMaxX = Math.max(pose.pelvis.x, pose.chest.x, pose.collar.x) + 8;
  const torsoMinY = Math.min(pose.pelvis.y, pose.chest.y, pose.collar.y) - 10;
  const torsoMaxY = Math.max(pose.pelvis.y, pose.chest.y, pose.collar.y) + 10;
  const limbMinX = Math.min(...limbPointsArr.map((p) => p.x));
  const limbMaxX = Math.max(...limbPointsArr.map((p) => p.x));
  const limbMinY = Math.min(...limbPointsArr.map((p) => p.y));
  const limbMaxY = Math.max(...limbPointsArr.map((p) => p.y));
  const dx = limbMinX > torsoMaxX ? limbMinX - torsoMaxX : torsoMinX > limbMaxX ? torsoMinX - limbMaxX : 0;
  const dy = limbMinY > torsoMaxY ? limbMinY - torsoMaxY : torsoMinY > limbMaxY ? torsoMinY - limbMaxY : 0;
  if (dx > 0 && dy > 0) return Math.hypot(dx, dy);
  if (dx > 0) return dx;
  if (dy > 0) return dy;
  return -Math.min(
    torsoMaxX - limbMinX, limbMaxX - torsoMinX,
    torsoMaxY - limbMinY, limbMaxY - torsoMinY,
  );
}

function collectGuidePoints(pose: ArticulatedPose, rig: AnatomicalRigSpec): Point2D[] {
  return [
    pose.pelvis, pose.chest, pose.collar, pose.neck, pose.headCenter,
    pose.hairAnchor, pose.hairMidWave, pose.hairTip,
    ...limbPoints(pose.nearLeg), ...limbPoints(pose.farLeg),
    ...limbPoints(pose.nearArm), ...limbPoints(pose.farArm),
    { x: pose.pelvis.x, y: pose.headCenter.y - rig.headRadius - 16 },
    { x: pose.pelvis.x, y: rig.groundY + 8 },
  ];
}

function limbPoints(limb: ArticulatedPose['nearLeg']): Point2D[] {
  return [limb.hipOrShoulder, limb.midJoint, limb.endEffector, limb.heelPoint, limb.ballPoint, limb.tipPoint];
}

function boundsOf(points: readonly Point2D[], extra: number) {
  return {
    minX: Math.min(...points.map((point) => point.x)) - extra,
    maxX: Math.max(...points.map((point) => point.x)) + extra,
    minY: Math.min(...points.map((point) => point.y)) - extra,
    maxY: Math.max(...points.map((point) => point.y)) + extra,
  };
}

function drawLimb(
  raster: RasterImage,
  limb: ArticulatedPose['nearLeg'],
  map: (point: Point2D) => Point2D,
  color: RgbaColor,
  scale: number,
): void {
  const hip = map(limb.hipOrShoulder);
  const joint = map(limb.midJoint);
  const end = map(limb.endEffector);
  const heel = map(limb.heelPoint);
  const ball = map(limb.ballPoint);
  const toe = map(limb.tipPoint);
  const width = Math.max(8, scale * 4.5);
  drawSegment(raster, hip, joint, color, width);
  drawSegment(raster, joint, end, color, width);
  drawSegment(raster, end, heel, color, Math.max(5, scale * 2.6));
  drawSegment(raster, heel, ball, color, Math.max(6, scale * 3));
  drawSegment(raster, ball, toe, color, Math.max(6, scale * 3));
  [hip, joint, end, heel, ball, toe].forEach((point, index) => {
    drawJoint(raster, point, color, scale * (index === 0 || index === 1 || index === 2 ? 1.25 : 0.8));
  });
}

function drawPolyline(raster: RasterImage, points: readonly Point2D[], color: RgbaColor, width: number): void {
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1];
    const current = points[index];
    if (previous && current) drawSegment(raster, previous, current, color, width);
  }
}

function drawSegment(raster: RasterImage, a: Point2D, b: Point2D, color: RgbaColor, width: number): void {
  const radius = Math.max(1, width / 2);
  const minX = Math.max(0, Math.floor(Math.min(a.x, b.x) - radius));
  const maxX = Math.min(raster.width - 1, Math.ceil(Math.max(a.x, b.x) + radius));
  const minY = Math.max(0, Math.floor(Math.min(a.y, b.y) - radius));
  const maxY = Math.min(raster.height - 1, Math.ceil(Math.max(a.y, b.y) + radius));
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / lengthSquared));
      const px = a.x + t * dx;
      const py = a.y + t * dy;
      if ((x - px) ** 2 + (y - py) ** 2 <= radius * radius) writePixel(raster, { x, y }, color);
    }
  }
}

function drawCircle(raster: RasterImage, center: Point2D, radius: number, color: RgbaColor): void {
  const minX = Math.max(0, Math.floor(center.x - radius));
  const maxX = Math.min(raster.width - 1, Math.ceil(center.x + radius));
  const minY = Math.max(0, Math.floor(center.y - radius));
  const maxY = Math.min(raster.height - 1, Math.ceil(center.y + radius));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if ((x - center.x) ** 2 + (y - center.y) ** 2 <= radius * radius) writePixel(raster, { x, y }, color);
    }
  }
}

function drawJoint(raster: RasterImage, point: Point2D, color: RgbaColor, scale: number): void {
  drawCircle(raster, point, Math.max(5, scale * 2.4), color);
}

function drawDashedHorizontal(
  raster: RasterImage,
  y: number,
  startX: number,
  endX: number,
  color: RgbaColor,
  thickness: number,
  dashLength: number,
  gapLength: number,
): void {
  for (let x = startX; x < endX; x += dashLength + gapLength) {
    const stopX = Math.min(endX, x + dashLength);
    drawSegment(raster, { x, y }, { x: stopX, y }, color, thickness);
  }
}
