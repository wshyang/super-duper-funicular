export interface Vec2 { readonly x: number; readonly y: number }
export const vec = (x: number, y: number): Vec2 => ({ x, y });
export const add = (a: Vec2, b: Vec2): Vec2 => vec(a.x + b.x, a.y + b.y);
export const sub = (a: Vec2, b: Vec2): Vec2 => vec(a.x - b.x, a.y - b.y);
export const scale = (a: Vec2, s: number): Vec2 => vec(a.x * s, a.y * s);
export const len = (a: Vec2): number => Math.hypot(a.x, a.y);
export const dist = (a: Vec2, b: Vec2): number => len(sub(a, b));
export const polar = (origin: Vec2, angleDeg: number, length: number): Vec2 =>
  add(origin, vec(Math.sin(angleDeg * Math.PI / 180) * length, Math.cos(angleDeg * Math.PI / 180) * length));
