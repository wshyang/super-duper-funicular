/** A point or vector in world space. +x is forward, +y is up, ground is y = 0. */
export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export const vec = (x: number, y: number): Vec2 => ({ x, y });

export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });

export const subtract = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });

export const scale = (a: Vec2, factor: number): Vec2 => ({ x: a.x * factor, y: a.y * factor });

export const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

export const length = (a: Vec2): number => Math.hypot(a.x, a.y);

export const distance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

export const normalize = (a: Vec2): Vec2 => {
  const magnitude = length(a);
  if (magnitude < 1e-12) return { x: 0, y: 0 };
  return { x: a.x / magnitude, y: a.y / magnitude };
};

/** Rotate counter-clockwise by `radians` in a y-up coordinate system. */
export const rotate = (a: Vec2, radians: number): Vec2 => {
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return { x: a.x * cosine - a.y * sine, y: a.x * sine + a.y * cosine };
};

export const rotateAround = (a: Vec2, pivot: Vec2, radians: number): Vec2 =>
  add(pivot, rotate(subtract(a, pivot), radians));

/** Unit vector for an angle measured from straight down, positive towards +x (forward). */
export const fromDown = (radians: number): Vec2 => ({ x: Math.sin(radians), y: -Math.cos(radians) });

/** Angle of a direction measured from straight down, positive towards +x. */
export const angleFromDown = (direction: Vec2): number => Math.atan2(direction.x, -direction.y);

export const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

export const smoothstep = (edge0: number, edge1: number, value: number): number => {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Shortest signed difference between two angles, in radians. */
export const angleDelta = (from: number, to: number): number => {
  let difference = (to - from) % (Math.PI * 2);
  if (difference > Math.PI) difference -= Math.PI * 2;
  if (difference < -Math.PI) difference += Math.PI * 2;
  return difference;
};
