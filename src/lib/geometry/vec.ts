export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export const vec = (x: number, y: number): Vec2 => ({ x, y });

export const add = (a: Vec2, b: Vec2): Vec2 => vec(a.x + b.x, a.y + b.y);

export const sub = (a: Vec2, b: Vec2): Vec2 => vec(a.x - b.x, a.y - b.y);

export const scale = (a: Vec2, s: number): Vec2 => vec(a.x * s, a.y * s);

export const distance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

export const normalize = (a: Vec2): Vec2 => {
  const length = Math.hypot(a.x, a.y);
  if (length < 1e-9) return vec(0, -1);
  return vec(a.x / length, a.y / length);
};

export const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;
