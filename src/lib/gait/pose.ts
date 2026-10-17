import { add, angleDelta, angleFromDown, fromDown, scale, vec, type Vec2 } from "../geometry/vec.ts";
import type { BodyMetrics } from "../rig/body.ts";
import { footAt, type FootJoints } from "./foot.ts";
import { hipHeightAt, sampleLeg, supportState, type GaitParameters, type LegSample } from "./gait.ts";
import { solveTwoBone } from "./ik.ts";

export interface LegPose {
  readonly hip: Vec2;
  readonly knee: Vec2;
  readonly ankle: Vec2;
  readonly foot: FootJoints;
  readonly thighAngle: number;
  readonly shinAngle: number;
  readonly kneeFlexion: number;
  readonly hindAngle: number;
  readonly foreAngle: number;
  readonly sample: LegSample;
  readonly contact: Vec2;
  readonly isStance: boolean;
}

export interface ArmPose {
  readonly shoulder: Vec2;
  readonly elbow: Vec2;
  readonly wrist: Vec2;
  readonly handCenter: Vec2;
  readonly upperAngle: number;
  readonly forearmAngle: number;
  readonly elbowFlexion: number;
}

export interface SidePose {
  readonly leg: LegPose;
  readonly arm: ArmPose;
}

export interface RunnerPose {
  readonly phase: number;
  readonly hip: Vec2;
  /** Base of the neck: top of the torso, where the neck part pivots. */
  readonly neckBase: Vec2;
  /** Top of the neck: where the head part pivots. */
  readonly headBase: Vec2;
  readonly headCenter: Vec2;
  readonly torsoAngle: number;
  readonly neckAngle: number;
  readonly headAngle: number;
  readonly shoulder: Vec2;
  readonly hipHeight: number;
  readonly support: "near" | "far" | "flight";
  readonly near: SidePose;
  readonly far: SidePose;
}

/** Unit vector for a segment that points up in local space, leaning by `angle`. */
const up = (angle: number): Vec2 => vec(Math.sin(angle), Math.cos(angle));

const torsoDirection = (lean: number): Vec2 => fromDown(Math.PI - lean);

/**
 * The knee is always the forward solution. Solving both sides and keeping the
 * front-most joint is what stops the knee from snapping backwards when the
 * ankle is behind the hip, which happens at toe-off and in early swing.
 */
function frontKnee(hip: Vec2, ankle: Vec2, body: BodyMetrics) {
  const forward = solveTwoBone(hip, ankle, body.thighLength, body.shinLength, 1);
  const backward = solveTwoBone(hip, ankle, body.thighLength, body.shinLength, -1);
  return forward.joint.x >= backward.joint.x ? forward : backward;
}

function solveLeg(gait: GaitParameters, hip: Vec2, sample: LegSample, body: BodyMetrics): LegPose {
  const solution = frontKnee(hip, sample.ankle, body);
  const thighAngle = angleFromDown({ x: solution.joint.x - hip.x, y: solution.joint.y - hip.y });
  const shinAngle = angleFromDown({ x: solution.end.x - solution.joint.x, y: solution.end.y - solution.joint.y });
  const foot = footAt(solution.end, sample.hindAngle, sample.foreAngle, body);
  return {
    hip,
    knee: solution.joint,
    ankle: solution.end,
    foot,
    thighAngle,
    shinAngle,
    kneeFlexion: Math.abs(angleDelta(thighAngle, shinAngle)),
    hindAngle: sample.hindAngle,
    foreAngle: sample.foreAngle,
    sample,
    contact: foot.contact,
    isStance: sample.inStance,
  };
}

function solveArm(gait: GaitParameters, shoulder: Vec2, armPhase: number, body: BodyMetrics): ArmPose {
  // Arms hang from a vertical shoulder line, not from the leaning torso, so a
  // forward lean does not push the whole arm forward with it.
  const cosine = Math.cos(2 * Math.PI * armPhase);
  const upperAngle = gait.armBias - gait.armSwing * cosine;
  const flex = gait.elbowFlex - 0.22 * cosine;
  const forearmAngle = upperAngle + flex;
  const elbow = add(shoulder, scale(fromDown(upperAngle), body.upperArmLength));
  const wrist = add(elbow, scale(fromDown(forearmAngle), body.forearmLength));
  const handCenter = add(wrist, scale(fromDown(forearmAngle), body.handRadius * 0.55));
  return { shoulder, elbow, wrist, handCenter, upperAngle, forearmAngle, elbowFlexion: flex };
}

/**
 * Full pose for one phase. The trunk leans forward, the neck counter-rotates
 * part of that lean and the head counter-rotates more again, so the gaze stays
 * near level while the body falls forward over the support foot.
 */
export function solvePose(gait: GaitParameters, phase: number, body: BodyMetrics): RunnerPose {
  const hipHeight = hipHeightAt(gait, phase, body);
  const hip = vec(0, hipHeight);
  const breath = 0.012 * Math.sin(2 * Math.PI * phase);
  const torsoAngle = gait.lean + breath;
  const torso = torsoDirection(torsoAngle);
  const neckBase = add(hip, scale(torso, body.torsoLength));
  const neckAngle = torsoAngle * 0.52 + 0.02 * Math.sin(2 * Math.PI * phase + Math.PI / 2);
  const headBase = add(neckBase, scale(up(neckAngle), body.neckLength));
  const headAngle = neckAngle * 0.35 + 0.025 * Math.sin(4 * Math.PI * phase);
  const headCenter = add(headBase, scale(up(headAngle), body.headCenterOffset));
  const shoulder = add(hip, scale(torso, body.torsoLength * body.shoulderAt));
  const nearHip = add(hip, vec(0.008, 0));
  const farHip = add(hip, vec(-body.farLimbOffset, -0.002));
  const nearShoulder = add(shoulder, vec(0.005, -0.002));
  const farShoulder = add(shoulder, vec(-body.farLimbOffset, -0.004));
  return {
    phase,
    hip,
    neckBase,
    headBase,
    headCenter,
    torsoAngle,
    neckAngle,
    headAngle,
    shoulder,
    hipHeight,
    support: supportState(gait, phase),
    near: {
      leg: solveLeg(gait, nearHip, sampleLeg(gait, phase, body), body),
      arm: solveArm(gait, nearShoulder, phase, body),
    },
    far: {
      leg: solveLeg(gait, farHip, sampleLeg(gait, phase + 0.5, body), body),
      arm: solveArm(gait, farShoulder, phase + 0.5, body),
    },
  };
}

/** Closing speed of the planted ankle relative to the ground, body heights/s. */
export const stanceFootVelocity = (gait: GaitParameters): number => gait.strideLength / gait.cycleSeconds;

export { up as upDirection };
