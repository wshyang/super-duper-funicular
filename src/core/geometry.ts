import type { Point2D } from './types.js';

export const TAU = Math.PI * 2;

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Smooth 0→1 ease with zero slope at both ends, used for cycle transitions. */
export function smoothStep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

export function addPoint(a: Point2D, b: Point2D): Point2D {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function subPoint(a: Point2D, b: Point2D): Point2D {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scalePoint(a: Point2D, scale: number): Point2D {
  return { x: a.x * scale, y: a.y * scale };
}

export function distance(a: Point2D, b: Point2D): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function projectPoint(origin: Point2D, angleRad: number, length: number): Point2D {
  return { x: origin.x + Math.cos(angleRad) * length, y: origin.y + Math.sin(angleRad) * length };
}

export function angleOf(from: Point2D, to: Point2D): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

/** Shortest signed difference between two angles, in (−π, π]. */
export function angleDelta(a: number, b: number): number {
  let delta = (a - b) % TAU;
  if (delta > Math.PI) delta -= TAU;
  if (delta <= -Math.PI) delta += TAU;
  return delta;
}

/** Wraps any real phase into [0, 1). */
export function normalizePhase(phase: number): number {
  const wrapped = phase % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
}

/** Distance from point p to segment a→b. */
export function distanceToSegment(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq, 0, 1);
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Signed area of a polygon (positive when counter-clockwise in image space). */
export function polygonArea(points: readonly Point2D[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i] as Point2D;
    const b = points[(i + 1) % points.length] as Point2D;
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}
