import { type BodyProportions } from "./body-proportions.ts";
import { paintOp, type PaintOp } from "./paint-op.ts";
import { shade, type RunnerColors } from "./palette.ts";
import { capsule, circle, polygon } from "./shapes.ts";
import type { LegJoints, Skeleton, SideJoints } from "./skeleton.ts";
import { addVec, lerpVec, rotateVec, vec, type Vec2 } from "./vector.ts";

/** Far-side limbs are drawn in shadow to read as depth. */
const FAR_SHADE = 0.72;
/** Fraction of the upper arm covered by the sleeve. */
const SLEEVE_SHARE = 0.5;
/** Fraction of the thigh covered by the shorts, measured from the hip. */
const THIGH_COVER = 0.45;
/** Fraction of the shin, measured from the knee, that is sock. */
const SOCK_SHARE = 0.7;

/** Shoe outline in the foot frame: ankle at the origin, sole at y = -3, toe at +x. */
const SHOE_LOCAL: readonly Vec2[] = [
  vec(-3, -3),
  vec(6, -3),
  vec(7.5, -1.2),
  vec(6, 0.8),
  vec(-2.8, 0.8),
  vec(-3.8, -1),
];

/** Body paint operations in painter's order: far side, torso, head, shorts, near side. */
export function buildBodyOps(skeleton: Skeleton, body: BodyProportions, colors: RunnerColors): PaintOp[] {
  const far = sideOps(skeleton.far, body, colors, FAR_SHADE);
  const near = sideOps(skeleton.near, body, colors, 1);
  return [
    ...far.arm,
    ...far.leg,
    ...torsoOps(skeleton, body, colors),
    ...headOps(skeleton, body, colors),
    ...shortsOps(skeleton, body, colors),
    ...near.leg,
    ...near.arm,
  ];
}

interface SideOps {
  readonly arm: PaintOp[];
  readonly leg: PaintOp[];
}

function sideOps(side: SideJoints, body: BodyProportions, colors: RunnerColors, factor: number): SideOps {
  return { arm: armOps(side, body, colors, factor), leg: legOps(side.leg, body, colors, factor) };
}

function armOps(side: SideJoints, body: BodyProportions, colors: RunnerColors, factor: number): PaintOp[] {
  const { shoulder, elbow, wrist } = side.arm;
  const skin = shade(colors.skin, factor);
  const sleeveEnd = lerpVec(shoulder, elbow, SLEEVE_SHARE);
  return [
    paintOp(capsule(shoulder, sleeveEnd, body.upperArmRadius + 0.4, body.upperArmRadius), shade(colors.accent, factor)),
    paintOp(capsule(sleeveEnd, elbow, body.upperArmRadius, body.forearmRadius), skin),
    paintOp(capsule(elbow, wrist, body.forearmRadius, body.forearmRadius - 0.4), skin),
    paintOp(circle(wrist, body.handRadius), skin),
  ];
}

function legOps(leg: LegJoints, body: BodyProportions, colors: RunnerColors, factor: number): PaintOp[] {
  const skin = shade(colors.skin, factor);
  const sock = shade(colors.accent, factor);
  const thighEnd = lerpVec(leg.hip, leg.knee, THIGH_COVER);
  return [
    paintOp(capsule(thighEnd, leg.knee, body.thighRadius - 0.6, body.kneeRadius), skin),
    paintOp(capsule(leg.knee, leg.ankle, body.shinRadius, body.ankleRadius), skin),
    paintOp(capsule(lerpVec(leg.knee, leg.ankle, SOCK_SHARE), leg.ankle, body.shinRadius, body.ankleRadius), sock),
    paintOp(polygon(shoePoints(leg)), shade(colors.shoe, factor)),
  ];
}

/** The shoe outline placed at the ankle and rotated by the foot angle. */
export function shoePoints(leg: LegJoints): Vec2[] {
  return SHOE_LOCAL.map((point) => addVec(leg.ankle, rotateVec(point, leg.footAngle)));
}

function torsoOps(skeleton: Skeleton, body: BodyProportions, colors: RunnerColors): PaintOp[] {
  return [paintOp(capsule(skeleton.hip, skeleton.neck, body.waistRadius, body.torsoRadius), colors.accent)];
}

function shortsOps(skeleton: Skeleton, body: BodyProportions, colors: RunnerColors): PaintOp[] {
  const cover = lerpVec(skeleton.hip, skeleton.near.leg.knee, 0.5);
  return [paintOp(capsule(skeleton.hip, cover, body.shortsRadius, body.shortsRadius - 0.6), colors.shorts)];
}

function headOps(skeleton: Skeleton, body: BodyProportions, colors: RunnerColors): PaintOp[] {
  const { headCenter, neck } = skeleton;
  const radius = body.headRadius;
  const hairCenter = addVec(headCenter, vec(-1.4, 1.2));
  const faceCenter = addVec(headCenter, vec(0.6, -0.4));
  const nose = addVec(faceCenter, vec(radius - 0.6, -0.4));
  return [
    paintOp(capsule(neck, addVec(neck, vec(0, 1)), 2.6, 2.6), colors.skin),
    paintOp(circle(hairCenter, radius + 0.5), colors.hair),
    paintOp(circle(faceCenter, radius - 0.4), colors.skin),
    paintOp(polygon([nose, addVec(nose, vec(1.8, 0.3)), addVec(nose, vec(-0.2, -1.2))]), colors.skin),
    paintOp(circle(addVec(faceCenter, vec(2.8, 1.2)), 1), colors.eye),
  ];
}
