import type { ArticulatedPose, Point2D, RasterImage, RgbaColor } from '../shared/types.js';
import type { AnatomicalRigSpec } from '../runner/body-proportions.js';
import { createRaster, fillRaster, writePixel } from './raster.js';

export interface PoseGuideRenderOptions {
  readonly width?: number;
  readonly height?: number;
  readonly background?: RgbaColor;
  readonly marginX?: number;
  readonly marginY?: number;
  /**
   * V3: omit foot-contact glyphs. Image models copy figure-overlapping marks
   * as scene objects (GLYPH-COPY, Calls #91/#92); contact state is already
   * encoded by foot placement vs the dashed ground line. Default true (V2).
   */
  readonly footGlyphs?: boolean;
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

// ---------------------------------------------------------------------------
// V2 guide renderer (FLAW-1 fix): fill-frame capsule volumes with explicit
// foot-contact glyphs. V1 (`renderPoseGuideRaster`) is unchanged for
// backward compatibility; new characters and regeneration pilots use V2.
// ---------------------------------------------------------------------------

export interface PoseGuideV2Transform {
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly map: (point: Point2D) => Point2D;
}

export const GUIDE_V2_COLORS = {
  halo: { r: 255, g: 255, b: 255, a: 255 },
  contactGlyph: { r: 16, g: 122, b: 62, a: 255 },
  airborneGlyph: { r: 34, g: 47, b: 67, a: 255 },
  phaseActive: { r: 34, g: 47, b: 67, a: 255 },
  phaseInactive: { r: 180, g: 190, b: 205, a: 255 },
} as const;

/**
 * Fill-frame transform: the figure (head top .. ground line) spans 78% of the
 * canvas height with the ground pinned at 88% height, and the figure center is
 * biased to 46% width so the facing direction keeps open space ahead. Small
 * centered stick figures are demonstrably downweighted by image models
 * (H03 #76 -> #82 identical failure); V2 spends pose pixels instead of margin.
 */
export function computeGuideV2Transform(
  pose: ArticulatedPose,
  rig: AnatomicalRigSpec,
  width: number,
  height: number,
): PoseGuideV2Transform {
  const headTop = pose.headCenter.y - rig.headRadius - 6;
  const spanY = Math.max(1, rig.groundY + 6 - headTop);
  const scale = (height * 0.78) / spanY;
  const offsetY = height * 0.88 - rig.groundY * scale;
  const points = collectGuidePoints(pose, rig);
  const midX = (Math.min(...points.map((p) => p.x)) + Math.max(...points.map((p) => p.x))) / 2;
  const offsetX = width * 0.46 - midX * scale;
  return {
    scale,
    offsetX,
    offsetY,
    map: (point: Point2D): Point2D => ({ x: point.x * scale + offsetX, y: point.y * scale + offsetY }),
  };
}

export function renderPoseGuideRasterV2(
  pose: ArticulatedPose,
  rig: AnatomicalRigSpec,
  options: PoseGuideRenderOptions = {},
): RasterImage {
  const width = options.width ?? DEFAULT_GUIDE_SIZE.width;
  const height = options.height ?? DEFAULT_GUIDE_SIZE.height;
  const raster = createRaster(width, height);
  fillRaster(raster, options.background ?? COLORS.background);
  const { scale, map } = computeGuideV2Transform(pose, rig, width, height);

  const groundY = map({ x: 0, y: rig.groundY }).y;
  drawDashedHorizontal(raster, groundY, Math.round(width * 0.04), Math.round(width * 0.96), COLORS.ground, 3, 26, 16);

  // Far limbs: white halo + narrower capsule, drawn first (behind).
  drawLimbCapsule(raster, pose.farLeg, map, COLORS.far, scale, { widthScale: 3.6, halo: true });
  drawLimbCapsule(raster, pose.farArm, map, COLORS.far, scale, { widthScale: 3.6, halo: true });

  // Torso volume: tapered capsule pelvis -> chest -> collar -> neck.
  const torsoWidth = Math.max(12, scale * 8);
  drawSegment(raster, map(pose.pelvis), map(pose.chest), COLORS.torso, torsoWidth);
  drawSegment(raster, map(pose.chest), map(pose.collar), COLORS.torso, torsoWidth * 0.82);
  drawSegment(raster, map(pose.collar), map(pose.neck), COLORS.torso, Math.max(8, scale * 5));

  // Head volume + facing tick (nose direction = facing right).
  const headC = map(pose.headCenter);
  drawCircle(raster, headC, Math.max(14, rig.headRadius * scale), COLORS.torso);
  drawSegment(
    raster,
    headC,
    { x: headC.x + Math.max(16, rig.headRadius * scale) * 1.4, y: headC.y + 2 },
    COLORS.torso,
    Math.max(5, scale * 2.4),
  );

  // Near limbs: wider saturated capsules on top (occlusion = depth cue).
  drawLimbCapsule(raster, pose.nearLeg, map, COLORS.near, scale, { widthScale: 5.2, halo: false });
  drawLimbCapsule(raster, pose.nearArm, map, COLORS.near, scale, { widthScale: 5.2, halo: false });

  // Joint centers over capsules.
  for (const limb of [pose.farLeg, pose.farArm, pose.nearLeg, pose.nearArm]) {
    const color = limb === pose.nearLeg || limb === pose.nearArm ? COLORS.near : COLORS.far;
    drawJoint(raster, map(limb.hipOrShoulder), color, scale * 1.3);
    drawJoint(raster, map(limb.midJoint), color, scale * 1.3);
    drawJoint(raster, map(limb.endEffector), color, scale * 1.1);
  }
  drawJoint(raster, map(pose.pelvis), COLORS.torso, scale * 1.3);
  drawJoint(raster, map(pose.chest), COLORS.torso, scale * 1.2);

  // Ponytail lag indicator.
  drawPolyline(raster, [pose.hairAnchor, pose.hairMidWave, pose.hairTip].map(map), COLORS.hair, Math.max(7, scale * 3.4));

  // Foot-contact glyphs (V2 only): filled green disc + ground tick = contact,
  // hollow dark ring = airborne. V3 omits them (GLYPH-COPY); foot placement
  // vs the dashed ground line carries the contact state instead.
  if (options.footGlyphs ?? true) {
    drawFootGlyph(raster, pose.nearLeg, map, scale, groundY);
    drawFootGlyph(raster, pose.farLeg, map, scale, groundY);
  }

  drawGuideLegend(raster, width, height, scale);
  drawPhaseDots(raster, pose.canonicalFrameIndex, width, height);

  return raster;
}

function drawLimbCapsule(
  raster: RasterImage,
  limb: ArticulatedPose['nearLeg'],
  map: (point: Point2D) => Point2D,
  color: RgbaColor,
  scale: number,
  style: { widthScale: number; halo: boolean },
): void {
  const hip = map(limb.hipOrShoulder);
  const joint = map(limb.midJoint);
  const end = map(limb.endEffector);
  const heel = map(limb.heelPoint);
  const ball = map(limb.ballPoint);
  const toe = map(limb.tipPoint);
  const width = Math.max(7, scale * style.widthScale);
  const segments: Array<[Point2D, Point2D, number]> = [
    [hip, joint, width],
    [joint, end, width * 0.88],
    [end, heel, width * 0.5],
    [heel, ball, width * 0.55],
    [ball, toe, width * 0.55],
  ];
  if (style.halo) {
    for (const [a, b, w] of segments) drawSegment(raster, a, b, GUIDE_V2_COLORS.halo, w + Math.max(6, scale * 2));
  }
  for (const [a, b, w] of segments) drawSegment(raster, a, b, color, w);
}

function drawFootGlyph(
  raster: RasterImage,
  limb: ArticulatedPose['nearLeg'],
  map: (point: Point2D) => Point2D,
  scale: number,
  groundY: number,
): void {
  const ball = map(limb.ballPoint);
  const radius = Math.max(8, scale * 3.2);
  if (limb.isGrounded) {
    drawCircle(raster, ball, radius, GUIDE_V2_COLORS.contactGlyph);
    drawSegment(
      raster,
      { x: ball.x - radius * 1.6, y: groundY },
      { x: ball.x + radius * 1.6, y: groundY },
      GUIDE_V2_COLORS.contactGlyph,
      Math.max(4, scale * 1.8),
    );
  } else {
    drawRing(raster, map(limb.tipPoint), radius, GUIDE_V2_COLORS.airborneGlyph, Math.max(3, scale * 1.4));
  }
}

function drawRing(raster: RasterImage, center: Point2D, radius: number, color: RgbaColor, thickness: number): void {
  const outer = radius + thickness / 2;
  const inner = Math.max(0, radius - thickness / 2);
  const minX = Math.max(0, Math.floor(center.x - outer));
  const maxX = Math.min(raster.width - 1, Math.ceil(center.x + outer));
  const minY = Math.max(0, Math.floor(center.y - outer));
  const maxY = Math.min(raster.height - 1, Math.ceil(center.y + outer));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const d = Math.hypot(x - center.x, y - center.y);
      if (d <= outer && d >= inner) writePixel(raster, { x, y }, color);
    }
  }
}

/** Geometric legend (no fonts): near / far / torso swatches, top-left. */
function drawGuideLegend(raster: RasterImage, width: number, height: number, scale: number): void {
  const x0 = Math.round(width * 0.03);
  const y0 = Math.round(height * 0.05);
  const rowH = Math.max(14, scale * 5);
  const swatches: RgbaColor[] = [COLORS.near, COLORS.far, COLORS.torso];
  swatches.forEach((color, row) => {
    const y = y0 + row * rowH;
    drawSegment(raster, { x: x0, y }, { x: x0 + Math.max(30, scale * 12), y }, color, Math.max(8, scale * 3.4));
    drawCircle(raster, { x: x0 + Math.max(30, scale * 12) + Math.max(10, scale * 4), y }, Math.max(5, scale * 2.2), color);
  });
}

/** Phase spine dots: 8 dots, active frame filled (bottom-left, outside figure band). */
function drawPhaseDots(raster: RasterImage, activeIndex: number, width: number, height: number): void {
  const y = Math.round(height * 0.93);
  const x0 = Math.round(width * 0.03);
  const gap = Math.max(16, Math.round(width * 0.016));
  for (let i = 0; i < 8; i++) {
    const center = { x: x0 + i * gap, y };
    if (i === activeIndex) {
      drawCircle(raster, center, 7, GUIDE_V2_COLORS.phaseActive);
    } else {
      drawRing(raster, center, 6, GUIDE_V2_COLORS.phaseInactive, 3);
    }
  }
}
