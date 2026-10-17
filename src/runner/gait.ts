import { clamp } from "./vector.ts";

/**
 * Two legs share one cycle, offset by half a cycle. Each leg is in stance for
 * `stanceShare` of its cycle, and the other leg is in stance for the second half. When
 * neither foot is down there is a flight window, so `stanceShare` must be below 0.5.
 */
export interface GaitParameters {
  /** Half the foot travel across stance, in body units. The foot moves from +s to -s. */
  readonly strideHalfLength: number;
  /** Peak height of the swinging foot above the sole line, in body units. */
  readonly swingLift: number;
  /** Fraction of each leg's cycle spent on the ground, between 0.2 and 0.45. */
  readonly stanceShare: number;
  /** Hip height at touchdown and toe-off, as a fraction of full leg length. */
  readonly edgeReachRatio: number;
  /** Hip height at mid-stance (leg compression), as a fraction of full leg length. */
  readonly midStanceReachRatio: number;
  /** Extra hip height at the top of each flight window, in body units. */
  readonly flightBounce: number;
  /** Forward torso lean in radians. */
  readonly torsoLean: number;
  /** Shoulder swing amplitude in radians. */
  readonly armSwing: number;
  /** Elbow flexion in radians. */
  readonly elbowFlex: number;
}

export const DEFAULT_GAIT: GaitParameters = {
  strideHalfLength: 10,
  swingLift: 14,
  stanceShare: 0.4,
  edgeReachRatio: 0.97,
  midStanceReachRatio: 0.94,
  flightBounce: 4,
  torsoLean: 0.22,
  armSwing: 0.95,
  elbowFlex: 1.6,
};

/** Height of the sole line above the ground, in body units. A planted ankle sits this high. */
export const SOLE_LINE = 3;

export interface LegSample {
  readonly inStance: boolean;
  /** Progress through the current stance or swing window, 0 to 1. */
  readonly progress: number;
  /** Ankle position relative to the hip joint, in body units (+x forward, +y up). */
  readonly ankleOffset: { readonly x: number; readonly y: number };
  /** Foot rotation in radians; negative tips the toe down. */
  readonly footAngle: number;
}

export interface GaitSample {
  readonly phase: number;
  readonly hipHeight: number;
  readonly near: LegSample;
  readonly far: LegSample;
  readonly torsoLean: number;
  /** Near-side shoulder angle from vertical (positive = forward). */
  readonly nearShoulder: number;
  /** Far-side shoulder angle from vertical (positive = forward). */
  readonly farShoulder: number;
  readonly elbowFlex: number;
}

const FULL_CYCLE = 1;
const HALF_CYCLE = 0.5;

export function wrapPhase(phase: number): number {
  const wrapped = phase % FULL_CYCLE;
  return wrapped < 0 ? wrapped + FULL_CYCLE : wrapped;
}

/** Local progress within a window that starts at `start` and lasts `length`, or null outside it. */
export function windowProgress(phase: number, start: number, length: number): number | null {
  const offset = wrapPhase(phase - start);
  return offset < length ? offset / length : null;
}

/** Stance foot travels from +s (touchdown) to -s (toe-off) along the ground. */
export function stanceAnkleX(progress: number, gait: GaitParameters): number {
  return gait.strideHalfLength * (1 - 2 * progress);
}

/** Swing foot travels from -s (toe-off) to +s (touchdown) with a sine lift. */
export function swingAnkleX(progress: number, gait: GaitParameters): number {
  return gait.strideHalfLength * (2 * progress - 1);
}

export function swingLiftAt(progress: number, gait: GaitParameters): number {
  return gait.swingLift * Math.sin(Math.PI * progress);
}

/** Hip height while a foot is planted: a parabola, lowest at mid-stance and equal at touchdown. */
export function stanceHipHeight(ankleX: number, legLength: number, gait: GaitParameters): number {
  const edge = gait.edgeReachRatio * legLength;
  const middle = gait.midStanceReachRatio * legLength;
  const curvature = (edge - middle) / (gait.strideHalfLength * gait.strideHalfLength);
  return middle + curvature * ankleX * ankleX;
}

/** Hip height during flight: starts and ends at touchdown height, then bounces. */
export function flightHipHeight(progress: number, legLength: number, gait: GaitParameters): number {
  return gait.edgeReachRatio * legLength + gait.flightBounce * Math.sin(Math.PI * progress);
}

function flightWindowLength(gait: GaitParameters): number {
  return HALF_CYCLE - gait.stanceShare;
}

/** Progress inside a flight window (both feet off the ground), or null outside flight. */
export function flightProgress(phase: number, gait: GaitParameters): number | null {
  const first = windowProgress(phase, gait.stanceShare, flightWindowLength(gait));
  if (first !== null) return first;
  return windowProgress(phase, HALF_CYCLE + gait.stanceShare, flightWindowLength(gait));
}

/**
 * Hip height for the whole body. The planted leg, if any, sets it. In flight the height
 * follows a bounce between the two touchdown heights.
 */
export function hipHeightAt(phase: number, legLength: number, gait: GaitParameters): number {
  const nearStance = windowProgress(phase, 0, gait.stanceShare);
  if (nearStance !== null) return stanceHipHeight(stanceAnkleX(nearStance, gait), legLength, gait);
  const farStance = windowProgress(phase, HALF_CYCLE, gait.stanceShare);
  if (farStance !== null) return stanceHipHeight(stanceAnkleX(farStance, gait), legLength, gait);
  return flightHipHeight(flightProgress(phase, gait) ?? 0, legLength, gait);
}

/**
 * Samples one leg given the body's hip height. `legPhase` is the leg's own cycle position in
 * [0, 1). The hip belongs to the body, so the caller computes it once per cycle position.
 */
export function sampleLeg(legPhase: number, hipHeight: number, gait: GaitParameters): LegSample {
  const stance = windowProgress(legPhase, 0, gait.stanceShare);
  if (stance !== null) {
    const ankleX = stanceAnkleX(stance, gait);
    return { inStance: true, progress: stance, ankleOffset: { x: ankleX, y: SOLE_LINE - hipHeight }, footAngle: 0 };
  }
  const progress = clamp((legPhase - gait.stanceShare) / (1 - gait.stanceShare), 0, 1);
  return {
    inStance: false,
    progress,
    ankleOffset: { x: swingAnkleX(progress, gait), y: SOLE_LINE + swingLiftAt(progress, gait) - hipHeight },
    footAngle: -0.5 * Math.sin(Math.PI * progress),
  };
}

/** Arms swing against their same-side leg: the near arm is back when the near leg is forward. */
export function shoulderAngle(phase: number, gait: GaitParameters, armOffset: number): number {
  return -gait.armSwing * Math.cos(2 * Math.PI * (phase + armOffset));
}

/** Samples the whole body at one cycle position: phase in [0, 1) to hip, both legs, torso, arms. */
export function sampleGait(phase: number, legLength: number, gait: GaitParameters): GaitSample {
  const wrapped = wrapPhase(phase);
  const hipHeight = hipHeightAt(wrapped, legLength, gait);
  return {
    phase: wrapped,
    hipHeight,
    near: sampleLeg(wrapped, hipHeight, gait),
    far: sampleLeg(wrapPhase(wrapped + HALF_CYCLE), hipHeight, gait),
    torsoLean: gait.torsoLean + 0.03 * Math.cos(4 * Math.PI * wrapped),
    nearShoulder: shoulderAngle(wrapped, gait, 0),
    farShoulder: shoulderAngle(wrapped, gait, HALF_CYCLE),
    elbowFlex: gait.elbowFlex + 0.15 * Math.sin(2 * Math.PI * wrapped),
  };
}
