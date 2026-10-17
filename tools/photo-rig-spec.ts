import type { Segment } from "../src/lib/photo/cut.ts";

/**
 * Trace data for one photographic plate. All numbers are pixels in the source
 * image. The joints were measured off the keyed silhouette: the hip is the
 * widest point of the shorts, the knee the narrowest point between the shorts
 * hem and the calf, the ankle the top of the shoe collar.
 */
export interface PhotoPlateSpec {
  readonly id: string;
  readonly label: string;
  readonly source: string;
  /** Sole and crown of the neutral figure, for the pixel-to-body-height scale. */
  readonly soleY: number;
  readonly crownY: number;
  /** Neutral-pose joint positions, in plate pixels. */
  readonly joints: {
    readonly headBase: [number, number];
    readonly neckBase: [number, number];
    readonly shoulder: [number, number];
    readonly elbow: [number, number];
    readonly hip: [number, number];
    readonly knee: [number, number];
    readonly ankle: [number, number];
    readonly ball: [number, number];
    readonly heel: [number, number];
    readonly toe: [number, number];
    readonly wrist: [number, number];
    readonly chin: [number, number];
  };
  readonly barriers: readonly Segment[];
  readonly parts: readonly {
    readonly id: "head" | "neck" | "torso" | "upperArm" | "forearm" | "thigh" | "shin" | "shoe" | "shoeToe";
    readonly seed: [number, number];
    readonly extension: number;
    readonly erase?: readonly (readonly (readonly [number, number])[])[];
    /**
     * Disc of extra pixels around a joint, kept on top of the child part so a
     * hinge never opens a wedge. The child is drawn later, so it covers the seam.
     */
    readonly cap?: { readonly centre: [number, number]; readonly radius: number };
  }[];
  /**
   * Posture adjustments for this rig. The photographic arms are longer than the
   * vector rig's, so an unchanged swing carries an open hand up to the chin;
   * a shorter, flatter swing keeps the hand at the hip and the forearm
   * horizontal instead of lifting an open palm to the chin.
   */
  readonly pose: { readonly armSwing: number; readonly armBias: number; readonly elbowFlex: number };
  /** World angles of each part in the plate, in the solver's convention. */
  readonly neutralAngles: {
    readonly torso: number;
    readonly neck: number;
    readonly head: number;
    readonly upperArm: number;
    readonly forearm: number;
    readonly thigh: number;
    readonly shin: number;
    readonly foot: number;
  };
}

/**
 * The hero plate: a Singaporean Chinese woman standing in profile on a green
 * screen, arms and legs straight so every segment can be rigidly re-posed.
 */
export const FEMALE_PHOTO: PhotoPlateSpec = {
  id: "sg-chinese-female-photo",
  label: "Singaporean Chinese, female (photoreal)",
  source: "src/images/photo/sg-chinese-female__neutral-profile__chroma-green__source.png",
  soleY: 1302,
  crownY: 83,
  joints: {
    headBase: [378, 225],
    neckBase: [370, 275],
    shoulder: [346, 300],
    elbow: [283, 528],
    hip: [378, 700],
    knee: [365, 962],
    ankle: [365, 1255],
    ball: [440, 1298],
    heel: [297, 1298],
    toe: [497, 1298],
    wrist: [222, 752],
    chin: [444, 230],
  },
  barriers: [
    // Under the jaw: separates head (with hair and ponytail) from the neck.
    { from: [305, 272], to: [452, 232] },
    // The singlet collar: separates the neck from the torso.
    { from: [300, 292], to: [430, 252] },
    // Armpit, up the deltoid's inner edge, to the collar: separates the arm
    // from the torso. The path passes on the far side of the shoulder pivot so
    // the arm texture owns its own rotation centre.
    { from: [311, 552], to: [352, 340] },
    { from: [352, 340], to: [378, 266] },
    // Across the elbow, perpendicular to the arm axis.
    { from: [228, 508], to: [330, 548] },
    // Lower shorts line: the thigh keeps a short apron of fabric above the hem
    // so a swinging leg never opens a hole, while the torso keeps the rest of
    // the shorts and covers the seam.
    { from: [285, 760], to: [480, 760] },
    // Knee.
    { from: [305, 962], to: [425, 962] },
    // Top of the shoe collar.
    { from: [300, 1168], to: [444, 1168] },
    // Ball of the foot: the toe hinge.
    { from: [440, 1310], to: [440, 1150] },
  ],
  parts: [
    { id: "head", seed: [390, 150], extension: 3 },
    { id: "neck", seed: [372, 262], extension: 2, cap: { centre: [370, 275], radius: 34 } },
    { id: "torso", seed: [392, 600], extension: 3, cap: { centre: [378, 700], radius: 58 } },
    { id: "upperArm", seed: [286, 480], extension: 7, cap: { centre: [346, 300], radius: 46 } },
    { id: "forearm", seed: [240, 680], extension: 6, cap: { centre: [283, 528], radius: 44 } },
    { id: "thigh", seed: [390, 860], extension: 6, cap: { centre: [378, 700], radius: 58 } },
    { id: "shin", seed: [362, 1060], extension: 6, cap: { centre: [365, 962], radius: 50 } },
    // The far shoe peeks out behind the near one; it belongs to the other
    // foot, so the toe keeps only the near shoe's own forefoot.
    {
      id: "shoe",
      // The ankle cap keeps the sock/shoe junction closed when the hindfoot
      // rotates for the heel peel.
      cap: { centre: [365, 1255], radius: 44 },
      seed: [350, 1265],
      extension: 8,
      erase: [
        // Everything below the declared sole: the solver grounds the ankle on
        // `soleY`, so texture past it would be dragged through the floor.
        [[280, 1303], [560, 1303], [560, 1400], [280, 1400]],
        // Forward and low = the toe box. The lace panel and collar above the
        // ball stay on the hindfoot: they sit over the midfoot and must not
        // swing up with the toes.
        [[444, 1252], [560, 1252], [560, 1303], [444, 1303]],
      ],
    },
    {
      id: "shoeToe",
      // The hinge sits on the ball. A small disc of shoe pixels around it is
      // kept on the child, which is drawn after the hindfoot, so the hinge
      // stays covered however far the two halves rotate apart.
      cap: { centre: [440, 1298], radius: 13 },
      seed: [470, 1290],
      extension: 4,
      erase: [
        // The toe owns the forefoot and nothing else: everything behind the
        // ball, everything above the lace line, and everything past the sole
        // is removed so the child cannot swing a sail or dig under the floor.
        [[280, 1140], [436, 1140], [436, 1303], [280, 1303]],
        [[280, 1140], [560, 1140], [560, 1252], [280, 1252]],
        [[280, 1303], [560, 1303], [560, 1400], [280, 1400]],
      ],
    },
  ],
  pose: { armSwing: 0.35, armBias: -0.05, elbowFlex: 1.45 },
  neutralAngles: {
    torso: -0.019,
    neck: 0.158,
    head: 0.029,
    upperArm: -0.269,
    forearm: -0.266,
    thigh: -0.05,
    shin: 0,
    foot: 0,
  },
};
