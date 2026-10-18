import type { Point2D } from '../shared/types.js';

export type JointBendDirection = 'knee-forward' | 'elbow-back';

export interface TwoBoneChainSpec {
  readonly upperLength: number;
  readonly lowerLength: number;
  readonly bendDirection: JointBendDirection;
}

export interface TwoBoneIkSolution {
  readonly root: Point2D;
  readonly midJoint: Point2D;
  readonly endEffector: Point2D;
  readonly upperAngleRad: number;
  readonly lowerAngleRad: number;
  readonly isClamped: boolean;
}

export function solveTwoBoneIk(
  root: Point2D,
  target: Point2D,
  chain: TwoBoneChainSpec,
): TwoBoneIkSolution {
  const dx = target.x - root.x;
  const dy = target.y - root.y;
  const rawDist = Math.hypot(dx, dy);
  const minReach = Math.abs(chain.upperLength - chain.lowerLength) + 0.05;
  const maxReach = chain.upperLength + chain.lowerLength - 0.05;
  const clampedDist = clampScalar(rawDist, minReach, maxReach);
  const baseAngle = rawDist > 1e-5 ? Math.atan2(dy, dx) : Math.PI / 2;
  const alpha = computeInteriorHipAngle(chain.upperLength, chain.lowerLength, clampedDist);
  const bendSign = chain.bendDirection === 'knee-forward' ? -1 : 1;
  const upperAngleRad = baseAngle + bendSign * alpha;
  const midJoint = projectPoint(root, upperAngleRad, chain.upperLength);
  const reachTarget = projectPoint(root, baseAngle, clampedDist);
  const lowerAngleRad = Math.atan2(
    reachTarget.y - midJoint.y,
    reachTarget.x - midJoint.x,
  );
  const endEffector = projectPoint(midJoint, lowerAngleRad, chain.lowerLength);
  return {
    root,
    midJoint,
    endEffector,
    upperAngleRad,
    lowerAngleRad,
    isClamped: rawDist > maxReach || rawDist < minReach,
  };
}

function computeInteriorHipAngle(l1: number, l2: number, d: number): number {
  const numerator = l1 * l1 + d * d - l2 * l2;
  const denominator = Math.max(1e-6, 2 * l1 * d);
  const cosAlpha = clampScalar(numerator / denominator, -1, 1);
  return Math.acos(cosAlpha);
}

export function projectPoint(origin: Point2D, angleRad: number, distance: number): Point2D {
  return {
    x: origin.x + Math.cos(angleRad) * distance,
    y: origin.y + Math.sin(angleRad) * distance,
  };
}

export function clampScalar(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
