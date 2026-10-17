import { rotate, vec, type Vec2 } from "../geometry/vec.ts";
import type { BodyMetrics } from "../rig/body.ts";

/** Two rigid foot segments meeting at the ball of the foot. */
export interface FootJoints {
  readonly ankle: Vec2;
  readonly ball: Vec2;
  readonly heel: Vec2;
  readonly toe: Vec2;
  /** Lowest point of the sole: what is actually touching the ground. */
  readonly contact: Vec2;
}

/**
 * Lowest sole point relative to the ankle, for a hindfoot angle `hind` and a
 * forefoot angle `fore` (both radians, positive = toe up). The shoe's lowest
 * points are the heel and ball of the hindfoot and the toe of the forefoot.
 */
export function lowestSoleOffset(hind: number, fore: number, body: BodyMetrics): number {
  const heel = rotate(vec(body.footHeel, body.footSole), hind);
  const ball = rotate(vec(body.footBall, body.footSole), hind);
  const toe = rotate(vec(body.footToe - body.footBall, 0), fore);
  return Math.min(heel.y, ball.y, ball.y + toe.y);
}

/**
 * Foot joints for an ankle at y = 0. The caller lifts the result so the lowest
 * sole point sits on the ground line, which is what keeps a planted foot planted
 * no matter how the heel and toes roll.
 */
export function footJointsAtOrigin(hind: number, fore: number, body: BodyMetrics): FootJoints {
  const ankle = vec(0, 0);
  const heel = rotate(vec(body.footHeel, body.footSole), hind);
  const ball = rotate(vec(body.footBall, body.footSole), hind);
  const toeLocal = rotate(vec(body.footToe - body.footBall, 0), fore);
  const toe = vec(ball.x + toeLocal.x, ball.y + toeLocal.y);
  return { ankle, ball, heel, toe, contact: lowestOf(heel, ball, toe) };
}

/** Ties go to the ball: it is the pivot the foot rolls over, not the toe tip. */
const lowestOf = (heel: Vec2, ball: Vec2, toe: Vec2): Vec2 => {
  const lowest = Math.min(heel.y, ball.y, toe.y);
  if (ball.y <= lowest + 1e-9) return ball;
  if (toe.y <= lowest + 1e-9) return toe;
  return heel;
};

/** Foot joints for an ankle already placed in world space. */
export function footAt(ankle: Vec2, hind: number, fore: number, body: BodyMetrics): FootJoints {
  const local = footJointsAtOrigin(hind, fore, body);
  return {
    ankle,
    ball: vec(ankle.x + local.ball.x, ankle.y + local.ball.y),
    heel: vec(ankle.x + local.heel.x, ankle.y + local.heel.y),
    toe: vec(ankle.x + local.toe.x, ankle.y + local.toe.y),
    contact: vec(ankle.x + local.contact.x, ankle.y + local.contact.y),
  };
}

/** Places a foot so its lowest sole point is exactly on the ground. */
export function plantFoot(ankleX: number, hind: number, fore: number, body: BodyMetrics): FootJoints {
  const local = footJointsAtOrigin(hind, fore, body);
  const lift = -local.contact.y;
  const shift = vec(ankleX, lift);
  return {
    ankle: shift,
    ball: vec(local.ball.x + shift.x, local.ball.y + shift.y),
    heel: vec(local.heel.x + shift.x, local.heel.y + shift.y),
    toe: vec(local.toe.x + shift.x, local.toe.y + shift.y),
    contact: vec(local.contact.x + shift.x, local.contact.y + shift.y),
  };
}
