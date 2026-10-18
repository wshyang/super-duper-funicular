import { projectPoint } from '../core/geometry.js';
import type { Capsule, LimbSegment, MaterialId, Point2D, PoseFrame } from '../core/types.js';
import { DEFAULT_FOOT, solveFoot } from '../rig/foot-roll.js';
import { DEFAULT_RIG, GROUND_Y, STATURE_FRACTIONS, STATURE_PX } from '../rig/spec.js';

/**
 * The neutral standing pose. Its joint heights are the anthropometric rest
 * skeleton, and it is also the pose the source photograph must be in — that
 * correspondence is what lets an atlas built from a standing photograph drive a
 * running rig.
 */
export function solveStandingPose(): PoseFrame {
  const rig = DEFAULT_RIG;
  const x = rig.pelvisRestX;
  const hip: Point2D = { x, y: rig.pelvisRestY };
  const torsoTop: Point2D = { x, y: hip.y - rig.torsoLength };
  const neckTop: Point2D = { x, y: torsoTop.y - rig.neckLength };
  const headCenter: Point2D = { x: x + 1, y: neckTop.y - rig.headRadius };
  const ankleY = GROUND_Y - STATURE_PX * STATURE_FRACTIONS.ankle;
  const nearAnkle: Point2D = { x: x + 3, y: ankleY };
  const farAnkle: Point2D = { x: x - 3, y: ankleY };
  const shoulder: Point2D = { x: x + 3, y: torsoTop.y + 3 };
  const elbow: Point2D = { x: shoulder.x, y: shoulder.y + rig.upperArmLength };
  const wrist: Point2D = { x: elbow.x, y: elbow.y + rig.forearmLength };
  const nearFoot = solveFoot(nearAnkle, 0, DEFAULT_FOOT, GROUND_Y, 'stance');
  const farFoot = solveFoot(farAnkle, 0, DEFAULT_FOOT, GROUND_Y, 'stance');
  return {
    phase: 0,
    frameIndex: 0,
    pelvis: hip,
    torsoTop,
    headCenter,
    hairTip: { x: headCenter.x - rig.headRadius * 0.9 - 6, y: headCenter.y + rig.headRadius * 1.2 },
    nearLeg: standingLeg('near', { x: x + 2, y: hip.y }, nearAnkle, rig),
    farLeg: standingLeg('far', { x: x - 3, y: hip.y }, farAnkle, rig),
    nearArm: standingArm('near', shoulder, elbow, wrist, rig),
    farArm: standingArm('far', { x: shoulder.x - 6, y: shoulder.y }, { x: elbow.x - 6, y: elbow.y }, { x: wrist.x - 6, y: wrist.y }, rig),
    torso: capsuleFrom(torsoTop, hip, rig.torsoHalfWidth * 0.92, rig.torsoHalfWidth, 'fabric'),
    pelvisCapsule: capsuleFrom({ x, y: hip.y + 9 }, { x, y: hip.y - 3 }, rig.hipHalfWidth + 4, rig.hipHalfWidth + 2, 'fabric'),
    neck: capsuleFrom(torsoTop, neckTop, 5.4, 4.8, 'skin'),
    head: capsuleFrom(
      { x: x + 1, y: neckTop.y },
      { x: x + 1, y: neckTop.y - rig.headRadius * 1.72 },
      rig.headRadius * 0.86,
      rig.headRadius * 0.8,
      'skin',
    ),
    hair: capsuleFrom(
      { x: headCenter.x - rig.headRadius * 0.3, y: headCenter.y - rig.headRadius * 0.72 },
      { x: headCenter.x - rig.headRadius * 0.9 - 6, y: headCenter.y + rig.headRadius * 1.2 },
      4.6,
      2.4,
      'hair',
    ),
    nearFoot,
    farFoot,
    groundY: GROUND_Y,
  };
}

function capsuleFrom(a: Point2D, b: Point2D, rStart: number, rEnd: number, material: MaterialId): Capsule {
  return { a, b, radiusStart: rStart, radiusEnd: rEnd, material };
}

function standingLeg(side: 'near' | 'far', hip: Point2D, ankle: Point2D, rig: typeof DEFAULT_RIG): LimbSegment[] {
  const knee: Point2D = { x: (hip.x + ankle.x) / 2 + 1, y: hip.y + rig.thighLength };
  return [
    { id: `${side}Thigh`, side, capsule: capsuleFrom(hip, knee, rig.limbRadius.thigh, rig.limbRadius.thigh * 0.84, side === 'near' ? 'skin' : 'skinFar') },
    { id: `${side}Shin`, side, capsule: capsuleFrom(knee, ankle, rig.limbRadius.shin, rig.limbRadius.shin * 0.68, side === 'near' ? 'skin' : 'skinFar') },
  ];
}

function standingArm(
  side: 'near' | 'far',
  shoulder: Point2D,
  elbow: Point2D,
  wrist: Point2D,
  rig: typeof DEFAULT_RIG,
): LimbSegment[] {
  const material: MaterialId = side === 'near' ? 'skin' : 'skinFar';
  const handTip = projectPoint(wrist, Math.PI / 2, rig.handLength);
  return [
    { id: `${side}UpperArm`, side, capsule: capsuleFrom(shoulder, elbow, rig.limbRadius.upperArm + 1.5, rig.limbRadius.upperArm, material) },
    { id: `${side}Forearm`, side, capsule: capsuleFrom(elbow, wrist, rig.limbRadius.forearm + 1, rig.limbRadius.forearm * 0.86, material) },
    { id: `${side}Hand`, side, capsule: capsuleFrom(wrist, handTip, 5.2, 3.8, material) },
  ];
}
