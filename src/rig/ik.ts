import { clamp, distance, projectPoint, angleOf } from '../core/geometry.js';
import type { Point2D } from '../core/types.js';

export interface TwoBoneSolution {
  readonly root: Point2D;
  readonly mid: Point2D;
  readonly tip: Point2D;
  readonly upperAngleRad: number;
  readonly lowerAngleRad: number;
  readonly isClamped: boolean;
}

export type BendSign = 1 | -1;

/**
 * Law-of-cosines two-bone IK. `bendSign = -1` puts the mid joint on the
 * clockwise side of the root→target ray (knee forward for a right-facing
 * figure), `+1` on the other side.
 */
export function solveTwoBone(
  root: Point2D,
  target: Point2D,
  upperLength: number,
  lowerLength: number,
  bendSign: BendSign,
): TwoBoneSolution {
  const rawDistance = distance(root, target);
  const minReach = Math.abs(upperLength - lowerLength) + 0.01;
  const maxReach = upperLength + lowerLength - 0.01;
  const reach = clamp(rawDistance, minReach, maxReach);
  const baseAngle = rawDistance > 1e-5 ? angleOf(root, target) : Math.PI / 2;
  const interior = clamp(
    (upperLength * upperLength + reach * reach - lowerLength * lowerLength) / (2 * upperLength * reach),
    -1,
    1,
  );
  const upperAngleRad = baseAngle + bendSign * Math.acos(interior);
  const mid = projectPoint(root, upperAngleRad, upperLength);
  const tip = projectPoint(mid, angleOf(mid, target), lowerLength);
  return {
    root,
    mid,
    tip,
    upperAngleRad,
    lowerAngleRad: angleOf(mid, tip),
    isClamped: rawDistance > maxReach || rawDistance < minReach,
  };
}
