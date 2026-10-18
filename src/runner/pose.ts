import type {
  ArmChain,
  BodyPose,
  Calibration,
  FootState,
  GaitSettings,
  LimbChain,
  PoseFrame,
  Vec2,
} from '../shared/types.ts';
import { PERSONA_BY_ID } from '../shared/constants.ts';
import { rigForPersona, type RigMetrics } from './rig.ts';
import {
  armSwing,
  bodyBob,
  elbowFlex,
  isDoubleSupportPhase,
  isFlightPhase,
  resolveGait,
  solveFoot,
  type ResolvedGait,
} from './gait.ts';
import { add, normalizePhase, rotate, scale, vec } from './vec.ts';
import { DEFAULT_CALIBRATION } from '../shared/calibration.ts';

const DEG = Math.PI / 180;

const legChain = (hip: Vec2, legPhase: number, gait: ResolvedGait, rig: RigMetrics): LimbChain => {
  const foot = solveFoot({ legPhase, gait, hip });
  const reach = { thigh: rig.thigh, shin: rig.shin };
  const knee = solveKnee(hip, foot, reach);
  return { hip, knee, ankle: foot.ankle, foot };
};

/** Knee position: circle intersection with a forward (+x) bend bias. */
const solveKnee = (hip: Vec2, foot: FootState, reach: { thigh: number; shin: number }): Vec2 => {
  const dx = foot.ankle.x - hip.x;
  const dy = foot.ankle.y - hip.y;
  const distance = Math.max(1e-3, Math.hypot(dx, dy));
  const thigh = reach.thigh;
  const shin = reach.shin;
  const clampedDistance = Math.min(
    thigh + shin - 0.5,
    Math.max(Math.abs(thigh - shin) + 0.5, distance),
  );
  const along =
    (thigh * thigh - shin * shin + clampedDistance * clampedDistance) / (2 * clampedDistance);
  const height = Math.sqrt(Math.max(0, thigh * thigh - along * along));
  const ux = dx / distance;
  const uy = dy / distance;
  const forward = { x: -uy, y: ux };
  const sign = forward.x + forward.y * 0.2 >= 0 ? 1 : -1;
  return vec(
    hip.x + ux * along + forward.x * height * sign,
    hip.y + uy * along + forward.y * height * sign,
  );
};

const armChain = (
  shoulder: Vec2,
  phase: number,
  gait: ResolvedGait,
  rig: RigMetrics,
  side: 'near' | 'far',
): ArmChain => {
  const swing = armSwing(phase, gait, side) * (side === 'far' ? 0.72 : 1);
  const angle = swing + gait.leanDeg * DEG * 0.1;
  const flex = elbowFlex(phase, gait) * (side === 'far' ? 0.88 : 1);
  const upper = rig.upperArm * 0.98;
  const lower = rig.forearm * 0.96;
  const elbow = add(shoulder, vec(Math.sin(angle) * upper, Math.cos(angle) * upper));
  const forearmAngle = angle + flex;
  const wrist = add(elbow, vec(Math.sin(forearmAngle) * lower, Math.cos(forearmAngle) * lower));
  const hand = add(
    wrist,
    vec(
      Math.sin(forearmAngle) * rig.handRadius * 0.7,
      Math.cos(forearmAngle) * rig.handRadius * 0.7,
    ),
  );
  return { shoulder, elbow, wrist, hand, angleRad: angle };
};

const ponytailPoints = (
  headCenter: Vec2,
  headAngle: number,
  phase: number,
  rig: RigMetrics,
): Vec2[] => {
  const base = add(
    headCenter,
    rotate(vec(-rig.headRadiusX * 0.72, -rig.headRadiusY * 0.35), headAngle),
  );
  const lag = Math.sin(2 * Math.PI * normalizePhase(phase) - 0.6) * 5;
  return [
    base,
    add(base, vec(-9, 4 + lag * 0.25)),
    add(base, vec(-18, 10 + lag * 0.55)),
    add(base, vec(-25, 17 + lag)),
  ];
};

export interface PoseOptions {
  readonly calibration?: Calibration;
}

interface UpperBody {
  readonly hip: Vec2;
  readonly shoulder: Vec2;
  readonly neckBase: Vec2;
  readonly neckTop: Vec2;
  readonly headCenter: Vec2;
  readonly headAngleRad: number;
  readonly torsoAngleRad: number;
}

const upperBodyOf = (
  baseHip: Vec2,
  lean: number,
  rig: RigMetrics,
  calibration: Calibration,
): UpperBody => {
  const hip = add(baseHip, calibration.hip);
  const torsoVector = rotate(vec(0, -rig.torso), lean);
  const shoulderCenter = add(add(hip, scale(torsoVector, 0.86)), calibration.shoulder);
  const neckBase = add(hip, scale(torsoVector, 0.985));
  const neckAngle = lean * 0.45;
  const neckTop = add(
    neckBase,
    vec(Math.sin(neckAngle) * rig.neck, -Math.cos(neckAngle) * rig.neck),
  );
  const headAngle = lean * 0.3;
  const headCenter = add(
    add(
      neckTop,
      vec(
        Math.sin(headAngle) * rig.headRadiusY * 0.78,
        -Math.cos(headAngle) * rig.headRadiusY * 0.78,
      ),
    ),
    calibration.head,
  );
  return {
    hip,
    shoulder: shoulderCenter,
    neckBase,
    neckTop,
    headCenter,
    headAngleRad: headAngle,
    torsoAngleRad: lean,
  };
};

export const solvePose = (
  settings: GaitSettings,
  phase: number,
  options: PoseOptions = {},
): PoseFrame => {
  const calibration = options.calibration ?? DEFAULT_CALIBRATION;
  const persona = PERSONA_BY_ID[settings.persona];
  const rig = rigForPersona(persona);
  const gait = resolveGait(settings, rig);
  const phi = normalizePhase(phase);
  const lean = gait.leanDeg * DEG + Math.sin(4 * Math.PI * phi) * 1.4 * DEG;
  const bob = bodyBob(phi, gait);
  const baseHip = vec(gait.hipX, gait.hipY + bob);
  const upper = upperBodyOf(baseHip, lean, rig, calibration);
  // Leg roots stay on the uncalibrated pelvis so hip nudges never stretch a leg chain.
  const nearHip = add(baseHip, vec(rig.hipWidth * 0.18, 5));
  const farHip = add(baseHip, vec(-rig.hipWidth * 0.18, 4));
  const nearShoulder = add(upper.shoulder, vec(3, rig.shoulderDrop));
  const farShoulder = add(upper.shoulder, vec(-8, rig.shoulderDrop + 1));
  const pose: BodyPose = {
    origin: baseHip,
    ...upper,
    nearLeg: legChain(nearHip, phi, gait, rig),
    farLeg: legChain(farHip, normalizePhase(phi + 0.5), gait, rig),
    nearArm: armChain(nearShoulder, phi, gait, rig, 'near'),
    farArm: armChain(farShoulder, phi, gait, rig, 'far'),
    ponytail: ponytailPoints(upper.headCenter, upper.headAngleRad, phi, rig),
  };
  return {
    phase: phi,
    pose,
    isFlight: isFlightPhase(phi, gait),
    isDoubleSupport: isDoubleSupportPhase(phi, gait),
  };
};

export const rigFor = (settings: GaitSettings): RigMetrics =>
  rigForPersona(PERSONA_BY_ID[settings.persona]);
