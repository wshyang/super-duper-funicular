import { add, len, scale, sub, vec, type Vec2 } from '../geometry/vec';
export interface IkResult { readonly joint: Vec2; readonly end: Vec2; readonly clamped: boolean }
/** Analytical 2-bone IK (PR#3/PR#1 synthesis). Knee/elbow bends toward `bend` (+1 fwd). */
export function solveTwoBoneIk(origin: Vec2, target: Vec2, upper: number, lower: number, bend: 1 | -1): IkResult {
  const to = sub(target, origin); const d = len(to);
  const maxD = upper + lower - 1e-6; const clamped = d > maxD || d < Math.abs(upper - lower);
  const dc = Math.min(Math.max(d, Math.abs(upper - lower) + 1e-6), maxD);
  const dir = d === 0 ? vec(1, 0) : scale(to, 1 / d);
  const cosA = (upper * upper + dc * dc - lower * lower) / (2 * upper * dc);
  const a = Math.acos(Math.min(1, Math.max(-1, cosA)));
  const base = Math.atan2(dir.y, dir.x); const ang = base + bend * a;
  const joint = add(origin, vec(Math.cos(ang) * upper, Math.sin(ang) * upper));
  return { joint, end: add(origin, scale(dir, dc)), clamped };
}
