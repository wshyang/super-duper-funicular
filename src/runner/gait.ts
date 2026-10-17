import type {
  ArticulatedPose,
  GaitConfig,
  GaitPhaseName,
  LimbKinematics,
  Point2D,
} from '../shared/types.js';
import {
  type AnatomicalRigSpec,
  DEFAULT_GAIT_CONFIG,
  DEFAULT_RIG_SPEC,
} from './body-proportions.js';
import {
  reanchorFootToSolvedAnkle,
  solveRollingFootGeometry,
} from './foot-roll.js';
import { projectPoint, solveTwoBoneIk } from './two-bone-ik.js';

export const CANONICAL_PHASE_NAMES: readonly GaitPhaseName[] = [
  'Right Contact (Midfoot Strike)',
  'Right Down (Sole Roll & Cushion)',
  'Right Pass (Heel-Off & Toe Roll)',
  'Right Flight (Forward Fall Drive)',
  'Left Contact (Midfoot Strike)',
  'Left Down (Sole Roll & Cushion)',
  'Left Pass (Heel-Off & Toe Roll)',
  'Left Flight (Forward Fall Drive)',
];

export function normalizePhase(phase: number): number {
  const mod = phase % 1;
  return mod < 0 ? mod + 1 : mod;
}

export function solveArticulatedPose(
  rawPhase: number,
  config: GaitConfig = DEFAULT_GAIT_CONFIG,
  rig: AnatomicalRigSpec = DEFAULT_RIG_SPEC,
): ArticulatedPose {
  const phase = normalizePhase(rawPhase);
  const canonicalFrameIndex = Math.floor(((phase + 0.0625) % 1) * 8);
  const phaseName =
    CANONICAL_PHASE_NAMES[canonicalFrameIndex] ?? 'Right Contact (Midfoot Strike)';
  const pelvis = computePelvisPosition(phase, config, rig);
  const upper = computeUpperBodyArticulation(pelvis, phase, { config, rig });
  const nearLeg = solveLegKinematics(pelvis, phase, { config, rig });
  const farLegPhase = normalizePhase(phase + 0.5);
  const farLeg = solveLegKinematics(pelvis, farLegPhase, { config, rig });
  const nearArmPhase = normalizePhase(phase + 0.5);
  const nearArm = solveArmKinematics(upper.shoulderOrigin, nearArmPhase, { config, rig });
  const farArm = solveArmKinematics(upper.shoulderOrigin, phase, { config, rig });
  const isFlightPhase = !nearLeg.isGrounded && !farLeg.isGrounded;
  const footCrossoverDeltaX = Number(
    (nearLeg.endEffector.x - farLeg.endEffector.x).toFixed(2),
  );
  const pelvisTiltRad = 0.14 + Math.sin(phase * Math.PI * 4) * 0.06;
  const fallForwardComLeadPx = Number((upper.collar.x - pelvis.x).toFixed(1));
  return {
    phase,
    canonicalFrameIndex,
    phaseName,
    groundY: rig.groundY,
    pelvis,
    chest: upper.chest,
    collar: upper.collar,
    neck: upper.neck,
    headCenter: upper.headCenter,
    hairAnchor: upper.hairAnchor,
    hairTip: upper.hairTip,
    torsoAngleRad: upper.torsoAngleRad,
    neckAngleRad: upper.neckAngleRad,
    headAngleRad: upper.headAngleRad,
    hairAngleRad: upper.hairAngleRad,
    pelvisTiltRad,
    fallForwardComLeadPx,
    nearLeg,
    farLeg,
    nearArm,
    farArm,
    isFlightPhase,
    footCrossoverDeltaX,
  };
}

function computePelvisPosition(
  phase: number,
  config: GaitConfig,
  rig: AnatomicalRigSpec,
): Point2D {
  const doubleFreqAngle = (phase - 0.125) * Math.PI * 4;
  const verticalBob = Math.cos(doubleFreqAngle) * 8.0 * config.bounceAmplitudeScale;
  const forwardFallSurge = Math.sin((phase - 0.18) * Math.PI * 4) * 3.2 * config.strideLengthScale;
  return {
    x: rig.pelvisRestX + forwardFallSurge,
    y: rig.pelvisRestY + verticalBob,
  };
}

interface LimbContext {
  readonly config: GaitConfig;
  readonly rig: AnatomicalRigSpec;
}

interface UpperBodyKinematics {
  readonly torsoAngleRad: number;
  readonly neckAngleRad: number;
  readonly headAngleRad: number;
  readonly hairAngleRad: number;
  readonly chest: Point2D;
  readonly shoulderOrigin: Point2D;
  readonly collar: Point2D;
  readonly neck: Point2D;
  readonly headCenter: Point2D;
  readonly hairAnchor: Point2D;
  readonly hairTip: Point2D;
}

function computeUpperBodyArticulation(
  pelvis: Point2D,
  phase: number,
  ctx: LimbContext,
): UpperBodyKinematics {
  const baseLeanRad = (ctx.config.forwardLeanDeg * Math.PI) / 180;
  const torsoSurgeNod = Math.sin((phase - 0.15) * Math.PI * 4) * 0.065;
  const torsoAngleRad = -Math.PI / 2 + baseLeanRad + torsoSurgeNod;
  const chest = projectPoint(pelvis, torsoAngleRad, ctx.rig.torsoLength);
  const shoulderOrigin = projectPoint(pelvis, torsoAngleRad, ctx.rig.torsoLength * 0.92);
  const collar = projectPoint(pelvis, torsoAngleRad, ctx.rig.torsoLength + 10);
  const cervicalFlexWave =
    Math.sin((phase - 0.06) * Math.PI * 4) * 0.25 * ctx.config.neckMotionScale;
  const neckAngleRad = -Math.PI / 2 + baseLeanRad * 0.36 + cervicalFlexWave;
  const neck = projectPoint(collar, neckAngleRad, ctx.rig.neckLength);
  const headNodWave =
    Math.cos((phase - 0.18) * Math.PI * 4) * 0.18 * ctx.config.neckMotionScale;
  const headAngleRad = baseLeanRad * 0.18 + headNodWave;
  const headCenter = projectPoint(
    neck,
    -Math.PI / 2 + headAngleRad * 0.6,
    ctx.rig.headRadius * 0.92,
  );
  const hairAnchor = projectPoint(
    headCenter,
    Math.PI - 0.35 + headAngleRad * 0.5,
    ctx.rig.headRadius * 0.88,
  );
  const hairWhipWave = Math.sin((phase - 0.24) * Math.PI * 4) * 0.42;
  const hairAngleRad = Math.PI - 0.48 + hairWhipWave;
  const hairTip = projectPoint(hairAnchor, hairAngleRad, ctx.rig.ponytailLength);
  return {
    torsoAngleRad,
    neckAngleRad,
    headAngleRad,
    hairAngleRad,
    chest,
    shoulderOrigin,
    collar,
    neck,
    headCenter,
    hairAnchor,
    hairTip,
  };
}

function solveLegKinematics(
  pelvis: Point2D,
  legPhase: number,
  ctx: LimbContext,
): LimbKinematics {
  const rawRoll = solveRollingFootGeometry(legPhase, {
    pelvis,
    config: ctx.config,
    rig: ctx.rig,
  });
  const ik = solveTwoBoneIk(pelvis, rawRoll.ankleTarget, {
    upperLength: ctx.rig.thighLength,
    lowerLength: ctx.rig.shinLength,
    bendDirection: 'knee-forward',
  });
  const foot = reanchorFootToSolvedAnkle(ik.endEffector, rawRoll, ctx.rig);
  return {
    hipOrShoulder: pelvis,
    midJoint: ik.midJoint,
    endEffector: ik.endEffector,
    heelPoint: foot.heelPoint,
    ballPoint: foot.ballPoint,
    tipPoint: foot.tipPoint,
    upperAngleRad: ik.upperAngleRad,
    lowerAngleRad: ik.lowerAngleRad,
    distalAngleRad: foot.rearFootAngleRad,
    toeAngleRad: foot.toeAngleRad,
    heelLiftPx: foot.heelLiftPx,
    contactPhase: foot.contactPhase,
    isGrounded: foot.isGrounded,
  };
}

function solveArmKinematics(
  shoulder: Point2D,
  armPhase: number,
  ctx: LimbContext,
): LimbKinematics {
  const swingWave = Math.cos(armPhase * Math.PI * 2) * ctx.config.armSwingScale;
  const upperAngleRad = 1.58 - 0.72 * swingWave;
  const forearmFlexRad = 1.22 + 0.36 * swingWave;
  const lowerAngleRad = upperAngleRad - forearmFlexRad;
  const midJoint = projectPoint(shoulder, upperAngleRad, ctx.rig.upperArmLength);
  const endEffector = projectPoint(midJoint, lowerAngleRad, ctx.rig.forearmLength);
  const tipPoint = projectPoint(endEffector, lowerAngleRad, ctx.rig.handRadius * 0.75);
  return {
    hipOrShoulder: shoulder,
    midJoint,
    endEffector,
    heelPoint: endEffector,
    ballPoint: tipPoint,
    tipPoint,
    upperAngleRad,
    lowerAngleRad,
    distalAngleRad: lowerAngleRad,
    toeAngleRad: lowerAngleRad,
    heelLiftPx: 0,
    contactPhase: 'flight-reach',
    isGrounded: false,
  };
}
