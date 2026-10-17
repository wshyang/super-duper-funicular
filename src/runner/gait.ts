import type { FootState, GaitSettings, MotionId, Vec2 } from '../shared/types.ts';
import { MOTION_BY_ID, CANVAS } from '../shared/constants.ts';
import type { RigMetrics } from './rig.ts';
import { clamp, easeInOutSine, normalizePhase, smoothstep, vec } from './vec.ts';

export interface MotionProfile {
  readonly id: MotionId;
  readonly duty: number;
  readonly stridePx: number;
  readonly liftPx: number;
  readonly leanDeg: number;
  readonly armSwingDeg: number;
  readonly elbowDeg: number;
  readonly bobPx: number;
  readonly flight: boolean;
  readonly doubleSupport: boolean;
}

export interface ResolvedGait extends MotionProfile {
  readonly hipX: number;
  readonly hipY: number;
  readonly ankleHeight: number;
  readonly footLength: number;
}

const PROFILES: Readonly<Record<MotionId, MotionProfile>> = {
  run: {
    id: 'run',
    duty: 0.38,
    stridePx: 104,
    liftPx: 46,
    leanDeg: 14,
    armSwingDeg: 42,
    elbowDeg: 84,
    bobPx: 4.5,
    flight: true,
    doubleSupport: false,
  },
  'brisk-walk': {
    id: 'brisk-walk',
    duty: 0.56,
    stridePx: 66,
    liftPx: 12,
    leanDeg: 6,
    armSwingDeg: 26,
    elbowDeg: 44,
    bobPx: 2.2,
    flight: false,
    doubleSupport: true,
  },
  walk: {
    id: 'walk',
    duty: 0.62,
    stridePx: 58,
    liftPx: 9,
    leanDeg: 2.5,
    armSwingDeg: 18,
    elbowDeg: 24,
    bobPx: 1.6,
    flight: false,
    doubleSupport: true,
  },
};

const FOOT = {
  heel: { x: -15, y: 15 },
  ball: { x: 15, y: 11 },
  toe: { x: 30, y: 10 },
  heelStrikeRad: (-10 * Math.PI) / 180,
  toeOffRad: (30 * Math.PI) / 180,
} as const;

/** Stance foot pitch: quick flat plant, hold, then a progressive heel-off roll. */
const stancePitch = (t: number): number => {
  const plant = smoothstep(Math.min(1, t / 0.18));
  const roll = smoothstep(clamp((t - 0.55) / 0.45, 0, 1));
  return FOOT.heelStrikeRad + (FOOT.toeOffRad - FOOT.heelStrikeRad) * (plant * 0.35 + roll * 0.65);
};

const swingPitch = (t: number): number => {
  const settle = smoothstep(clamp(t / 0.7, 0, 1));
  return FOOT.toeOffRad + (FOOT.heelStrikeRad - FOOT.toeOffRad) * settle;
};

interface FootGeometry {
  readonly heel: Vec2;
  readonly ball: Vec2;
  readonly toe: Vec2;
  readonly soleY: number;
}

const footGeometry = (pitchRad: number, footLength: number): FootGeometry => {
  const cos = Math.cos(pitchRad);
  const sin = Math.sin(pitchRad);
  const rot = (point: { x: number; y: number }): Vec2 => ({
    x: (point.x * cos - point.y * sin) * (footLength / 27),
    y: (point.x * sin + point.y * cos) * (footLength / 27),
  });
  const heel = rot(FOOT.heel);
  const ball = rot(FOOT.ball);
  const toe = rot(FOOT.toe);
  const soleY = Math.max(heel.y, ball.y, toe.y);
  return { heel, ball, toe, soleY };
};

export const resolveGait = (settings: GaitSettings, rig: RigMetrics): ResolvedGait => {
  const base = PROFILES[settings.motion];
  const stridePx = base.stridePx * settings.stride;
  const hipY = rig.hipCenterY;
  return {
    ...base,
    stridePx,
    liftPx: base.liftPx * settings.footLift,
    leanDeg: base.leanDeg * settings.lean,
    hipX: CANVAS.width / 2,
    hipY,
    ankleHeight: rig.ankleHeight,
    footLength: rig.footLength,
  };
};

/** Vertical hip offset in pixels; positive is down. Lowest at mid-stance, highest in flight. */
export const bodyBob = (phase: number, gait: ResolvedGait): number => {
  const cycle = Math.cos(4 * Math.PI * (normalizePhase(phase) - gait.duty / 2));
  const amp = gait.bobPx * (gait.id === 'run' ? 1 : 0.65);
  return amp * cycle;
};

export interface FootRequest {
  readonly legPhase: number;
  readonly gait: ResolvedGait;
  readonly hip: Vec2;
}

export const solveFoot = (request: FootRequest): FootState => {
  const { gait } = request;
  const p = normalizePhase(request.legPhase);
  const isStance = p < gait.duty;
  const t = isStance ? p / gait.duty : (p - gait.duty) / (1 - gait.duty);
  const pitchRad = isStance ? stancePitch(t) : swingPitch(t);
  const geometry = footGeometry(pitchRad, gait.footLength);
  const half = gait.stridePx / 2;
  const x = isStance ? half - gait.stridePx * t : -half + gait.stridePx * easeInOutSine(t);
  const lift = isStance ? 0 : gait.liftPx * Math.pow(Math.sin(Math.PI * t), 1.15);
  const ankleY = CANVAS.groundY - geometry.soleY - lift;
  const ankle = vec(request.hip.x + x, ankleY);
  return {
    ankle,
    heel: vec(ankle.x + geometry.heel.x, ankle.y + geometry.heel.y),
    ball: vec(ankle.x + geometry.ball.x, ankle.y + geometry.ball.y),
    toe: vec(ankle.x + geometry.toe.x, ankle.y + geometry.toe.y),
    pitchRad,
    isStance,
    progress: t,
  };
};

/** Arm swing in radians, measured from straight-down; positive is forward (+x). */
export const armSwing = (phase: number, gait: ResolvedGait, side: 'near' | 'far'): number => {
  const amplitude = (gait.armSwingDeg * Math.PI) / 180;
  const direction = side === 'near' ? -1 : 1;
  return direction * amplitude * Math.cos(2 * Math.PI * normalizePhase(phase));
};

export const elbowFlex = (phase: number, gait: ResolvedGait): number => {
  const base = (gait.elbowDeg * Math.PI) / 180;
  const pump = gait.id === 'run' ? 0.16 : 0.08;
  return base * (1 + pump * Math.cos(2 * Math.PI * normalizePhase(phase) + Math.PI));
};

export const isFlightPhase = (phase: number, gait: ResolvedGait): boolean => {
  const near = normalizePhase(phase);
  const far = normalizePhase(phase + 0.5);
  return near >= gait.duty && far >= gait.duty;
};

export const isDoubleSupportPhase = (phase: number, gait: ResolvedGait): boolean => {
  const near = normalizePhase(phase);
  const far = normalizePhase(phase + 0.5);
  return near < gait.duty && far < gait.duty;
};

/** The canonical 8-frame index used by the reference sheet filmstrip. */
export const canonicalFrameIndex = (phase: number): number =>
  Math.floor(((normalizePhase(phase) + 0.0625) % 1) * 8) % 8;

export const motionLabel = (id: MotionId): string => MOTION_BY_ID[id].label;
