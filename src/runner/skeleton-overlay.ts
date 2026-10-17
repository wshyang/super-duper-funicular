import { paintOp, type PaintOp } from "./paint-op.ts";
import type { Rgb } from "./palette.ts";
import { capsule, circle } from "./shapes.ts";
import type { Skeleton } from "./skeleton.ts";

const BONE_COLOR: Rgb = [0x3a, 0xe0, 0xff];
const JOINT_COLOR: Rgb = [0xff, 0xe0, 0x3a];
const BONE_RADIUS = 0.45;
const JOINT_RADIUS = 1;

/** Debug overlay: bones and joints as thin shapes, painted on top of the body. */
export function buildSkeletonOverlayOps(skeleton: Skeleton): PaintOp[] {
  const bones = [
    capsule(skeleton.hip, skeleton.neck, BONE_RADIUS, BONE_RADIUS),
    capsule(skeleton.neck, skeleton.headCenter, BONE_RADIUS, BONE_RADIUS),
    ...[skeleton.near, skeleton.far].flatMap((side) => [
      capsule(side.leg.hip, side.leg.knee, BONE_RADIUS, BONE_RADIUS),
      capsule(side.leg.knee, side.leg.ankle, BONE_RADIUS, BONE_RADIUS),
      capsule(side.arm.shoulder, side.arm.elbow, BONE_RADIUS, BONE_RADIUS),
      capsule(side.arm.elbow, side.arm.wrist, BONE_RADIUS, BONE_RADIUS),
    ]),
  ];
  const joints = [skeleton.hip, skeleton.neck, ...[skeleton.near, skeleton.far].flatMap((side) => [side.leg.knee, side.leg.ankle, side.arm.elbow, side.arm.wrist])];
  return [
    ...bones.map((shape) => paintOp(shape, BONE_COLOR)),
    ...joints.map((joint) => paintOp(circle(joint, JOINT_RADIUS), JOINT_COLOR)),
  ];
}
