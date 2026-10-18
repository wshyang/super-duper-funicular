import type { MotionProfile, SupportState, Vec2 } from '../../shared/types.ts';
import { clamp, fract, hermite } from '../geometry/vec.ts';
import { BODY } from '../rig/body.ts';

export interface FootState {
  /** Ankle target in rig space (ground line = y 0, +y down). */
  readonly ankle: Vec2;
  /** Shoe pitch: 0 sole flat, positive heel-up (push-off), negative toe-up. */
  readonly pitch: number;
  /** World x of the planted toe while the heel rotates off the ground. */
  readonly plantedToeX: number | null;
  readonly inStance: boolean;
}

const HEEL_OFF_START = 0.62;
const WALK_SETTLE_DUTY = 0.18;
const HEEL_STRIKE_RAD = (-15 * Math.PI) / 180;
const RUN_DORSIFLEX_RAD = -0.35;
const WALK_DORSIFLEX_RAD = -0.12;

/**
 * One leg's foot/ankle trajectory for a leg phase p ∈ [0,1).
 * Stance: sole reference travels backwards on the ground with a midfoot-style
 * roll (flat → sole roll → heel-off about a planted toe → toe-off); walking
 * adds a heel-strike settle (−15° → flat) in early stance.
 * Swing: starts exactly at the rotated toe-off ankle (continuity), cubic
 * Hermite recovery backwards-matched, vertical lift −lift·sin²(πu) on top of
 * the decaying toe-off height, pitch releases from heel-off through
 * dorsiflexion to flat (run) or heel-strike preparation (walk families).
 */
export function footState(legPhase: number, profile: MotionProfile): FootState {
  const p = fract(legPhase);
  if (p < profile.stanceDuty) return stance(p / profile.stanceDuty, profile);
  return swing((p - profile.stanceDuty) / (1 - profile.stanceDuty), profile);
}

const FLAT_ANKLE_Y = -BODY.footHeight;
/** Ankle height when the heel strikes first at −15° (walk families). */
const HEEL_STRIKE_ANKLE_Y = FLAT_ANKLE_Y + (BODY.footLength * 0.5) * Math.sin(HEEL_STRIKE_RAD);

function stance(s: number, profile: MotionProfile): FootState {
  const x = profile.footTravelPx * (0.5 - s);
  if (isWalking(profile) && s < WALK_SETTLE_DUTY) {
    const settle = s / WALK_SETTLE_DUTY;
    const y = HEEL_STRIKE_ANKLE_Y + (FLAT_ANKLE_Y - HEEL_STRIKE_ANKLE_Y) * settle;
    return { ankle: { x, y }, pitch: HEEL_STRIKE_RAD * (1 - settle), plantedToeX: null, inStance: true };
  }
  if (s < HEEL_OFF_START) {
    return { ankle: { x, y: FLAT_ANKLE_Y }, pitch: -0.26 * Math.sin(Math.PI * (s / HEEL_OFF_START)), plantedToeX: null, inStance: true };
  }
  const t = (s - HEEL_OFF_START) / (1 - HEEL_OFF_START);
  const pitch = t * maxHeelOffRad(profile);
  const toeX = x + BODY.footLength * 0.5;
  return { ankle: ankleAboutToe(toeX, pitch), pitch, plantedToeX: toeX, inStance: true };
}

function swing(u: number, profile: MotionProfile): FootState {
  const toeOff = stance(1 - 1e-9, profile);
  const travel = profile.footTravelPx;
  const tangent = -travel * 0.55;
  const x = hermite(toeOff.ankle.x, tangent, travel * 0.5, tangent, u);
  const decay = (1 - u) ** 2;
  const landing = isWalking(profile) ? HEEL_STRIKE_ANKLE_Y : FLAT_ANKLE_Y;
  const y = toeOff.ankle.y * decay + landing * (1 - decay) - profile.footLiftPx * Math.sin(Math.PI * u) ** 2;
  return { ankle: { x, y }, pitch: swingPitch(u, profile), plantedToeX: null, inStance: false };
}

function swingPitch(u: number, profile: MotionProfile): number {
  const release = maxHeelOffRad(profile) * (1 - clamp(u / 0.25, 0, 1));
  if (u < 0.25) return release;
  const mid = (u - 0.25) / 0.45;
  if (u < 0.7) return (isWalking(profile) ? WALK_DORSIFLEX_RAD : RUN_DORSIFLEX_RAD) * Math.sin(Math.PI * clamp(mid, 0, 1));
  if (isWalking(profile)) return HEEL_STRIKE_RAD * ((u - 0.7) / 0.3);
  return 0;
}

export function maxHeelOffRad(profile: MotionProfile): number {
  return isWalking(profile) ? (40 * Math.PI) / 180 : (52 * Math.PI) / 180;
}

const isWalking = (profile: MotionProfile): boolean => profile.doubleSupportDuty > 0;

/** Ankle position for a shoe rotating about its toe planted at (toeX, 0). */
function ankleAboutToe(toeX: number, pitch: number): Vec2 {
  const dx = -BODY.footLength * 0.5;
  const dy = -BODY.footHeight;
  const c = Math.cos(pitch);
  const s = Math.sin(pitch);
  return { x: toeX + dx * c - dy * s, y: dx * s + dy * c };
}

/** Support state of the whole body from the two legs' stance flags. */
export function supportState(nearInStance: boolean, farInStance: boolean): SupportState {
  if (nearInStance && farInStance) return 'double-support';
  if (nearInStance) return 'near-stance';
  if (farInStance) return 'far-stance';
  return 'flight';
}
