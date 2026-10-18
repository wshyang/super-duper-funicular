import type { Vec2 } from '../../shared/types.ts';
import { add, distance, normalize, scale, sub, vec } from '../geometry/vec.ts';

export interface TwoBoneSolution {
  readonly mid: Vec2;
  readonly reached: boolean;
}

const EPSILON = 0.001;

/**
 * Analytic two-bone IK by circle intersection. `bend` = +1 places the mid
 * joint on the forward perpendicular (knee), -1 on the backward one (elbow).
 * Unreachable targets clamp along root→target while preserving bone lengths.
 */
export function solveTwoBone(root: Vec2, target: Vec2, len1: number, len2: number, bend: 1 | -1): TwoBoneSolution {
  const delta = sub(target, root);
  const raw = distance(root, target);
  const reach = len1 + len2 - EPSILON;
  const minimum = Math.abs(len1 - len2) + EPSILON;
  const dir = raw > 0 ? normalize(delta) : vec(1, 0);
  const dist = clampDistance(raw, minimum, reach);
  const reached = raw <= len1 + len2 && raw >= Math.abs(len1 - len2) && raw > 0;
  return { mid: midJoint(root, dir, dist, len1, len2, bend), reached };
}

function clampDistance(raw: number, minimum: number, reach: number): number {
  if (raw <= 0) return reach;
  return Math.min(reach, Math.max(minimum, raw));
}

function midJoint(root: Vec2, dir: Vec2, dist: number, len1: number, len2: number, bend: 1 | -1): Vec2 {
  const a = (len1 * len1 - len2 * len2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, len1 * len1 - a * a));
  const base = add(root, scale(dir, a));
  const perp = vec(dir.y, -dir.x);
  return add(base, scale(perp, bend * h));
}
