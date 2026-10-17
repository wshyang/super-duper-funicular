import type { PartMatte, Segment } from "../src/lib/photo/cut.ts";

/**
 * Trace data for one photographic plate. All numbers are pixels in the source
 * image. The joints were measured off the keyed silhouette: the hip is the
 * widest point of the shorts, the knee the narrowest point between the shorts
 * hem and the calf, the ankle the top of the shoe collar.
 */
export interface PhotoPlateSpec {
  readonly id: string;
  /** Manifest filename stem, written to public/sprites/photo/<rig>.json. */
  readonly rig: string;
  readonly label: string;
  readonly source: string;
  /** Real-world stature, for the walk-to-run scaling. */
  readonly statureMetres: number;
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
    /** Keeps the part on one colour family, so a crease needs no traced fence. */
    readonly matte?: PartMatte;
    readonly erase?: readonly (readonly (readonly [number, number])[])[];
  }[];
  /**
   * Ball-and-socket joints. A disc centred on the pivot is the only boundary a
   * rotation leaves unchanged, so each link hands the child a ball of exactly
   * the socket the parent gives up. `child: null` rounds the parent's end only.
   */
  readonly links: readonly {
    readonly joint: keyof PhotoPlateSpec["joints"];
    readonly parent: PhotoPlateSpec["parts"][number]["id"];
    readonly child: PhotoPlateSpec["parts"][number]["id"] | null;
    /** Must reach past the cut line on both sides of the limb. */
    readonly radius: number;
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
  rig: "female-rig",
  label: "Singaporean Chinese, female (photoreal)",
  statureMetres: 1.61,
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
    // No collar line: the singlet's own edge is the boundary. The torso keeps
    // fabric only and the neck keeps skin only, so the two meet exactly on the
    // collar. A drawn line there was the bug: the neck was a 15 px sliver that
    // carried a disc of shoulder and strap around with it.
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
    // Skin only, so the strap and the hair stay out of the neck's rotation.
    // A generous extension is the seal: the extra band rides up under the jaw
    // and down under the singlet's collar, where the head and the torso cover
    // it, so neither the neck's top edge nor its bottom edge can be exposed
    // when the head turns or the trunk leans.
    { id: "neck", seed: [372, 262], extension: 14, matte: "skin" },
    // Fabric only: in the plate her arms are pulled back, and a colour-blind
    // flood leaves a ghost of the near arm baked into the torso. A fabric matte
    // cannot cross the skin of an arm.
    { id: "torso", seed: [392, 600], extension: 3, matte: "fabric" },
    // Skin only: the arm must not carry the singlet's strap into its rotation.
    { id: "upperArm", seed: [286, 480], extension: 7, matte: "skin" },
    { id: "forearm", seed: [240, 680], extension: 6, matte: "skin" },
    { id: "thigh", seed: [390, 860], extension: 6 },
    { id: "shin", seed: [362, 1060], extension: 6 },
    // The far shoe peeks out behind the near one; it belongs to the other
    // foot, so the toe keeps only the near shoe's own forefoot.
    {
      id: "shoe",
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
  // Every radius is half the opaque width measured across that joint, less a
  // pixel. A ball that wide is inscribed in the limb, so at rest none of its
  // filled face shows; at a bend it is exactly wide enough to reach both of the
  // limb's edges, which is where the wedge would otherwise open.
  links: [
    // Knee: 80 px across the plate at the joint.
    { joint: "knee", parent: "thigh", child: "shin", radius: 39 },
    // The ankle and the ball of the foot are deliberately not ball joints.
    // Their pivots sit 47 and 4 pixels above the sole, so a solid ball big
    // enough to bridge the seam would protrude through the ground plane. A
    // shoe collar is a clothing boundary anyway: it turns *over* the sock, and
    // the shoe's straight top edge is exactly what a collar looks like.
    // Elbow, across the forearm seam.
    { joint: "elbow", parent: "upperArm", child: "forearm", radius: 26 },
    // The shoulder is *not* a ball joint: its seam follows the deltoid's inner
    // edge, and a ball big enough to reach that line would drag the strap.
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

/**
 * The male plate, shot to the same contract as the female one: profile facing
 * right, arms hanging, green screen, same kit. Joints are measured off his own
 * silhouette rather than copied from the female plate — he is 12 cm taller, his
 * shoe is longer and his neck sits further forward.
 */
/**
 * Draft. Measured on the male plate that was superseded by the re-shoot, so
 * every joint here is off by the difference between the two frames. Re-measure
 * against the current plate before extracting; the pose block is still valid.
 */
export const MALE_PHOTO: PhotoPlateSpec = {
  id: "sg-chinese-male-photo",
  rig: "male-rig",
  label: "Singaporean Chinese, male (photoreal)",
  statureMetres: 1.73,
  source: "src/images/photo/sg-chinese-male__neutral-profile__chroma-green__source.png",
  soleY: 1296,
  crownY: 109,
  joints: {
    headBase: [404, 245],
    neckBase: [404, 295],
    shoulder: [379, 330],
    elbow: [325, 575],
    hip: [382, 706],
    knee: [368, 963],
    ankle: [338, 1235],
    ball: [415, 1288],
    heel: [297, 1270],
    toe: [488, 1244],
    wrist: [340, 742],
    chin: [457, 250],
  },
  neutralAngles: {
    torso: 0.053,
    neck: 0,
    head: 0.029,
    upperArm: -0.217,
    forearm: 0.090,
    thigh: -0.054,
    shin: -0.110,
    foot: 0,
  },
  barriers: [
    // Under the jaw, back to the nape: head (with hair) above, neck below.
    { from: [350, 300], to: [470, 248] },
    // The singlet's collar.
    { from: [350, 350], to: [470, 295] },
    // Armpit, up the deltoid's inner edge, to the collar.
    { from: [330, 560], to: [385, 375] },
    { from: [385, 375], to: [405, 340] },
    // Across the elbow, more or less perpendicular to the arm axis.
    { from: [255, 600], to: [360, 560] },
    // Shorts hem.
    { from: [265, 790], to: [480, 790] },
    // Knee.
    { from: [300, 962], to: [440, 962] },
    // Top of the shoe collar.
    { from: [285, 1200], to: [450, 1200] },
    // Ball of the foot: the toe hinge.
    { from: [415, 1310], to: [415, 1150] },
  ],
  parts: [
    { id: "head", seed: [430, 170], extension: 3 },
    { id: "neck", seed: [404, 280], extension: 2 },
    { id: "torso", seed: [400, 600], extension: 3 },
    { id: "upperArm", seed: [300, 450], extension: 7 },
    { id: "forearm", seed: [330, 650], extension: 6 },
    { id: "thigh", seed: [380, 860], extension: 6 },
    { id: "shin", seed: [355, 1060], extension: 6 },
    {
      id: "shoe",
      seed: [330, 1255],
      extension: 8,
      erase: [
        // Nothing below the declared sole.
        [[280, 1297], [560, 1297], [560, 1400], [280, 1400]],
        // Forward and low = the toe box. Lace panel and collar stay on the
        // hindfoot, where they sit over the midfoot.
        [[419, 1238], [560, 1238], [560, 1297], [419, 1297]],
      ],
    },
    {
      id: "shoeToe",
      seed: [455, 1275],
      extension: 4,
      erase: [
        [[280, 1140], [411, 1140], [411, 1297], [280, 1297]],
        [[280, 1140], [560, 1140], [560, 1238], [280, 1238]],
        [[280, 1297], [560, 1297], [560, 1400], [280, 1400]],
      ],
    },
  ],
  links: [
    // Knee: his near leg measures 88 px through the joint.
    { joint: "knee", parent: "thigh", child: "shin", radius: 43 },
    // Elbow: the arm measures 64 px through the joint.
    { joint: "elbow", parent: "upperArm", child: "forearm", radius: 31 },
  ],
  pose: { armSwing: 0.4, armBias: -0.04, elbowFlex: 1.5 },
};
