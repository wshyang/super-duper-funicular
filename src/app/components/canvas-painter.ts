import type {
  ArticulatedPose,
  BackdropVariantId,
  LimbKinematics,
  Point2D,
  RasterImage,
} from '../../shared/types.js';
import type { FootOrbitSample, OverlayVisibility } from '../hooks/studio-view-model.js';

export interface StageCanvasPaintSpec {
  readonly ctx: CanvasRenderingContext2D;
  readonly pose: ArticulatedPose;
  readonly currentRaster: RasterImage;
  readonly previousRaster: RasterImage;
  readonly backdrop: BackdropVariantId;
  readonly skeletonOverlay: OverlayVisibility;
  readonly orbitTrailOverlay: OverlayVisibility;
  readonly onionSkinOverlay: OverlayVisibility;
  readonly orbitSamples: readonly FootOrbitSample[];
}

export function paintAlgorithmicStageCanvas(spec: StageCanvasPaintSpec): void {
  const { ctx, currentRaster } = spec;
  paintStageBackdrop(ctx, spec.backdrop, spec.pose.phase);
  if (spec.onionSkinOverlay === 'visible') {
    drawRasterToContext(ctx, spec.previousRaster, 0.28);
  }
  drawRasterToContext(ctx, currentRaster, 1.0);
  if (spec.orbitTrailOverlay === 'visible') {
    drawFootOrbitTrails(ctx, spec.orbitSamples, spec.pose);
  }
  if (spec.skeletonOverlay === 'visible') {
    drawSkeletonAndIkOverlay(ctx, spec.pose);
  }
}

function paintStageBackdrop(
  ctx: CanvasRenderingContext2D,
  backdrop: BackdropVariantId,
  phase: number,
): void {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  if (backdrop === 'magenta-key') {
    ctx.fillStyle = '#FF00FF';
    ctx.fillRect(0, 0, w, h);
    return;
  }
  if (backdrop === 'studio-grid') {
    paintStudioCheckerboard(ctx, w, h);
    return;
  }
  paintStadiumScene(ctx, backdrop, phase);
}

function paintStudioCheckerboard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  const cell = 16;
  for (let y = 0; y < h; y += cell) {
    for (let x = 0; x < w; x += cell) {
      const isEven = (x / cell + y / cell) % 2 === 0;
      ctx.fillStyle = isEven ? '#182132' : '#111826';
      ctx.fillRect(x, y, cell, cell);
    }
  }
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 234);
  ctx.lineTo(w, 234);
  ctx.stroke();
}

function paintStadiumScene(
  ctx: CanvasRenderingContext2D,
  backdrop: BackdropVariantId,
  phase: number,
): void {
  const w = ctx.canvas.width;
  const grad = ctx.createLinearGradient(0, 0, 0, 175);
  if (backdrop === 'stadium-dusk') {
    grad.addColorStop(0, '#281C54');
    grad.addColorStop(1, '#EA7348');
  } else if (backdrop === 'stadium-night') {
    grad.addColorStop(0, '#0B1124');
    grad.addColorStop(1, '#1E2E56');
  } else {
    grad.addColorStop(0, '#2A76DC');
    grad.addColorStop(1, '#9CD2FF');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, 175);
  ctx.fillStyle = backdrop === 'stadium-night' ? '#175832' : '#289048';
  ctx.fillRect(0, 175, w, 24);
  ctx.fillStyle = backdrop === 'stadium-night' ? '#822E2A' : '#B84434';
  ctx.fillRect(0, 199, w, 57);
  paintScrollingTrackMarkers(ctx, phase, w);
}

function paintScrollingTrackMarkers(
  ctx: CanvasRenderingContext2D,
  phase: number,
  w: number,
): void {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 234);
  ctx.lineTo(w, 234);
  ctx.stroke();
  const scrollOffset = (phase * 140) % 35;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  for (let x = -scrollOffset; x < w + 35; x += 35) {
    ctx.fillRect(x, 239, 14, 3);
  }
}

function drawRasterToContext(
  ctx: CanvasRenderingContext2D,
  raster: RasterImage,
  opacity: number,
): void {
  if (typeof document === 'undefined') {
    return;
  }
  const offscreen = document.createElement('canvas');
  offscreen.width = raster.width;
  offscreen.height = raster.height;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) {
    return;
  }
  const imgData = offCtx.createImageData(raster.width, raster.height);
  imgData.data.set(raster.data);
  offCtx.putImageData(imgData, 0, 0);
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(offscreen, 0, 0);
  ctx.restore();
}

function drawFootOrbitTrails(
  ctx: CanvasRenderingContext2D,
  samples: readonly FootOrbitSample[],
  pose: ArticulatedPose,
): void {
  if (samples.length === 0) {
    return;
  }
  ctx.save();
  strokeClosedLoop(ctx, samples.map((s) => s.farAnkle), 'rgba(56, 189, 248, 0.75)');
  strokeClosedLoop(ctx, samples.map((s) => s.nearAnkle), 'rgba(251, 191, 36, 0.85)');
  drawJointDot(ctx, pose.farLeg.ballPoint, '#38BDF8', 4.0);
  drawJointDot(ctx, pose.nearLeg.ballPoint, '#FBBF24', 4.0);
  ctx.restore();
}

function strokeClosedLoop(
  ctx: CanvasRenderingContext2D,
  points: readonly Point2D[],
  strokeStyle: string,
): void {
  const first = points[0];
  if (!first) return;
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = 1.6;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (const pt of points) {
    ctx.lineTo(pt.x, pt.y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawSkeletonAndIkOverlay(
  ctx: CanvasRenderingContext2D,
  pose: ArticulatedPose,
): void {
  ctx.save();
  drawLimbChainOverlay(ctx, pose.farArm, '#38BDF8');
  drawLegAndRollingFootOverlay(ctx, pose.farLeg, '#38BDF8');
  drawUpperSpineAndNeckOverlay(ctx, pose);
  drawLegAndRollingFootOverlay(ctx, pose.nearLeg, '#FBBF24');
  drawLimbChainOverlay(ctx, pose.nearArm, '#FBBF24');
  ctx.restore();
}

function drawUpperSpineAndNeckOverlay(
  ctx: CanvasRenderingContext2D,
  pose: ArticulatedPose,
): void {
  drawSegmentLine(ctx, pose.pelvis, pose.collar, '#F43F5E');
  drawSegmentLine(ctx, pose.collar, pose.neck, '#A855F7');
  drawSegmentLine(ctx, pose.neck, pose.headCenter, '#EC4899');
  drawSegmentLine(ctx, pose.hairAnchor, pose.hairTip, '#FB7185');
  drawJointDot(ctx, pose.pelvis, '#F43F5E', 4.0);
  drawJointDot(ctx, pose.collar, '#A855F7', 3.6);
  drawJointDot(ctx, pose.neck, '#EC4899', 3.6);
  drawJointDot(ctx, pose.headCenter, '#F43F5E', 3.4);
}

function drawLimbChainOverlay(
  ctx: CanvasRenderingContext2D,
  limb: LimbKinematics,
  color: string,
): void {
  drawSegmentLine(ctx, limb.hipOrShoulder, limb.midJoint, color);
  drawSegmentLine(ctx, limb.midJoint, limb.endEffector, color);
  drawSegmentLine(ctx, limb.endEffector, limb.tipPoint, color);
  drawJointDot(ctx, limb.midJoint, color, 2.8);
  drawJointDot(ctx, limb.endEffector, color, 2.8);
}

function drawLegAndRollingFootOverlay(
  ctx: CanvasRenderingContext2D,
  leg: LimbKinematics,
  color: string,
): void {
  drawSegmentLine(ctx, leg.hipOrShoulder, leg.midJoint, color);
  drawSegmentLine(ctx, leg.midJoint, leg.endEffector, color);
  drawSegmentLine(ctx, leg.endEffector, leg.heelPoint, color);
  drawSegmentLine(ctx, leg.endEffector, leg.ballPoint, color);
  drawSegmentLine(ctx, leg.ballPoint, leg.tipPoint, color);
  drawJointDot(ctx, leg.midJoint, color, 3.0);
  drawJointDot(ctx, leg.endEffector, color, 2.8);
  const ballColor = leg.isGrounded ? '#22C55E' : color;
  drawJointDot(ctx, leg.ballPoint, ballColor, leg.isGrounded ? 4.2 : 3.0);
  drawJointDot(ctx, leg.tipPoint, ballColor, 2.6);
}

function drawSegmentLine(
  ctx: CanvasRenderingContext2D,
  a: Point2D,
  b: Point2D,
  color: string,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function drawJointDot(
  ctx: CanvasRenderingContext2D,
  pt: Point2D,
  color: string,
  radius: number,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
  ctx.fill();
}
