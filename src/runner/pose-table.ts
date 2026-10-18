import type { SkeletonSpec } from '../shared/rig.js';

/**
 * Per-key observed limb poses for the eight P2 key plates (radians, rig convention).
 * Keys 05–08 mirror keys 01–04 with near/far limbs exchanged (opposite stride half).
 * Values were read off the plate figures and audited via the skeleton overlay sheet;
 * pelvis position and torso pitch are aligned per plate at runtime.
 *
 * Order: nearThigh, nearShin, nearFoot, farThigh, farShin, farFoot,
 *        nearShoulder, nearElbow, nearHand, farShoulder, farElbow, farHand.
 */
const LIMB_TABLE: readonly (readonly [number, number, number, number, number, number, number, number, number, number, number, number])[] = [
  [0.44, 0.4, -0.27, -0.52, -1.09, 1.79, 0.5, 1.25, 0.85, -0.55, 0.85, 0.45],
  [-0.28, -0.74, 0.84, -0.43, 2.39, 1.28, 0.75, 1.35, 0.6, -0.85, 0.35, 0.25],
  [-0.46, -0.32, 0.81, -0.34, -0.27, 0.66, 0.65, 1.45, 0.55, -0.7, 0.55, 0.3],
  [-0.71, -0.41, 1.55, -0.5, 2.25, 2.63, 0.7, 1.3, 0.7, -0.75, 0.45, 0.3],
];

export function seedSpecForKey(keyIndex: number, pelvisX: number, pelvisY: number): SkeletonSpec {
  const limbs = keyIndex < 4 ? LIMB_TABLE[keyIndex] : swapLimbTable(LIMB_TABLE[keyIndex - 4]);
  return {
    pelvisX,
    pelvisY,
    torsoPitchRad: 0.14,
    headTiltRad: -0.05,
    nearThighRad: limbs[0],
    nearShinRad: limbs[1],
    nearFootRad: limbs[2],
    farThighRad: limbs[3],
    farShinRad: limbs[4],
    farFootRad: limbs[5],
    nearShoulderRad: limbs[6],
    nearElbowRad: limbs[7],
    nearHandRad: limbs[8],
    farShoulderRad: limbs[9],
    farElbowRad: limbs[10],
    farHandRad: limbs[11],
  };
}

function swapLimbTable(limbs: readonly number[]): readonly number[] {
  return [limbs[3], limbs[4], limbs[5], limbs[0], limbs[1], limbs[2], limbs[9], limbs[10], limbs[11], limbs[6], limbs[7], limbs[8]];
}
