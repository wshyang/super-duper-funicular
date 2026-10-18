import type { Point2D, RigLimbChain, RigPose, SkeletonSpec } from '../shared/rig.js';
import { SKELETON_PARAM_COUNT } from '../shared/rig.js';

/**
 * Segment lengths as fractions of standing figure height (Drillis–Contini
 * anthropometrics, side-view adjusted; profileAdjusted head radius ≈ H/15.4).
 */
export const BONE_FRACTIONS = {
  torso: 0.288,
  upperArm: 0.186,
  forearm: 0.146,
  hand: 0.108,
  thigh: 0.245,
  shin: 0.22,
  foot: 0.152,
  headRadius: 0.065,
  neck: 0.05,
  shoulderDrop: 0.04,
  hipSpread: 0.012,
  thighRadius: 0.024,
  shinRadius: 0.016,
  footRadius: 0.011,
  upperArmRadius: 0.018,
  forearmRadius: 0.014,
  handRadius: 0.01,
} as const;

export interface Capsule {
  readonly ax: number;
  readonly ay: number;
  readonly bx: number;
  readonly by: number;
  readonly radiusPx: number;
}

function limbChain(root: Point2D, angleA: number, lenA: number, angleB: number, lenB: number, angleC: number, lenC: number): RigLimbChain {
  const mid = { x: root.x + lenA * Math.sin(angleA), y: root.y + lenA * Math.cos(angleA) };
  const tip = { x: mid.x + lenB * Math.sin(angleB), y: mid.y + lenB * Math.cos(angleB) };
  const end = { x: tip.x + lenC * Math.sin(angleC), y: tip.y + lenC * Math.cos(angleC) };
  return { root, mid, tip, end };
}

export function solveRigPose(spec: SkeletonSpec, figureHeightPx: number): RigPose {
  const length = (fraction: number): number => fraction * figureHeightPx;
  const pelvis: Point2D = { x: spec.pelvisX, y: spec.pelvisY };
  const pitch = spec.torsoPitchRad;
  const collar: Point2D = { x: pelvis.x + length(BONE_FRACTIONS.torso) * Math.sin(pitch), y: pelvis.y - length(BONE_FRACTIONS.torso) * Math.cos(pitch) };
  const waist: Point2D = { x: pelvis.x + (collar.x - pelvis.x) * 0.45, y: pelvis.y + (collar.y - pelvis.y) * 0.45 };
  const neckAngle = pitch + spec.headTiltRad;
  const neckBase: Point2D = { x: collar.x + length(BONE_FRACTIONS.neck) * 0.4 * Math.sin(pitch), y: collar.y - length(BONE_FRACTIONS.neck) * 0.4 * Math.cos(pitch) };
  const headCenter: Point2D = { x: neckBase.x + length(BONE_FRACTIONS.neck + BONE_FRACTIONS.headRadius) * Math.sin(neckAngle), y: neckBase.y - length(BONE_FRACTIONS.neck + BONE_FRACTIONS.headRadius) * Math.cos(neckAngle) };
  const nearShoulder: Point2D = { x: collar.x + length(BONE_FRACTIONS.hipSpread), y: collar.y + length(BONE_FRACTIONS.shoulderDrop) };
  const farShoulder: Point2D = { x: collar.x - length(BONE_FRACTIONS.hipSpread), y: collar.y + length(BONE_FRACTIONS.shoulderDrop) };
  return {
    pelvis, waist, collar, neckBase, headCenter,
    headRadiusPx: length(BONE_FRACTIONS.headRadius),
    nearArm: limbChain(nearShoulder, spec.nearShoulderRad, length(BONE_FRACTIONS.upperArm), spec.nearElbowRad, length(BONE_FRACTIONS.forearm), spec.nearHandRad, length(BONE_FRACTIONS.hand)),
    farArm: limbChain(farShoulder, spec.farShoulderRad, length(BONE_FRACTIONS.upperArm), spec.farElbowRad, length(BONE_FRACTIONS.forearm), spec.farHandRad, length(BONE_FRACTIONS.hand)),
    nearLeg: limbChain({ x: pelvis.x + length(BONE_FRACTIONS.hipSpread), y: pelvis.y }, spec.nearThighRad, length(BONE_FRACTIONS.thigh), spec.nearShinRad, length(BONE_FRACTIONS.shin), footAngleToLimb(spec.nearFootRad), length(BONE_FRACTIONS.foot)),
    farLeg: limbChain({ x: pelvis.x - length(BONE_FRACTIONS.hipSpread), y: pelvis.y }, spec.farThighRad, length(BONE_FRACTIONS.thigh), spec.farShinRad, length(BONE_FRACTIONS.shin), footAngleToLimb(spec.farFootRad), length(BONE_FRACTIONS.foot)),
    figureHeightPx,
  };
}

/** Foot angles are measured from +x; convert to the limb-chain's from-down convention. */
function footAngleToLimb(footRad: number): number {
  return Math.PI / 2 - footRad;
}

export function specToVector(spec: SkeletonSpec): number[] {
  return [
    spec.pelvisX, spec.pelvisY, spec.torsoPitchRad, spec.headTiltRad,
    spec.nearThighRad, spec.nearShinRad, spec.nearFootRad,
    spec.farThighRad, spec.farShinRad, spec.farFootRad,
    spec.nearShoulderRad, spec.nearElbowRad, spec.nearHandRad,
    spec.farShoulderRad, spec.farElbowRad, spec.farHandRad,
  ];
}

export function vectorToSpec(vector: readonly number[]): SkeletonSpec {
  if (vector.length !== SKELETON_PARAM_COUNT) throw new Error(`Expected ${SKELETON_PARAM_COUNT} parameters`);
  return {
    pelvisX: vector[0], pelvisY: vector[1], torsoPitchRad: vector[2], headTiltRad: vector[3],
    nearThighRad: vector[4], nearShinRad: vector[5], nearFootRad: vector[6],
    farThighRad: vector[7], farShinRad: vector[8], farFootRad: vector[9],
    nearShoulderRad: vector[10], nearElbowRad: vector[11], nearHandRad: vector[12],
    farShoulderRad: vector[13], farElbowRad: vector[14], farHandRad: vector[15],
  };
}

export function capsulesFromPose(pose: RigPose): Capsule[] {
  const height = pose.figureHeightPx;
  return [
    { ax: pose.pelvis.x, ay: pose.pelvis.y, bx: pose.waist.x, by: pose.waist.y, radiusPx: 0.052 * height },
    { ax: pose.waist.x, ay: pose.waist.y, bx: pose.neckBase.x, by: pose.neckBase.y, radiusPx: 0.045 * height },
    { ax: pose.headCenter.x, ay: pose.headCenter.y, bx: pose.headCenter.x, by: pose.headCenter.y, radiusPx: pose.headRadiusPx },
    ...armCapsules(pose.nearArm, 0.018 * height, 0.014 * height, 0.01 * height),
    ...armCapsules(pose.farArm, 0.018 * height, 0.014 * height, 0.01 * height),
    ...legCapsules(pose.nearLeg, 0.024 * height, 0.016 * height, 0.011 * height),
    ...legCapsules(pose.farLeg, 0.024 * height, 0.016 * height, 0.011 * height),
  ];
}

function armCapsules(arm: RigLimbChain, upperR: number, foreR: number, handR: number): Capsule[] {
  return [
    { ax: arm.root.x, ay: arm.root.y, bx: arm.mid.x, by: arm.mid.y, radiusPx: upperR },
    { ax: arm.mid.x, ay: arm.mid.y, bx: arm.tip.x, by: arm.tip.y, radiusPx: foreR },
    { ax: arm.tip.x, ay: arm.tip.y, bx: arm.end.x, by: arm.end.y, radiusPx: handR },
  ];
}

function legCapsules(leg: RigLimbChain, thighR: number, shinR: number, footR: number): Capsule[] {
  return [
    { ax: leg.root.x, ay: leg.root.y, bx: leg.mid.x, by: leg.mid.y, radiusPx: thighR },
    { ax: leg.mid.x, ay: leg.mid.y, bx: leg.tip.x, by: leg.tip.y, radiusPx: shinR },
    { ax: leg.tip.x, ay: leg.tip.y, bx: leg.end.x, by: leg.end.y, radiusPx: footR },
  ];
}

export function rasterizeRigMask(pose: RigPose, width: number, height: number): Uint8Array {
  const capsules = capsulesFromPose(pose);
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isInsideAnyCapsule(x, y, capsules)) continue;
      mask[y * width + x] = 1;
    }
  }
  return mask;
}

function isInsideAnyCapsule(x: number, y: number, capsules: readonly Capsule[]): boolean {
  for (const capsule of capsules) {
    const dx = capsule.bx - capsule.ax;
    const dy = capsule.by - capsule.ay;
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq < 1e-9 ? 0 : clamp01(((x - capsule.ax) * dx + (y - capsule.ay) * dy) / lengthSq);
    const nearestX = capsule.ax + t * dx;
    const nearestY = capsule.ay + t * dy;
    const radiusSq = capsule.radiusPx * capsule.radiusPx;
    if ((x + 0.5 - nearestX) ** 2 + (y + 0.5 - nearestY) ** 2 <= radiusSq) return true;
  }
  return false;
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}
