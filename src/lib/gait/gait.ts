import { clamp, smoothstep, vec, type Vec2 } from "../geometry/vec.ts";
import type { BodyMetrics } from "../rig/body.ts";
import { lowestSoleOffset } from "./foot.ts";

export interface GaitParameters {
  /** Duration of one full stride (both feet), in seconds. */
  readonly cycleSeconds: number;
  /** Ground distance covered in one full stride, in body heights. */
  readonly strideLength: number;
  /** Share of one leg's cycle spent on the ground. Must be below 0.5. */
  readonly dutyFactor: number;
  /** Ankle x at touchdown, relative to the pelvis (positive is forward). */
  readonly contactOffset: number;
  /** Extra hip drop at mid-stance, from leg-spring compression. */
  readonly stanceCompression: number;
  /** Rise of the pelvis above contact height at mid-flight. */
  readonly flightRise: number;
  /** Forward torso lean, radians. */
  readonly lean: number;
  /** How far the support foot trails behind the pelvis: the "falling" line. */
  readonly fall: number;
  /** Shoulder swing amplitude, radians. */
  readonly armSwing: number;
  /** Shoulder midpoint offset, radians (negative = slightly behind). */
  readonly armBias: number;
  /** Mean elbow flexion, radians. */
  readonly elbowFlex: number;
  /** Visual multiplier on the physically derived vertical travel. */
  readonly bobGain: number;
}

/** User-facing controls; the app never edits the physical parameters directly. */
export interface GaitControls {
  readonly cadence: number;
  readonly strideLength: number;
  readonly dutyFactor: number;
  readonly lean: number;
  readonly armSwing: number;
  readonly bobGain: number;
}

export const DEFAULT_CONTROLS: GaitControls = {
  cadence: 180,
  strideLength: 1,
  dutyFactor: 0.36,
  lean: 0.22,
  armSwing: 0.8,
  bobGain: 1,
};

export const GAIT_LIMITS = {
  cadence: { min: 120, max: 230 },
  strideLength: { min: 0.5, max: 1.2 },
  dutyFactor: { min: 0.28, max: 0.46 },
  lean: { min: 0, max: 0.34 },
  armSwing: { min: 0.2, max: 1.05 },
  bobGain: { min: 0, max: 2.2 },
} as const;

/** Foot angles at the landmarks, in radians. Positive = toes up. */
export const FOOT_ANGLES = {
  contactHind: -0.03,
  contactFore: 0,
  flatHind: 0,
  toeOffHind: -0.72,
  toeOffFore: -0.22,
  swingClearHind: 0.18,
  swingClearFore: 0.06,
} as const;

export function resolveGait(controls: GaitControls): GaitParameters {
  const cadence = clamp(controls.cadence, GAIT_LIMITS.cadence.min, GAIT_LIMITS.cadence.max);
  return {
    cycleSeconds: 120 / cadence,
    strideLength: clamp(controls.strideLength, GAIT_LIMITS.strideLength.min, GAIT_LIMITS.strideLength.max),
    dutyFactor: clamp(controls.dutyFactor, GAIT_LIMITS.dutyFactor.min, GAIT_LIMITS.dutyFactor.max),
    contactOffset: 0,
    stanceCompression: 0.026,
    flightRise: 0.028,
    lean: clamp(controls.lean, GAIT_LIMITS.lean.min, GAIT_LIMITS.lean.max),
    fall: 0.03 + 0.055 * clamp(controls.lean, GAIT_LIMITS.lean.min, GAIT_LIMITS.lean.max),
    armSwing: clamp(controls.armSwing, GAIT_LIMITS.armSwing.min, GAIT_LIMITS.armSwing.max),
    armBias: -0.06,
    elbowFlex: 1.72,
    bobGain: clamp(controls.bobGain, GAIT_LIMITS.bobGain.min, GAIT_LIMITS.bobGain.max),
  };
}

export const wrapPhase = (phase: number): number => {
  const wrapped = phase % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
};

/** Ground speed in body heights per second. */
export const groundSpeed = (gait: GaitParameters): number => gait.strideLength / gait.cycleSeconds;

export interface LegSample {
  readonly localPhase: number;
  readonly inStance: boolean;
  /** Progress through stance or swing, 0..1. */
  readonly progress: number;
  /** Ankle position relative to the ground, x measured from the pelvis. */
  readonly ankle: Vec2;
  /** Hindfoot angle: positive tips the toes up, negative raises the heel. */
  readonly hindAngle: number;
  /** Forefoot angle at the ball, in world terms. */
  readonly foreAngle: number;
}

/** Half the ground travel of one foot while it is planted. */
export const stanceHalfReach = (gait: GaitParameters): number => (gait.strideLength * gait.dutyFactor) / 2;

const blend = (from: number, to: number, t: number): number => from + (to - from) * smoothstep(0, 1, t);

/**
 * Foot roll through stance. The runner lands on the midfoot (near-flat, a
 * touch toe-down), the heel settles, the foot lies flat while the body passes
 * over it, then the heel peels off the ground while the toes stay planted, and
 * finally the toes push off.
 */
export function stanceAngles(progress: number): { hind: number; fore: number } {
  const { contactHind, flatHind, toeOffHind, toeOffFore } = FOOT_ANGLES;
  if (progress < 0.12) return { hind: blend(contactHind, flatHind, progress / 0.12), fore: 0 };
  if (progress < 0.56) return { hind: flatHind, fore: 0 };
  if (progress < 0.86) return { hind: blend(flatHind, toeOffHind, (progress - 0.56) / 0.3), fore: 0 };
  return {
    hind: blend(toeOffHind, toeOffHind * 1.05, (progress - 0.86) / 0.14),
    fore: blend(0, toeOffFore, (progress - 0.86) / 0.14),
  };
}

/** Foot angles through swing: release, dorsiflex to clear, then set up to land. */
export function swingAngles(progress: number): { hind: number; fore: number } {
  const { toeOffHind, toeOffFore, swingClearHind, swingClearFore, contactHind, contactFore } = FOOT_ANGLES;
  if (progress < 0.42) {
    const t = (progress / 0.42) * 0.5;
    return { hind: blend(toeOffHind, swingClearHind, t), fore: blend(toeOffFore, swingClearFore, t) };
  }
  if (progress < 0.78) {
    return { hind: blend(swingClearHind, contactHind, (progress - 0.42) / 0.36), fore: blend(swingClearFore, contactFore, (progress - 0.42) / 0.36) };
  }
  return { hind: contactHind, fore: contactFore };
}

/** Ankle path through stance: the foot is planted and slides back under the body. */
export function stanceAnkle(gait: GaitParameters, progress: number, body: BodyMetrics): Vec2 {
  const reach = stanceHalfReach(gait);
  const angles = stanceAngles(progress);
  const x = gait.contactOffset + reach - 2 * reach * progress - gait.fall;
  return vec(x, -lowestSoleOffset(angles.hind, angles.fore, body));
}

export function bezier(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const u = 1 - t;
  const b0 = u * u * u;
  const b1 = 3 * u * u * t;
  const b2 = 3 * u * t * t;
  const b3 = t * t * t;
  return vec(b0 * p0.x + b1 * p1.x + b2 * p2.x + b3 * p3.x, b0 * p0.y + b1 * p1.y + b2 * p2.y + b3 * p3.y);
}

/** Ankle path through swing: heel kick behind, knee-drive apex ahead. */
export function swingAnkle(gait: GaitParameters, progress: number, body: BodyMetrics): Vec2 {
  const toeOff = stanceAnkle(gait, 1, body);
  const contact = stanceAnkle(gait, 0, body);
  const kick = vec(toeOff.x - 0.02, 0.42);
  const drive = vec(contact.x + 0.035, 0.24);
  return bezier(toeOff, kick, drive, contact, progress);
}

export function sampleLeg(gait: GaitParameters, localPhase: number, body: BodyMetrics): LegSample {
  const phase = wrapPhase(localPhase);
  if (phase < gait.dutyFactor) {
    const progress = phase / gait.dutyFactor;
    const angles = stanceAngles(progress);
    return {
      localPhase: phase,
      inStance: true,
      progress,
      ankle: stanceAnkle(gait, progress, body),
      hindAngle: angles.hind,
      foreAngle: angles.fore,
    };
  }
  const progress = (phase - gait.dutyFactor) / (1 - gait.dutyFactor);
  const angles = swingAngles(progress);
  return {
    localPhase: phase,
    inStance: false,
    progress,
    ankle: swingAnkle(gait, progress, body),
    hindAngle: angles.hind,
    foreAngle: angles.fore,
  };
}

interface Landmark {
  readonly x: number;
  readonly y: number;
}

/**
 * Pelvis height over one stride: a periodic Catmull-Rom curve through contact,
 * mid-stance (lowest, from leg-spring compression), toe-off and mid-flight
 * (highest). The stance is shorter than the swing, so the half-stride profile
 * is built from a half cycle and mirrored, which keeps it continuous.
 */
export function hipHeightAt(gait: GaitParameters, phase: number, body: BodyMetrics): number {
  // The profile is periodic at the half cycle: the legs swap roles there, so
  // only the first half of the cycle is described and the rest is mirrored.
  const local = wrapPhase(phase);
  const halfDuty = gait.dutyFactor / 2;
  const flightMid = (gait.dutyFactor + 0.5) / 2;
  const base = body.hipStandHeight;
  const landmarks: readonly Landmark[] = [
    { x: 0, y: base },
    { x: halfDuty, y: base - gait.stanceCompression },
    { x: gait.dutyFactor, y: base - gait.stanceCompression * 0.28 },
    { x: flightMid, y: base + gait.flightRise },
  ];
  const displacement = samplePeriodicCurve(landmarks, local, 0.5);
  return base + (displacement - base) * gait.bobGain;
}

/** Catmull-Rom through landmarks on a repeating interval, evaluated at x. */
export function samplePeriodicCurve(landmarks: readonly Landmark[], x: number, period: number): number {
  const base = landmarks.filter((landmark) => landmark.x >= 0 && landmark.x < period);
  if (base.length === 0) throw new Error("samplePeriodicCurve needs at least one landmark");
  if (base.length === 1) return base[0]?.y ?? 0;
  const extended = [-period, 0, period]
    .flatMap((shift) => base.map((landmark) => ({ x: landmark.x + shift, y: landmark.y })))
    .sort((a, b) => a.x - b.x);
  const value = ((x % period) + period) % period;
  let index = 1;
  while (index < extended.length - 2 && (extended[index + 1]?.x ?? Infinity) <= value) index += 1;
  const p0 = extended[index - 1] as Landmark;
  const p1 = extended[index] as Landmark;
  const p2 = extended[index + 1] as Landmark;
  const p3 = extended[index + 2] as Landmark;
  const span = p2.x - p1.x;
  if (span <= 1e-9) return p1.y;
  const t = clamp((value - p1.x) / span, 0, 1);
  const slope0 = ((p2.y - p0.y) / Math.max(1e-9, p2.x - p0.x)) * span;
  const slope1 = ((p3.y - p1.y) / Math.max(1e-9, p3.x - p1.x)) * span;
  return hermite(p1.y, slope0, p2.y, slope1, t);
}

function hermite(y0: number, m0: number, y1: number, m1: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * m1;
}

/** Which leg is planted, or whether the runner is airborne. */
export function supportState(gait: GaitParameters, phase: number): "near" | "far" | "flight" {
  if (sampleLegInStance(gait, phase)) return "near";
  if (sampleLegInStance(gait, phase + 0.5)) return "far";
  return "flight";
}

const sampleLegInStance = (gait: GaitParameters, phase: number): boolean => wrapPhase(phase) < gait.dutyFactor;
