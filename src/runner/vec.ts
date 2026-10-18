import type { Vec2 } from '../shared/types.ts';

export const vec = (x: number, y: number): Vec2 => ({ x, y });

export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });

export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });

export const scale = (a: Vec2, factor: number): Vec2 => ({ x: a.x * factor, y: a.y * factor });

export const length = (a: Vec2): number => Math.hypot(a.x, a.y);

export const distance = (a: Vec2, b: Vec2): number => Math.hypot(b.x - a.x, b.y - a.y);

export const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

export const normalize = (a: Vec2): Vec2 => {
  const len = length(a);
  if (len < 1e-9) return { x: 0, y: 0 };
  return { x: a.x / len, y: a.y / len };
};

/** Perpendicular with positive x bias for a right-facing character. */
export const perpendicular = (a: Vec2): Vec2 => ({ x: -a.y, y: a.x });

export const rotate = (a: Vec2, angleRad: number): Vec2 => {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return { x: a.x * cos - a.y * sin, y: a.x * sin + a.y * cos };
};

export const rotateAbout = (point: Vec2, pivot: Vec2, angleRad: number): Vec2 =>
  add(pivot, rotate(sub(point, pivot), angleRad));

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Normalize a phase into [0, 1); non-finite input becomes 0 by contract. */
export const normalizePhase = (phase: number): number => {
  if (!Number.isFinite(phase)) return 0;
  return ((phase % 1) + 1) % 1;
};

export const smoothstep = (t: number): number => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};

export const easeInOutSine = (t: number): number => {
  const x = clamp(t, 0, 1);
  return 0.5 - 0.5 * Math.cos(Math.PI * x);
};
