import { add, vec, type Vec2 } from "../geometry/vec.ts";
import type { BodyMetrics } from "../rig/body.ts";
import { solveTwoBone } from "./ik.ts";
import { phaseName, sampleLeg, wrapPhase, type GaitParameters } from "./gait.ts";

export interface ArticulatedPose {
  readonly phase: number;
  readonly phaseName: string;
  readonly pelvis: Vec2;
  readonly neck: Vec2;
  readonly head: Vec2;
  readonly hairTip: Vec2;
  readonly nearHip: Vec2;
  readonly nearKnee: Vec2;
  readonly nearAnkle: Vec2;
  readonly farHip: Vec2;
  readonly farKnee: Vec2;
  readonly farAnkle: Vec2;
  readonly nearShoulder: Vec2;
  readonly nearElbow: Vec2;
  readonly nearWrist: Vec2;
  readonly farShoulder: Vec2;
  readonly farElbow: Vec2;
  readonly farWrist: Vec2;
  readonly lean: number;
  readonly nearGrounded: boolean;
  readonly farGrounded: boolean;
  readonly footCrossover: number;
}

export function solvePose(phase: number, gait: GaitParameters, body: BodyMetrics): ArticulatedPose {
  const p = wrapPhase(phase);
  const bob = Math.cos((p - 0.125) * Math.PI * 4) * 0.018 * gait.bobGain;
  const pelvis = vec(0, body.hipStandHeight + bob);
  const lean = gait.lean;
  const neck = add(pelvis, vec(Math.sin(lean) * body.torsoLength, body.torsoLength * Math.cos(lean)));
  const head = add(neck, vec(Math.sin(lean) * body.neckLength, body.neckLength + body.headRadius * 0.4));
  const hairTip = add(head, vec(-0.08, 0.04));
  const nearLeg = sampleLeg(gait, p, body);
  const farLeg = sampleLeg(gait, p + 0.5, body);
  const nearHip = add(pelvis, vec(0.012, 0));
  const farHip = add(pelvis, vec(-0.012, 0));
  const nearIk = solveTwoBone(
    nearHip,
    add(pelvis, nearLeg.ankle),
    body.thighLength,
    body.shinLength,
    1,
  );
  const farIk = solveTwoBone(farHip, add(pelvis, farLeg.ankle), body.thighLength, body.shinLength, 1);
  const nearShoulder = add(neck, vec(0.02, -0.02));
  const farShoulder = add(neck, vec(-0.02, -0.02));
  const armPhase = p + 0.5;
  const nearArm = solveArm(nearShoulder, armPhase, gait, body, 1);
  const farArm = solveArm(farShoulder, p, gait, body, -1);
  return {
    phase: p,
    phaseName: phaseName(p),
    pelvis,
    neck,
    head,
    hairTip,
    nearHip,
    nearKnee: nearIk.joint,
    nearAnkle: nearIk.end,
    farHip,
    farKnee: farIk.joint,
    farAnkle: farIk.end,
    nearShoulder,
    nearElbow: nearArm.joint,
    nearWrist: nearArm.end,
    farShoulder,
    farElbow: farArm.joint,
    farWrist: farArm.end,
    lean,
    nearGrounded: nearLeg.inStance,
    farGrounded: farLeg.inStance,
    footCrossover: nearIk.end.x - farIk.end.x,
  };
}

function solveArm(
  shoulder: Vec2,
  phase: number,
  gait: GaitParameters,
  body: BodyMetrics,
  bend: 1 | -1,
) {
  const swing = Math.sin(wrapPhase(phase) * Math.PI * 2) * gait.armSwing;
  const target = add(shoulder, vec(Math.sin(swing) * 0.28, -0.22 - Math.cos(swing) * 0.04));
  return solveTwoBone(shoulder, target, body.upperArmLength, body.forearmLength, bend);
}
