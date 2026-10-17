import type { Vec2 } from '../shared/types.ts';
import { add, clamp, distance, normalize, scale, sub, vec } from './vec.ts';

export interface TwoBoneSolution {
  readonly joint: Vec2;
  readonly end: Vec2;
  readonly clamped: boolean;
}

export interface TwoBoneRequest {
  readonly root: Vec2;
  readonly target: Vec2;
  readonly upperLength: number;
  readonly lowerLength: number;
  /** +1 bends the joint toward +x for a downward chain (right-facing knee/elbow forward). */
  readonly bendSign: 1 | -1;
}

/**
 * Analytical two-bone IK. The target is clamped to the reachable annulus so the
 * chain never detaches; the joint is placed on the bend side of the root-target axis.
 */
export const solveTwoBone = (request: TwoBoneRequest): TwoBoneSolution => {
  const { root, upperLength, lowerLength, bendSign } = request;
  const raw = sub(request.target, root);
  const rawDistance = distance(root, request.target);
  const minReach = Math.abs(upperLength - lowerLength) + 0.75;
  const maxReach = upperLength + lowerLength - 0.75;
  const clampedDistance = clamp(rawDistance, minReach, maxReach);
  const clamped = clampedDistance !== rawDistance;
  const direction = normalize(rawDistance < 1e-6 ? vec(1, 0) : raw);
  const end = add(root, scale(direction, clampedDistance));
  const along =
    (upperLength * upperLength - lowerLength * lowerLength + clampedDistance * clampedDistance) /
    (2 * clampedDistance);
  const height = Math.sqrt(Math.max(0, upperLength * upperLength - along * along));
  const side = { x: direction.y, y: -direction.x };
  const joint = add(add(root, scale(direction, along)), scale(side, height * bendSign));
  return { joint, end, clamped };
};

/** A chain's reach ratio in [0, 1]; 1 means fully extended. */
export const extensionRatio = (root: Vec2, target: Vec2, upper: number, lower: number): number =>
  clamp(distance(root, target) / (upper + lower), 0, 1);
