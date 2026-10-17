import { addVec, clamp, distanceBetween, normalizeVec, scaleVec, subVec, vec, type Vec2 } from "./vector.ts";

export interface BoneLengths {
  readonly first: number;
  readonly second: number;
}

export interface TwoBoneSolution {
  readonly joint: Vec2;
  readonly end: Vec2;
}

/** Degenerate-case margin so the triangle never collapses to zero area. */
const EPSILON = 1e-6;

/**
 * Analytic two-bone IK. `preferredSide` is +1 when the joint should bulge towards +x (knees
 * point forward) and -1 for the opposite side. Targets beyond reach are clamped onto the reach
 * circle, so the returned end point is the closest reachable point.
 */
export function solveTwoBone(root: Vec2, target: Vec2, bones: BoneLengths, preferredSide: 1 | -1): TwoBoneSolution {
  const direction = normalizeVec(subVec(target, root));
  const reach = clampReach(distanceBetween(root, target), bones);
  const along = (bones.first * bones.first - bones.second * bones.second + reach * reach) / (2 * reach);
  const offset = Math.sqrt(Math.max(0, bones.first * bones.first - along * along));
  const base = addVec(root, scaleVec(direction, along));
  const perpendicular = vec(-direction.y, direction.x);
  const joint = pickSide(base, scaleVec(perpendicular, offset), preferredSide);
  const end = addVec(root, scaleVec(direction, reach));
  return { joint, end };
}

function clampReach(distance: number, bones: BoneLengths): number {
  const minimum = Math.abs(bones.first - bones.second) + EPSILON;
  const maximum = bones.first + bones.second - EPSILON;
  return clamp(distance, minimum, maximum);
}

function pickSide(base: Vec2, offset: Vec2, preferredSide: 1 | -1): Vec2 {
  const forward = addVec(base, offset);
  const backward = subVec(base, offset);
  return preferredSide > 0 ? (forward.x >= backward.x ? forward : backward) : (forward.x <= backward.x ? forward : backward);
}
