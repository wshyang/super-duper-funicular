import { type BodyProportions } from "./body-proportions.ts";
import type { GaitSample, LegSample } from "./gait.ts";
import { solveTwoBone } from "./two-bone-ik.ts";
import { addVec, directionFromDown, lerpVec, scaleVec, vec, type Vec2 } from "./vector.ts";

export interface LegJoints {
  readonly hip: Vec2;
  readonly knee: Vec2;
  readonly ankle: Vec2;
  readonly footAngle: number;
}

export interface ArmJoints {
  readonly shoulder: Vec2;
  readonly elbow: Vec2;
  readonly wrist: Vec2;
}

export interface SideJoints {
  readonly leg: LegJoints;
  readonly arm: ArmJoints;
}

export interface Skeleton {
  readonly hip: Vec2;
  readonly neck: Vec2;
  readonly headCenter: Vec2;
  readonly headAngle: number;
  readonly torsoAngle: number;
  readonly near: SideJoints;
  readonly far: SideJoints;
}

export interface ArmInput {
  readonly shoulder: Vec2;
  /** World angle of the upper arm, from straight down, positive forward. */
  readonly upperAngle: number;
  readonly elbowFlex: number;
}

export interface SideInput {
  readonly hip: Vec2;
  readonly shoulder: Vec2;
  readonly torsoAngle: number;
  readonly shoulderAngle: number;
  readonly elbowFlex: number;
  readonly legSample: LegSample;
}

/** Torso points up, leaning forward by `lean`; expressed in the from-down convention. */
function torsoDirection(lean: number): Vec2 {
  return directionFromDown(Math.PI - lean);
}

export function buildLeg(hip: Vec2, sample: LegSample, body: BodyProportions): LegJoints {
  const target = addVec(hip, vec(sample.ankleOffset.x, sample.ankleOffset.y));
  const solution = solveTwoBone(hip, target, { first: body.thighLength, second: body.shinLength }, 1);
  return { hip, knee: solution.joint, ankle: solution.end, footAngle: sample.footAngle };
}

export function buildArm(input: ArmInput, body: BodyProportions): ArmJoints {
  const elbow = addVec(input.shoulder, scaleVec(directionFromDown(input.upperAngle), body.upperArmLength));
  const forearmAngle = input.upperAngle + input.elbowFlex;
  const wrist = addVec(elbow, scaleVec(directionFromDown(forearmAngle), body.forearmLength));
  return { shoulder: input.shoulder, elbow, wrist };
}

export function buildSide(input: SideInput, body: BodyProportions): SideJoints {
  return {
    leg: buildLeg(input.hip, input.legSample, body),
    arm: buildArm(
      { shoulder: input.shoulder, upperAngle: input.torsoAngle + input.shoulderAngle, elbowFlex: input.elbowFlex },
      body,
    ),
  };
}

/** Forward kinematics for torso, head and arms; inverse kinematics for legs. */
export function buildSkeleton(sample: GaitSample, body: BodyProportions): Skeleton {
  const hip = vec(0, sample.hipHeight);
  const torsoAngle = sample.torsoLean;
  const neck = addVec(hip, scaleVec(torsoDirection(torsoAngle), body.torsoLength));
  const headAngle = sample.torsoLean * 0.5;
  const headCenter = addVec(neck, scaleVec(torsoDirection(headAngle), body.neckLength + body.headRadius));
  const shoulder = lerpVec(hip, neck, 0.85);
  const common = { hip, shoulder, torsoAngle, elbowFlex: sample.elbowFlex };
  return {
    hip,
    neck,
    headCenter,
    headAngle,
    torsoAngle,
    near: buildSide({ ...common, shoulderAngle: sample.nearShoulder, legSample: sample.near }, body),
    far: buildSide({ ...common, shoulderAngle: sample.farShoulder, legSample: sample.far }, body),
  };
}
