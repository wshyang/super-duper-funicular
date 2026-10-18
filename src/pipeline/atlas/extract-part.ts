import type { CalibrationPose, PartExtractSpec, PartMeta, Point2D, Rgba } from '../../shared/atlas-types.js';
import { createRgba, isSubjectPixel, sampleBilinearRgba } from './image-io.js';

export const CANVAS = 160;
export const PROXIMAL_Y = 18;
const FEATHER_PX = 1.5;

export function lm(pose: CalibrationPose, id: string): Point2D {
  const raw = pose.landmarks[id];
  return { x: raw?.[0] ?? 0, y: raw?.[1] ?? 0 };
}

export function dist(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Distance from point p to segment ab (capped at the endpoints). */
export function distToSegment(p: Point2D, a: Point2D, b: Point2D): number {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const len2 = vx * vx + vy * vy || 1;
  const t = Math.min(1, Math.max(0, ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2));
  return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
}

function windowBox(a: Point2D, b: Point2D, pad: number): { minX: number; minY: number; maxX: number; maxY: number } {
  return {
    minX: Math.floor(Math.min(a.x, b.x) - pad),
    minY: Math.floor(Math.min(a.y, b.y) - pad),
    maxX: Math.ceil(Math.max(a.x, b.x) + pad),
    maxY: Math.ceil(Math.max(a.y, b.y) + pad),
  };
}

/** Semicircular pivot caps + feather, the retained PR #1 joint treatment. */
function capAlpha(x: number, y: number, halfW: number, yProx: number, yDist: number): number {
  const cap = (cy: number): number => {
    const beyond = y < cy ? cy - y : 0;
    if (beyond === 0) return 1;
    const d = Math.hypot(x - CANVAS / 2, beyond);
    return Math.min(1, Math.max(0, (halfW + FEATHER_PX - d) / FEATHER_PX));
  };
  const top = y < yProx ? cap(yProx) : 1;
  const bottom = y > yDist ? (() => {
    const beyond = y - yDist;
    const d = Math.hypot(x - CANVAS / 2, beyond);
    return Math.min(1, Math.max(0, (halfW + FEATHER_PX - d) / FEATHER_PX));
  })() : 1;
  return Math.min(top, bottom);
}

export interface ExtractResult {
  readonly part: Rgba;
  readonly meta: PartMeta;
  readonly keptRatio: number;
}

/**
 * Stage 3 canonical extraction: window from landmarks, nearest-bone material
 * ownership against competing axes, isotropic similarity rotation to canonical
 * orientation, semicircular pivot caps.
 */
interface OwnedSample {
  dx: number;
  dy: number;
  rgba: readonly number[];
}

/** Window scan: owned subject pixels in bone-local space + measured transverse spread. */
function collectOwnedPixels(
  plate: Rgba,
  pose: CalibrationPose,
  spec: PartExtractSpec,
  scale: number,
  a: Point2D,
  b: Point2D,
  box: { minX: number; minY: number; maxX: number; maxY: number },
  guessW: number,
  cos: number,
  sin: number,
): { keptPx: OwnedSample[]; touched: number; maxLat: number } {
  const axis: Point2D = { x: b.x - a.x, y: b.y - a.y };
  const axisLen = Math.hypot(axis.x, axis.y) || 1;
  const keptPx: OwnedSample[] = [];
  let touched = 0;
  let maxLat = 0;
  for (let dy = 0; dy < CANVAS; dy++) {
    for (let dx = 0; dx < CANVAS; dx++) {
      const lx = (dx - CANVAS / 2) / scale;
      const ly = (dy - PROXIMAL_Y) / scale;
      const sx = a.x + cos * lx + sin * ly;
      const sy = a.y - sin * lx + cos * ly;
      if (sx < box.minX || sx > box.maxX || sy < box.minY || sy > box.maxY) continue;
      touched++;
      const p: Point2D = { x: sx, y: sy };
      const src = sampleBilinearRgba(plate, sx, sy);
      if (!isSubjectPixel(src)) continue;
      const own = distToSegment(p, a, b);
      let owned = own <= guessW / scale + 6;
      for (const [ca, cb] of spec.competeWith) {
        if (distToSegment(p, lm(pose, ca), lm(pose, cb)) < own) owned = false;
      }
      if (!owned) continue;
      const lat = ((p.x - a.x) * -axis.y + (p.y - a.y) * axis.x) / axisLen;
      maxLat = Math.max(maxLat, Math.abs(lat));
      keptPx.push({ dx, dy, rgba: src });
    }
  }
  return { keptPx, touched, maxLat };
}

function stampPart(part: Rgba, keptPx: readonly OwnedSample[], halfW: number, yDist: number): number {
  let kept = 0;
  for (const kp of keptPx) {
    const alpha = capAlpha(kp.dx, kp.dy, halfW, PROXIMAL_Y, yDist);
    if (alpha <= 0) continue;
    const i = (kp.dy * CANVAS + kp.dx) * 4;
    part.data[i] = kp.rgba[0] ?? 0;
    part.data[i + 1] = kp.rgba[1] ?? 0;
    part.data[i + 2] = kp.rgba[2] ?? 0;
    part.data[i + 3] = Math.round((kp.rgba[3] ?? 255) * alpha);
    kept++;
  }
  return kept;
}

export function extractPart(
  plate: Rgba,
  pose: CalibrationPose,
  spec: PartExtractSpec,
  scale: number,
  zOrder: number,
): ExtractResult {
  const a = lm(pose, spec.proximal);
  const b = lm(pose, spec.distal);
  const srcLen = Math.max(8, dist(a, b));
  const restLength = Math.round(srcLen * scale);
  const guessW = Math.max(6, Math.round((restLength / 2) * 0.62 * spec.radiusFactor));
  const pad = (guessW / scale) * 1.6 + 8;
  const box = windowBox(a, b, pad);
  const part = createRgba(CANVAS, CANVAS);
  const angle = Math.atan2(b.x - a.x, b.y - a.y);
  const canonicalAngle = spec.canonical === 'down' ? 0 : Math.PI / 2;
  const rot = angle - canonicalAngle;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const yDist = PROXIMAL_Y + restLength;
  const scan = collectOwnedPixels(plate, pose, spec, scale, a, b, box, guessW, cos, sin);
  // Measured transverse half-width (P-R6): never inferred from bone length.
  const halfW = Math.min(46, Math.max(4, Math.ceil(scan.maxLat * scale) + 1));
  const kept = stampPart(part, scan.keptPx, halfW, yDist);
  const touched = scan.touched;
  return {
    part,
    keptRatio: touched > 0 ? kept / touched : 0,
    meta: {
      partId: spec.partId,
      sourcePose: spec.sourcePose,
      pivots: { proximal: { x: CANVAS / 2, y: PROXIMAL_Y }, distal: { x: CANVAS / 2, y: yDist } },
      restLength,
      halfWidth: halfW,
      canonical: spec.canonical,
      zOrder,
      relightScale: 1,
    },
  };
}
