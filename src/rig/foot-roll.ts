import { clamp, degToRad, lerp, projectPoint, smoothStep } from '../core/geometry.js';
import type { FootRoll, Point2D } from '../core/types.js';

export interface FootGeometry {
  readonly rearfootLength: number;
  readonly forefootLength: number;
  readonly heelLength: number;
  readonly ankleHeight: number;
  /** Sole capsule radius; the shoe's outline must not pass below the ground line. */
  readonly soleRadius: number;
}

export const DEFAULT_FOOT: FootGeometry = {
  rearfootLength: 19,
  forefootLength: 12,
  heelLength: 8,
  ankleHeight: 9,
  soleRadius: 5,
};

/** Angle of the sole below horizontal, in radians, at stance progress `s` ∈ [0,1). */
export function stancePitchRad(s: number): number {
  if (s < 0.55) return 0;
  if (s < 0.88) return -degToRad(28) * smoothStep((s - 0.55) / 0.33);
  return lerp(-degToRad(28), -degToRad(46), smoothStep((s - 0.88) / 0.12));
}

/** Angle of the sole during swing progress `t` ∈ [0,1): dorsiflex, then neutral for landing. */
export function swingPitchRad(t: number): number {
  if (t < 0.5) return lerp(-degToRad(46), degToRad(10), smoothStep(t / 0.5));
  return lerp(degToRad(10), 0, smoothStep((t - 0.5) / 0.5));
}

/**
 * Builds the three plantar landmarks from an ankle position and a sole pitch.
 * Positive pitch raises the heel; negative pitch raises the toe (plantarflexion).
 */
export function solveFoot(
  ankle: Point2D,
  pitchRad: number,
  geometry: FootGeometry,
  groundY: number,
  contact: FootRoll['contact'],
): FootRoll {
  const down = degToRad(90);
  const clearance = groundY - geometry.soleRadius;
  const ball = projectPoint(ankle, down + pitchRad, geometry.ankleHeight);
  const toe = projectPoint(ball, pitchRad, geometry.forefootLength);
  const heel = projectPoint(ankle, down + pitchRad, -geometry.ankleHeight);
  const heelTail = projectPoint(heel, pitchRad + Math.PI, geometry.heelLength);
  return {
    ankle,
    ball: clampPoint(ball, clearance),
    toe: clampPoint(toe, clearance),
    heel: clampPoint(heelTail, clearance),
    contact,
  };
}

/** Keeps a capsule centre above the ground line by its own radius. */
function clampPoint(point: Point2D, limitY: number): Point2D {
  return point.y <= limitY ? point : { x: point.x, y: limitY };
}

/**
 * Inverse of `solveFoot` for a planted foot: given the contact point and the
 * sole pitch, returns the ankle that puts the support geometry exactly on the
 * ground line. Solving contact-first is what keeps the sole on the ground during
 * heel-off and toe-off instead of floating as the foot rotates.
 */
export function solveFootFromContact(
  contact: Point2D,
  pitchRad: number,
  geometry: FootGeometry,
): Point2D {
  return projectPoint(contact, -Math.PI / 2 - pitchRad, geometry.ankleHeight);
}

/** Lowest point of the three sole landmarks, used to keep a swing foot clear. */
export function lowestFootPoint(roll: { ball: Point2D; toe: Point2D; heel: Point2D }): number {
  return Math.max(roll.ball.y, roll.toe.y, roll.heel.y);
}

export function describeContact(stance: boolean, s: number): FootRoll['contact'] {
  if (!stance) return 'swing';
  const progress = clamp(s, 0, 1);
  if (progress < 0.55) return 'stance';
  return progress < 0.88 ? 'heel-off' : 'toe-off';
}
