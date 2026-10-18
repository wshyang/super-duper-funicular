import { FOOT_SHAPE, MOTION_BY_ID, PERSONA_BY_ID, STAGE_SIZE } from '../shared/constants';
import type {
  ArmPose,
  FootPose,
  GaitSettings,
  LegPose,
  MotionProfile,
  Point,
  RunnerPose,
} from '../shared/types';
import { add, easeInOutSine, normalizePhase, rotate, solveTwoBone } from './math';

const DIMENSIONS = {
  hipY: 302,
  hipWidth: 20,
  thigh: 92,
  shin: 84,
  torso: 112,
  neck: 24,
  headRadius: 23,
  upperArm: 51,
  forearm: 44,
  footLength: 52,
  groundY: STAGE_SIZE.groundY,
} as const;

const footAtPhase = (hip: Point, phase: number, profile: MotionProfile): FootPose => {
  const localPhase = normalizePhase(phase);
  const stance = localPhase < profile.dutyFactor;
  const progress = stance
    ? localPhase / profile.dutyFactor
    : (localPhase - profile.dutyFactor) / (1 - profile.dutyFactor);
  const strideProgress = stance ? progress : easeInOutSine(progress);
  const relativeX = stance
    ? profile.stride / 2 - profile.stride * strideProgress
    : -profile.stride / 2 + profile.stride * strideProgress;
  const lift = stance ? 0 : profile.lift * Math.sin(Math.PI * progress);
  const angle = stance
    ? -0.18 + Math.max(0, progress - 0.56) * 0.72
    : 0.42 - easeInOutSine(progress) * 0.56;
  const heelOffset = rotate({ x: FOOT_SHAPE.heelX, y: FOOT_SHAPE.soleY }, angle);
  const toeOffset = rotate({ x: FOOT_SHAPE.toeX, y: FOOT_SHAPE.soleY }, angle);
  const soleDrop = Math.max(heelOffset.y, toeOffset.y);
  const ankle = { x: hip.x + relativeX, y: DIMENSIONS.groundY - lift - soleDrop };
  return { ankle, heel: add(ankle, heelOffset), toe: add(ankle, toeOffset), pitch: angle, stance };
};

const legAtPhase = (
  hip: Point,
  phase: number,
  profile: MotionProfile,
  bendSign: 1 | -1,
): LegPose => {
  const foot = footAtPhase(hip, phase, profile);
  const chain = solveTwoBone(hip, foot.ankle, DIMENSIONS.thigh, DIMENSIONS.shin, bendSign);
  return { hip, knee: chain.joint, foot: { ...foot, ankle: chain.end } };
};

const armAtPhase = (shoulder: Point, phase: number, side: 1 | -1): ArmPose => {
  const swing = Math.sin(phase * Math.PI * 2 + (side === 1 ? Math.PI : 0));
  const upperAngle = swing * 0.68;
  const elbowAngle = upperAngle + side * (0.72 + Math.max(0, swing) * 0.28);
  const elbow = add(shoulder, rotate({ x: 0, y: DIMENSIONS.upperArm }, upperAngle));
  const wrist = add(elbow, rotate({ x: 0, y: DIMENSIONS.forearm }, elbowAngle));
  return { shoulder, elbow, wrist };
};

export const solvePose = (settings: GaitSettings, phase: number): RunnerPose => {
  const profile = MOTION_BY_ID[settings.motion];
  const persona = PERSONA_BY_ID[settings.persona];
  const normalized = normalizePhase(phase);
  const bob = profile.flight
    ? 9 * Math.sin(Math.PI * 2 * normalized) ** 2
    : 2 * Math.sin(Math.PI * 2 * normalized) ** 2;
  const hip = { x: STAGE_SIZE.width * 0.5, y: DIMENSIONS.hipY + bob };
  const torsoAngle = (profile.leanDeg * Math.PI) / 180 + Math.sin(normalized * Math.PI * 2) * 0.035;
  const shoulder = add(hip, rotate({ x: 1, y: -DIMENSIONS.torso * persona.scale }, torsoAngle));
  const neck = add(shoulder, rotate({ x: 0, y: -DIMENSIONS.neck }, torsoAngle * 0.55));
  const head = add(
    neck,
    rotate({ x: 3, y: -DIMENSIONS.headRadius * persona.headScale }, torsoAngle * 0.35),
  );
  const nearHip = add(hip, { x: DIMENSIONS.hipWidth / 2, y: 4 });
  const farHip = add(hip, { x: -DIMENSIONS.hipWidth / 2, y: 2 });
  const nearShoulder = add(shoulder, { x: 7, y: 5 });
  const farShoulder = add(shoulder, { x: -11, y: 6 });
  const nearPhase = normalized;
  const farPhase = normalizePhase(normalized + 0.5);
  const flight =
    profile.flight && normalized >= profile.dutyFactor && farPhase >= profile.dutyFactor;
  return {
    phase: normalized,
    hip,
    shoulder,
    neck,
    head,
    torsoAngle,
    nearLeg: legAtPhase(nearHip, nearPhase, profile, 1),
    farLeg: legAtPhase(farHip, farPhase, profile, -1),
    nearArm: armAtPhase(nearShoulder, farPhase, 1),
    farArm: armAtPhase(farShoulder, nearPhase, -1),
    flight,
  };
};
