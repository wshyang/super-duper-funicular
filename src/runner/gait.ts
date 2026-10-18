import type {
  ArticulatedPose,
  GaitConfig,
  GaitPhaseName,
  HairStyleMode,
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
  const farLeg = solveLegKinematics(pelvis, normalizePhase(phase + 0.5), { config, rig });
  const nearArm = solveArmKinematics(upper.shoulderOrigin, normalizePhase(phase + 0.5), { config, rig, side: 'near' });
  const farArm = solveArmKinematics(upper.shoulderOrigin, phase, { config, rig, side: 'far' });
  const isFlightPhase = !nearLeg.isGrounded && !farLeg.isGrounded;
  const footCrossoverDeltaX = Number((nearLeg.endEffector.x - farLeg.endEffector.x).toFixed(2));
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
    hairMidWave: upper.hairMidWave,
    hairTip: upper.hairTip,
    torsoAngleRad: upper.torsoAngleRad,
    neckAngleRad: upper.neckAngleRad,
    headAngleRad: upper.headAngleRad,
    hairAngleRad: upper.hairAngleRad,
    hairLowerWaveAngleRad: upper.hairLowerWaveAngleRad,
    hairStyleMode: upper.hairStyleMode,
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
  readonly side?: 'near' | 'far';
}

interface UpperBodyKinematics {
  readonly torsoAngleRad: number;
  readonly neckAngleRad: number;
  readonly headAngleRad: number;
  readonly hairAngleRad: number;
  readonly hairLowerWaveAngleRad: number;
  readonly hairStyleMode: HairStyleMode;
  readonly chest: Point2D;
  readonly shoulderOrigin: Point2D;
  readonly collar: Point2D;
  readonly neck: Point2D;
  readonly headCenter: Point2D;
  readonly hairAnchor: Point2D;
  readonly hairMidWave: Point2D;
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
  const hair = solveHairKinematics(headCenter, headAngleRad, phase, ctx);
  return {
    torsoAngleRad,
    neckAngleRad,
    headAngleRad,
    ...hair,
    chest,
    shoulderOrigin,
    collar,
    neck,
    headCenter,
  };
}

function solveHairKinematics(
  headCenter: Point2D,
  headAngleRad: number,
  phase: number,
  ctx: LimbContext,
): {
  readonly hairAnchor: Point2D;
  readonly hairMidWave: Point2D;
  readonly hairTip: Point2D;
  readonly hairAngleRad: number;
  readonly hairLowerWaveAngleRad: number;
  readonly hairStyleMode: HairStyleMode;
} {
  const hairStyleMode: HairStyleMode = ctx.config.hairStyleMode ?? 'ponytail';
  const swingScale = ctx.config.hairSwingScale ?? 1.0;
  if (hairStyleMode === 'long-flowing') {
    const hairAnchor = projectPoint(
      headCenter,
      Math.PI - 0.55 + headAngleRad * 0.4,
      ctx.rig.headRadius * 0.78,
    );
    const stridePendulum = Math.sin((phase - 0.14) * Math.PI * 2) * 0.26 * swingScale;
    const stepBillow = Math.sin((phase - 0.22) * Math.PI * 4) * 0.32 * swingScale;
    const hairAngleRad = Math.PI - 0.88 + stridePendulum + stepBillow;
    const lagWave = Math.sin((phase - 0.35) * Math.PI * 4) * 0.42 * swingScale;
    const hairLowerWaveAngleRad = hairAngleRad - 0.18 + lagWave;
    const hairMidWave = projectPoint(hairAnchor, hairAngleRad, ctx.rig.ponytailLength * 0.56);
    const hairTip = projectPoint(
      hairMidWave,
      hairLowerWaveAngleRad,
      ctx.rig.ponytailLength * 0.66,
    );
    return {
      hairAnchor,
      hairMidWave,
      hairTip,
      hairAngleRad,
      hairLowerWaveAngleRad,
      hairStyleMode,
    };
  }
  const hairAnchor = projectPoint(
    headCenter,
    Math.PI - 0.35 + headAngleRad * 0.5,
    ctx.rig.headRadius * 0.88,
  );
  const hairWhipWave = Math.sin((phase - 0.24) * Math.PI * 4) * 0.42 * swingScale;
  const hairAngleRad = Math.PI - 0.48 + hairWhipWave;
  const hairLowerWaveAngleRad =
    hairAngleRad + Math.cos((phase - 0.32) * Math.PI * 4) * 0.16 * swingScale;
  const hairMidWave = projectPoint(hairAnchor, hairAngleRad, ctx.rig.ponytailLength * 0.5);
  const hairTip = projectPoint(hairAnchor, hairAngleRad, ctx.rig.ponytailLength);
  return {
    hairAnchor,
    hairMidWave,
    hairTip,
    hairAngleRad,
    hairLowerWaveAngleRad,
    hairStyleMode,
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
  const rawSwing = Math.cos(armPhase * Math.PI * 2) * ctx.config.armSwingScale;
  const carryFlexDeg = ctx.config.armCarryFlexDeg ?? 84;
  const chestBiasDeg = ctx.config.armChestBiasDeg ?? 4;
  const baseFlexRad = ((carryFlexDeg - 14) * Math.PI) / 180;
  const chestBiasRad = ((chestBiasDeg - 4) * Math.PI) / 180;
  const rearClamp = chestBiasDeg > 8 && rawSwing < 0 ? 1 - Math.min(0.45, (chestBiasDeg - 8) * 0.02) : 1;
  const swingWave = rawSwing * rearClamp;
  const farRearTuck = ctx.side === 'far' ? Math.max(0, -swingWave) : 0;
  const upperAngleRad =
    1.54 - chestBiasRad * 0.85 - 0.68 * swingWave - 0.52 * farRearTuck;
  const forearmFlexRad = baseFlexRad + 0.36 * swingWave + 0.42 * farRearTuck;
  const lowerAngleRad = upperAngleRad - forearmFlexRad;
  const upperLen = ctx.rig.upperArmLength * (1 - 0.16 * farRearTuck);
  const lowerLen = ctx.rig.forearmLength * (1 - 0.24 * farRearTuck);
  const midJoint = projectPoint(shoulder, upperAngleRad, upperLen);
  const endEffector = projectPoint(midJoint, lowerAngleRad, lowerLen);
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
