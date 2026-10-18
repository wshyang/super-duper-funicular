import type { Point } from '../shared/types';

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const normalizePhase = (phase: number): number => ((phase % 1) + 1) % 1;

export const easeInOutSine = (value: number): number => -(Math.cos(Math.PI * value) - 1) / 2;

export const add = (left: Point, right: Point): Point => ({
  x: left.x + right.x,
  y: left.y + right.y,
});

export const subtract = (left: Point, right: Point): Point => ({
  x: left.x - right.x,
  y: left.y - right.y,
});

export const multiply = (point: Point, amount: number): Point => ({
  x: point.x * amount,
  y: point.y * amount,
});

export const distance = (left: Point, right: Point): number =>
  Math.hypot(right.x - left.x, right.y - left.y);

export const rotate = (point: Point, angle: number): Point => ({
  x: point.x * Math.cos(angle) - point.y * Math.sin(angle),
  y: point.x * Math.sin(angle) + point.y * Math.cos(angle),
});

export interface TwoBoneResult {
  readonly joint: Point;
  readonly end: Point;
  readonly clamped: boolean;
}

export const solveTwoBone = (
  root: Point,
  target: Point,
  upperLength: number,
  lowerLength: number,
  bendSign: 1 | -1,
): TwoBoneResult => {
  const rawDistance = distance(root, target);
  const minReach = Math.abs(upperLength - lowerLength) + 0.75;
  const maxReach = upperLength + lowerLength - 0.75;
  const reach = clamp(rawDistance, minReach, maxReach);
  const directionX = rawDistance < 1e-6 ? 1 : (target.x - root.x) / rawDistance;
  const directionY = rawDistance < 1e-6 ? 0 : (target.y - root.y) / rawDistance;
  const along = (upperLength ** 2 - lowerLength ** 2 + reach ** 2) / (2 * reach);
  const height = Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2));
  const sideX = directionY;
  const sideY = -directionX;
  return {
    joint: {
      x: root.x + directionX * along + sideX * height * bendSign,
      y: root.y + directionY * along + sideY * height * bendSign,
    },
    end: { x: root.x + directionX * reach, y: root.y + directionY * reach },
    clamped: reach !== rawDistance,
  };
};
