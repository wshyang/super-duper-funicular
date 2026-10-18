import type { ArticulatedPose, HairStyleMode, LimbKinematics, Point2D } from '../shared/types.js';
import type { AnatomicalRigSpec } from './body-proportions.js';

const NEUTRAL_ARM_ANGLE = Math.PI / 2 - 0.02;

export function solveStandingUprightPose(
  rig: AnatomicalRigSpec,
  hairStyleMode: HairStyleMode = 'ponytail',
): ArticulatedPose {
  const feet = standingFootAnchors(rig);
  const pelvis = { x: rig.pelvisRestX, y: feet.pelvisY };
  const upper = standingUpperBody(pelvis, rig);
  const nearArm = hangingArm(upper.shoulder, rig.upperArmLength, rig.forearmLength, 0);
  const farArm = hangingArm(upper.shoulder, rig.upperArmLength, rig.forearmLength, 2.5);
  return {
    phase: 0,
    canonicalFrameIndex: 0,
    phaseName: 'Right Down (Sole Roll & Cushion)',
    groundY: rig.groundY,
    pelvis,
    chest: { x: pelvis.x, y: pelvis.y - rig.torsoLength },
    collar: upper.collar,
    neck: upper.neck,
    headCenter: upper.headCenter,
    hairAnchor: { x: upper.headCenter.x - 10, y: upper.headCenter.y - 5 },
    hairMidWave: { x: upper.headCenter.x - 17, y: upper.headCenter.y + 8 },
    hairTip: { x: upper.headCenter.x - 22, y: upper.headCenter.y + 23 },
    torsoAngleRad: -Math.PI / 2,
    neckAngleRad: -Math.PI / 2,
    headAngleRad: 0,
    hairAngleRad: Math.PI * 0.65,
    hairLowerWaveAngleRad: Math.PI * 0.65,
    hairStyleMode,
    neutralStanding: true,
    pelvisTiltRad: 0,
    fallForwardComLeadPx: 0,
    nearLeg: standingLeg(pelvis, feet.kneeY, feet.ankleY, 1, rig),
    farLeg: standingLeg(pelvis, feet.kneeY, feet.ankleY, -2, rig),
    nearArm,
    farArm,
    isFlightPhase: false,
    footCrossoverDeltaX: -3,
  };
}

function standingFootAnchors(rig: AnatomicalRigSpec): {
  readonly ankleY: number;
  readonly kneeY: number;
  readonly pelvisY: number;
} {
  const ankleY = rig.groundY - 8;
  const kneeY = ankleY - rig.shinLength;
  return { ankleY, kneeY, pelvisY: kneeY - rig.thighLength };
}

function standingUpperBody(
  pelvis: Point2D,
  rig: AnatomicalRigSpec,
): { readonly shoulder: Point2D; readonly collar: Point2D; readonly neck: Point2D; readonly headCenter: Point2D } {
  const collar = { x: pelvis.x + 0.5, y: pelvis.y - rig.torsoLength - 8 };
  const shoulder = { x: pelvis.x + 0.5, y: pelvis.y - rig.torsoLength * 0.92 };
  const neck = { x: collar.x + 0.5, y: collar.y - rig.neckLength };
  const headCenter = { x: neck.x + 0.5, y: neck.y - rig.headRadius * 0.92 };
  return { shoulder, collar, neck, headCenter };
}

function hangingArm(
  shoulder: Point2D,
  upperLength: number,
  lowerLength: number,
  offsetX: number,
): LimbKinematics {
  const root = { x: shoulder.x + offsetX, y: shoulder.y };
  const elbow = projectAlong(root, NEUTRAL_ARM_ANGLE, upperLength);
  const wrist = projectAlong(elbow, NEUTRAL_ARM_ANGLE + 0.06, lowerLength);
  return {
    hipOrShoulder: root,
    midJoint: elbow,
    endEffector: wrist,
    heelPoint: wrist,
    ballPoint: projectAlong(wrist, NEUTRAL_ARM_ANGLE + 0.06, 6),
    tipPoint: projectAlong(wrist, NEUTRAL_ARM_ANGLE + 0.06, 12),
    upperAngleRad: NEUTRAL_ARM_ANGLE,
    lowerAngleRad: NEUTRAL_ARM_ANGLE + 0.06,
    distalAngleRad: NEUTRAL_ARM_ANGLE + 0.06,
    toeAngleRad: NEUTRAL_ARM_ANGLE + 0.06,
    heelLiftPx: 0,
    contactPhase: 'flight-reach',
    isGrounded: false,
  };
}

function standingLeg(
  pelvis: Point2D,
  kneeY: number,
  ankleY: number,
  offsetX: number,
  rig: AnatomicalRigSpec,
): LimbKinematics {
  const hip = { x: pelvis.x + offsetX, y: pelvis.y };
  const knee = { x: hip.x + offsetX * 0.3, y: kneeY };
  const ankle = { x: knee.x + offsetX * 0.2, y: ankleY };
  const heel = { x: ankle.x - rig.heelOffsetLength, y: ankleY + 8 };
  const ball = { x: ankle.x + rig.midfootLength, y: ankleY + 8 };
  const toe = { x: ball.x + rig.toeLength, y: ankleY + 8 };
  return {
    hipOrShoulder: hip,
    midJoint: knee,
    endEffector: ankle,
    heelPoint: heel,
    ballPoint: ball,
    tipPoint: toe,
    upperAngleRad: Math.PI / 2,
    lowerAngleRad: Math.PI / 2,
    distalAngleRad: 0,
    toeAngleRad: 0,
    heelLiftPx: 0,
    contactPhase: 'sole-roll',
    isGrounded: true,
  };
}

function projectAlong(point: Point2D, angleRad: number, length: number): Point2D {
  return {
    x: point.x + Math.cos(angleRad) * length,
    y: point.y + Math.sin(angleRad) * length,
  };
}
