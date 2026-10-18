import type { Vec2 } from '../../shared/types.ts';

export const vec = (x: number, y: number): Vec2 => ({ x, y });
export const add = (a: Vec2, b: Vec2): Vec2 => vec(a.x + b.x, a.y + b.y);
export const sub = (a: Vec2, b: Vec2): Vec2 => vec(a.x - b.x, a.y - b.y);
export const scale = (a: Vec2, k: number): Vec2 => vec(a.x * k, a.y * k);
export const length = (a: Vec2): number => Math.hypot(a.x, a.y);
export const distance = (a: Vec2, b: Vec2): number => length(sub(a, b));

export function normalize(a: Vec2): Vec2 {
  const len = length(a);
  if (len === 0) return vec(0, 0);
  return vec(a.x / len, a.y / len);
}

export function rotate(a: Vec2, rad: number): Vec2 {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return vec(a.x * c - a.y * s, a.x * s + a.y * c);
}

export function rotateAbout(point: Vec2, center: Vec2, rad: number): Vec2 {
  return add(center, rotate(sub(point, center), rad));
}

/** Linear interpolation between two points; t=0 => a, t=1 => b. */
export const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => add(a, scale(sub(b, a), t));

/** Cubic Hermite on a scalar with endpoint tangents (used by swing recovery). */
export function hermite(p0: number, m0: number, p1: number, m1: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return h00 * p0 + h10 * m0 + h01 * p1 + h11 * m1;
}

export const clamp = (value: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, value));

/** Wrap any real into [0, 1). */
export const fract = (value: number): number => value - Math.floor(value);
