import { add, clamp, distance, normalize, scale, vec, type Vec2 } from "../geometry/vec.ts";

export interface TwoBoneSolution {
  readonly joint: Vec2;
  readonly end: Vec2;
  readonly isClamped: boolean;
}

export function solveTwoBone(
  origin: Vec2,
  target: Vec2,
  firstLength: number,
  secondLength: number,
  bendSign: 1 | -1,
): TwoBoneSolution {
  const offset = vec(target.x - origin.x, target.y - origin.y);
  const targetDistance = Math.hypot(offset.x, offset.y);
  const minimum = Math.abs(firstLength - secondLength) + 1e-4;
  const maximum = firstLength + secondLength - 1e-4;
  const reach = clamp(targetDistance, minimum, maximum);
  const direction = targetDistance < 1e-9 ? vec(0, -1) : normalize(offset);
  const along = (firstLength * firstLength - secondLength * secondLength + reach * reach) / (2 * reach);
  const height = Math.sqrt(Math.max(0, firstLength * firstLength - along * along));
  const normal = vec(-direction.y * bendSign, direction.x * bendSign);
  const joint = add(add(origin, scale(direction, along)), scale(normal, height));
  const end = add(origin, scale(direction, reach));
  return { joint, end, isClamped: Math.abs(reach - targetDistance) > 1e-9 };
}

export function overreach(
  origin: Vec2,
  target: Vec2,
  firstLength: number,
  secondLength: number,
): number {
  return Math.max(0, distance(origin, target) - (firstLength + secondLength));
}
