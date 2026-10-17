/**
 * Body metrics in body units. One unit is the figure's standing height, so the
 * generated sprite is independent of pixels until the renderer scales it.
 * All lengths are vertical or along the bone unless the name says otherwise.
 *
 * A persona supplies a full metric set, which is what makes the sprite
 * "skinnable": nothing in the rig reads a global constant.
 *
 * Invariant: hipStandHeight + torsoLength + neckLength + headCenterOffset +
 * headRadiusY = 1. Standing on a straight leg, the crown is exactly one body
 * height above the ground, so the rig and the camera agree on scale.
 */
export interface BodyMetrics {
  readonly id: string;
  /** Real-world stature, used only for the readout (km/h, metres). */
  readonly statureMetres: number;
  readonly height: number;
  readonly ankleHeight: number;
  readonly thighLength: number;
  readonly shinLength: number;
  readonly legLength: number;
  readonly hipStandHeight: number;
  readonly torsoLength: number;
  readonly neckLength: number;
  readonly headCenterOffset: number;
  readonly headRadiusX: number;
  readonly headRadiusY: number;
  readonly upperArmLength: number;
  readonly forearmLength: number;
  readonly handRadius: number;
  // Foot: ankle at the origin, sole below it, ball at the metatarsal joint.
  readonly footHeel: number;
  readonly footBall: number;
  readonly footToe: number;
  readonly footSole: number;
  readonly footTop: number;
  readonly thighTopRadius: number;
  readonly thighKneeRadius: number;
  readonly shinKneeRadius: number;
  readonly shinAnkleRadius: number;
  readonly upperArmTopRadius: number;
  readonly upperArmElbowRadius: number;
  readonly forearmElbowRadius: number;
  readonly forearmWristRadius: number;
  readonly chestDepth: number;
  readonly waistDepth: number;
  readonly hipDepth: number;
  readonly shortsLength: number;
  readonly sockHeight: number;
  readonly sleeveLength: number;
  /** Shoulder joint position along the torso, 0 at the hip, 1 at the neck base. */
  readonly shoulderAt: number;
  readonly farLimbOffset: number;
}

const base = {
  height: 1,
  ankleHeight: 0.05,
  footHeel: -0.04,
  footBall: 0.046,
  footToe: 0.108,
  footSole: -0.05,
  footTop: 0.03,
  shoulderAt: 0.895,
  farLimbOffset: 0.014,
} as const;

/** Chinese Singaporean male runner: taller, longer legs, broader shoulders. */
export const MALE_BODY: BodyMetrics = {
  ...base,
  id: "sg-chinese-male",
  statureMetres: 1.73,
  thighLength: 0.245,
  shinLength: 0.235,
  legLength: 0.48,
  hipStandHeight: 0.5,
  torsoLength: 0.312,
  neckLength: 0.04,
  headCenterOffset: 0.068,
  headRadiusX: 0.066,
  headRadiusY: 0.08,
  upperArmLength: 0.152,
  forearmLength: 0.14,
  handRadius: 0.028,
  thighTopRadius: 0.06,
  thighKneeRadius: 0.037,
  shinKneeRadius: 0.043,
  shinAnkleRadius: 0.025,
  upperArmTopRadius: 0.041,
  upperArmElbowRadius: 0.027,
  forearmElbowRadius: 0.031,
  forearmWristRadius: 0.019,
  chestDepth: 0.094,
  waistDepth: 0.068,
  hipDepth: 0.074,
  shortsLength: 0.098,
  sockHeight: 0.105,
  sleeveLength: 0.072,
};

/**
 * Chinese Singaporean female runner: shorter stature, shorter legs, narrower
 * shoulders and waist, wider pelvis. The silhouette has to read as a different
 * person at a glance, not just a different colour.
 */
export const FEMALE_BODY: BodyMetrics = {
  ...base,
  id: "sg-chinese-female",
  statureMetres: 1.61,
  thighLength: 0.238,
  shinLength: 0.228,
  legLength: 0.466,
  hipStandHeight: 0.487,
  torsoLength: 0.313,
  neckLength: 0.044,
  headCenterOffset: 0.079,
  headRadiusX: 0.062,
  headRadiusY: 0.077,
  upperArmLength: 0.145,
  forearmLength: 0.132,
  handRadius: 0.025,
  thighTopRadius: 0.057,
  thighKneeRadius: 0.034,
  shinKneeRadius: 0.039,
  shinAnkleRadius: 0.023,
  upperArmTopRadius: 0.034,
  upperArmElbowRadius: 0.023,
  forearmElbowRadius: 0.027,
  forearmWristRadius: 0.017,
  chestDepth: 0.079,
  waistDepth: 0.056,
  hipDepth: 0.082,
  shortsLength: 0.092,
  sockHeight: 0.1,
  sleeveLength: 0.064,
};

/** Explicit joint limits, in radians, used by the gait solver and its tests. */
export const JOINT_LIMITS = {
  kneeMinFlexion: 0.03,
  kneeMaxFlexion: 2.45,
  hipMin: -1.25,
  hipMax: 1.3,
  shoulderMin: -1.15,
  shoulderMax: 1.0,
  /** Heel raise during toe-off. */
  hindfootMin: -1.15,
  hindfootMax: 0.25,
  /** Forefoot rotation at the ball. */
  forefootMin: -0.55,
  forefootMax: 0.3,
  neckMin: -0.35,
  neckMax: 0.5,
} as const;

export function bodyTop(body: BodyMetrics): number {
  return (
    body.hipStandHeight +
    body.torsoLength +
    body.neckLength +
    body.headCenterOffset +
    body.headRadiusY
  );
}
