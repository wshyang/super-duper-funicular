export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export function vec(x: number, y: number): Vec2 {
  return { x, y };
}

export function addVec(a: Vec2, b: Vec2): Vec2 {
  return vec(a.x + b.x, a.y + b.y);
}

export function subVec(a: Vec2, b: Vec2): Vec2 {
  return vec(a.x - b.x, a.y - b.y);
}

export function scaleVec(v: Vec2, factor: number): Vec2 {
  return vec(v.x * factor, v.y * factor);
}

export function lengthOf(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

export function distanceBetween(a: Vec2, b: Vec2): number {
  return lengthOf(subVec(a, b));
}

export function lerpVec(a: Vec2, b: Vec2, t: number): Vec2 {
  return vec(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
}

export function rotateVec(v: Vec2, angle: number): Vec2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return vec(v.x * cos - v.y * sin, v.x * sin + v.y * cos);
}

/**
 * Unit direction for a limb angle measured from straight down, positive towards +x (forward).
 * angle 0 points down (0, -1); angle +pi/2 points forward (1, 0).
 */
export function directionFromDown(angle: number): Vec2 {
  return vec(Math.sin(angle), -Math.cos(angle));
}

export function normalizeVec(v: Vec2): Vec2 {
  const length = lengthOf(v);
  if (length === 0) return vec(0, 0);
  return scaleVec(v, 1 / length);
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
