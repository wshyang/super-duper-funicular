import type { GaitConfig, RigSpec } from '../core/types.js';

/**
 * Anthropometric stature fractions — height above the floor as a share of
 * standing height. These are published average adult proportions, not
 * measurements of any individual, and they are the only source of joint
 * positions. Art never adjusts a bone length; the `limbRatio` gate enforces it.
 *
 *   ankle    0.039   knee   0.285   hip (trochanter) 0.530
 *   waist    0.615   shoulder 0.818   chin 0.870   vertex 1.000
 *   upper arm 0.186 (acromion→radial head), forearm 0.146 (→ wrist)
 *
 * Note the consequence: arm / leg = 0.332 / 0.491 ≈ 0.68. The prior branches
 * settled on 0.535 after compensating for oversized cut-out arms, which still
 * reads as short. See docs/PIPELINE.md §5.2 and ADD-005.
 */
export const STATURE_FRACTIONS = {
  ankle: 0.039,
  knee: 0.285,
  hip: 0.53,
  waist: 0.615,
  shoulder: 0.818,
  chin: 0.87,
  vertex: 1,
  upperArm: 0.186,
  forearm: 0.146,
} as const;

export const CANVAS_WIDTH = 220;
export const CANVAS_HEIGHT = 256;
export const GROUND_Y = 234;
/** Standing height of the rendered figure in px. Leaves a 29 px headroom. */
export const STATURE_PX = 205;

const px = (fraction: number): number => Number((STATURE_PX * fraction).toFixed(2));
const yAt = (fraction: number): number => Number((GROUND_Y - STATURE_PX * fraction).toFixed(2));

/** Joint heights in sprite space, derived once from the fractions above. */
export const REST_JOINTS = {
  ankleY: yAt(STATURE_FRACTIONS.ankle),
  kneeY: yAt(STATURE_FRACTIONS.knee),
  hipY: yAt(STATURE_FRACTIONS.hip),
  waistY: yAt(STATURE_FRACTIONS.waist),
  shoulderY: yAt(STATURE_FRACTIONS.shoulder),
  chinY: yAt(STATURE_FRACTIONS.chin),
  vertexY: yAt(STATURE_FRACTIONS.vertex),
} as const;

export const DEFAULT_RIG: RigSpec = {
  canvasWidth: CANVAS_WIDTH,
  canvasHeight: CANVAS_HEIGHT,
  groundY: GROUND_Y,
  pelvisRestX: 100,
  pelvisRestY: REST_JOINTS.hipY,
  torsoLength: Number((REST_JOINTS.hipY - REST_JOINTS.shoulderY).toFixed(2)),
  neckLength: Number((REST_JOINTS.shoulderY - REST_JOINTS.chinY).toFixed(2)),
  headRadius: Number(((REST_JOINTS.chinY - REST_JOINTS.vertexY) / 2).toFixed(2)),
  hairLength: 34,
  upperArmLength: px(STATURE_FRACTIONS.upperArm),
  forearmLength: px(STATURE_FRACTIONS.forearm),
  handLength: 12,
  thighLength: Number((REST_JOINTS.kneeY - REST_JOINTS.hipY).toFixed(2)),
  shinLength: Number((REST_JOINTS.ankleY - REST_JOINTS.kneeY).toFixed(2)),
  footLength: 30,
  hipHalfWidth: 9,
  torsoHalfWidth: 15,
  limbRadius: { upperArm: 6.2, forearm: 5.2, hand: 4.6, thigh: 9.4, shin: 7 },
};

export const RUN_GAIT: GaitConfig = {
  cadenceHz: 1.5,
  strideLengthPx: 52,
  stanceDuty: 0.4,
  forwardLeanDeg: 13,
  footLiftPx: 26,
  armSwingScale: 1,
  kneeFlexScale: 1,
  pelvisBouncePx: 3,
  neckCounterScale: 0.55,
};

export const WALK_GAIT: GaitConfig = {
  cadenceHz: 1.1,
  strideLengthPx: 36,
  stanceDuty: 0.62,
  forwardLeanDeg: 5,
  footLiftPx: 13,
  armSwingScale: 0.6,
  kneeFlexScale: 0.7,
  pelvisBouncePx: 2.2,
  neckCounterScale: 0.45,
};

/** Ankle height above the sole when the foot is flat. */
export const ANKLE_HEIGHT_PX = Number((STATURE_PX * STATURE_FRACTIONS.ankle).toFixed(2));

export const ARM_LEG_RATIO =
  (STATURE_FRACTIONS.upperArm + STATURE_FRACTIONS.forearm) /
  (STATURE_FRACTIONS.hip - STATURE_FRACTIONS.ankle);
