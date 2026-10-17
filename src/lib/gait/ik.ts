import { add, clamp, distance, normalize, scale, vec, type Vec2 } from "../geometry/vec.ts";

export interface TwoBoneSolution {
  readonly joint: Vec2;
  readonly end: Vec2;
  readonly reach: number;
  readonly targetDistance: number;
  readonly isClamped: boolean;
}

/**
 * Analytic two-bone IK. `bendSign` selects the solution side: +1 puts the knee
 * forward for a leg whose target is below the hip, which is the only valid
 * knee direction for a runner.
 */
export function solveTwoBone(
  origin: Vec2,
  target: Vec2,
  firstLength: number,
  secondLength: number,
  bendSign: 1 | -1,
): TwoBoneSolution {
  const offset = { x: target.x - origin.x, y: target.y - origin.y };
  const targetDistance = Math.hypot(offset.x, offset.y);
  const minimum = Math.abs(firstLength - secondLength) + 1e-4;
  const maximum = firstLength + secondLength - 1e-4;
  const reach = clamp(targetDistance, minimum, maximum);
  const isClamped = Math.abs(reach - targetDistance) > 1e-9;
  const direction = targetDistance < 1e-9 ? vec(0, -1) : normalize(offset);
  const along = (firstLength * firstLength - secondLength * secondLength + reach * reach) / (2 * reach);
  const height = Math.sqrt(Math.max(0, firstLength * firstLength - along * along));
  const normal = vec(-direction.y * bendSign, direction.x * bendSign);
  const joint = add(add(origin, scale(direction, along)), scale(normal, height));
  const end = add(origin, scale(direction, reach));
  return { joint, end, reach, targetDistance, isClamped };
}

/** Interior angle between the two bones, 0 when straight, pi when folded back. */
export function interiorAngle(first: Vec2, joint: Vec2, second: Vec2): number {
  const a = normalize({ x: first.x - joint.x, y: first.y - joint.y });
  const b = normalize({ x: second.x - joint.x, y: second.y - joint.y });
  return Math.acos(clamp(a.x * b.x + a.y * b.y, -1, 1));
}

/** Servo helper used by the diagnostics: how far a target is beyond reach. */
export function overreach(origin: Vec2, target: Vec2, firstLength: number, secondLength: number): number {
  return Math.max(0, distance(origin, target) - (firstLength + secondLength));
}
