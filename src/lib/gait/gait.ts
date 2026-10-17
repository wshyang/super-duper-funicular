import { clamp, lerp, smoothstep, vec, type Vec2 } from "../geometry/vec.ts";
import type { BodyMetrics } from "../rig/body.ts";

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

export interface GaitParameters {
  readonly cycleSeconds: number;
  readonly strideLength: number;
  readonly dutyFactor: number;
  readonly lean: number;
  readonly fall: number;
  readonly armSwing: number;
  readonly bobGain: number;
}

export function resolveGait(controls: GaitControls): GaitParameters {
  const cadence = clamp(controls.cadence, GAIT_LIMITS.cadence.min, GAIT_LIMITS.cadence.max);
  const lean = clamp(controls.lean, GAIT_LIMITS.lean.min, GAIT_LIMITS.lean.max);
  return {
    cycleSeconds: 120 / cadence,
    strideLength: clamp(controls.strideLength, GAIT_LIMITS.strideLength.min, GAIT_LIMITS.strideLength.max),
    dutyFactor: clamp(controls.dutyFactor, GAIT_LIMITS.dutyFactor.min, GAIT_LIMITS.dutyFactor.max),
    lean,
    fall: 0.03 + 0.055 * lean,
    armSwing: clamp(controls.armSwing, GAIT_LIMITS.armSwing.min, GAIT_LIMITS.armSwing.max),
    bobGain: clamp(controls.bobGain, GAIT_LIMITS.bobGain.min, GAIT_LIMITS.bobGain.max),
  };
}

export const wrapPhase = (phase: number): number => {
  const wrapped = phase % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
};

export const CANONICAL_PHASE_NAMES = [
  "Right Contact (Midfoot Strike)",
  "Right Down (Sole Roll)",
  "Right Pass (Heel-Off)",
  "Right Flight (Forward Fall)",
  "Left Contact (Midfoot Strike)",
  "Left Down (Sole Roll)",
  "Left Pass (Heel-Off)",
  "Left Flight (Forward Fall)",
] as const;

export function phaseName(phase: number): string {
  const index = Math.floor(wrapPhase(phase + 0.0625) * 8);
  return CANONICAL_PHASE_NAMES[index] ?? CANONICAL_PHASE_NAMES[0];
}

export interface LegSample {
  readonly inStance: boolean;
  readonly progress: number;
  readonly ankle: Vec2;
  readonly hindAngle: number;
  readonly foreAngle: number;
}

export function sampleLeg(gait: GaitParameters, phase: number, body: BodyMetrics): LegSample {
  const local = wrapPhase(phase);
  const inStance = local < gait.dutyFactor;
  const progress = inStance ? local / gait.dutyFactor : (local - gait.dutyFactor) / (1 - gait.dutyFactor);
  const angles = inStance ? stanceAngles(progress) : swingAngles(progress);
  const ankle = inStance ? stanceAnkle(gait, progress, body) : swingAnkle(gait, progress, body);
  return { inStance, progress, ankle, hindAngle: angles.hind, foreAngle: angles.fore };
}

function stanceAngles(progress: number): { hind: number; fore: number } {
  if (progress < 0.12) return { hind: lerp(-0.03, 0, smoothstep(0, 1, progress / 0.12)), fore: 0 };
  if (progress < 0.56) return { hind: 0, fore: 0 };
  if (progress < 0.86) return { hind: lerp(0, -0.72, (progress - 0.56) / 0.3), fore: 0 };
  return { hind: -0.72, fore: lerp(0, -0.22, (progress - 0.86) / 0.14) };
}

function swingAngles(progress: number): { hind: number; fore: number } {
  if (progress < 0.42) {
    return { hind: lerp(-0.72, 0.18, progress / 0.42), fore: lerp(-0.22, 0.06, progress / 0.42) };
  }
  return { hind: lerp(0.18, -0.03, (progress - 0.42) / 0.58), fore: lerp(0.06, 0, (progress - 0.42) / 0.58) };
}

function stanceAnkle(gait: GaitParameters, progress: number, body: BodyMetrics): Vec2 {
  const reach = (gait.strideLength * gait.dutyFactor) / 2;
  const x = reach - 2 * reach * progress - gait.fall;
  return vec(x, -body.footSole);
}

function swingAnkle(gait: GaitParameters, progress: number, body: BodyMetrics): Vec2 {
  const reach = (gait.strideLength * gait.dutyFactor) / 2;
  const x = -reach - gait.fall + gait.strideLength * progress;
  const lift = Math.sin(progress * Math.PI) * 0.12;
  return vec(x, -body.footSole + lift);
}
