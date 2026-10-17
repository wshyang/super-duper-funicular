import type { PhotoPartId } from "../src/lib/photo/cut.ts";

/**
 * Far-side (medial) limbs are photographed separately from the neutral plate:
 * a single side profile only ever shows the outside of the near limbs, so the
 * inside of the far arm and leg has to come from its own reference shot.
 *
 * Each piece is cut from a flat rectangle of its source plate, then resampled
 * so the distance between its own two joints matches the near rig's bone
 * length. Joint distances in the near rig, in plate pixels.
 */
export interface FarPiece {
  readonly id: PhotoPartId;
  readonly box: readonly [number, number, number, number];
  /** Proximal joint of the bone this piece represents. */
  readonly jointA: readonly [number, number];
  /** Distal joint, used for the bone length and the neutral angle. */
  readonly jointB: readonly [number, number];
  /** Joint the piece turns about, in source pixels. */
  readonly pivot: readonly [number, number];
  /** Target joint-to-joint distance in near-rig plate pixels. */
  readonly target: number;
  /** Extra horizontal stretch, for shoes whose near side is longer than tall. */
  readonly stretchX?: number;
  /** Fixed neutral angle instead of the joint axis. */
  readonly neutral?: number;
  /** Reuse the scale computed for an earlier piece. */
  readonly scaleFrom?: PhotoPartId;
  /** Source-radius of a disc of joint pixels added around the pivot. */
  readonly capPx?: number;
}

export interface FarSource {
  readonly source: string;
  readonly pieces: readonly FarPiece[];
}

const ARM = "src/images/photo/sg-chinese-female__far-arm-medial__chroma-green__source.png";
const LEG = "src/images/photo/sg-chinese-female__far-leg-medial__chroma-green__source.png";
const LOWER = "src/images/photo/sg-chinese-female__far-lower-leg-medial__chroma-green__source.png";

export const FAR_SOURCES: readonly FarSource[] = [
  {
    source: ARM,
    pieces: [
      {
        id: "upperArm",
        box: [320, 100, 520, 660],
        jointA: [405, 175],
        jointB: [405, 615],
        pivot: [405, 175],
        target: 236.5,
      },
      {
        id: "forearm",
        box: [295, 605, 530, 1330],
        // The far hand is longer than the near cut-out's; scale to the whole
        // elbow-to-fingertip reach so both hands end at the same place.
        jointA: [405, 615],
        jointB: [365, 1300],
        pivot: [405, 615],
        target: 289,
        capPx: 52,
      },
    ],
  },
  {
    source: LEG,
    pieces: [
      {
        id: "thigh",
        box: [270, 110, 560, 545],
        jointA: [395, 120],
        jointB: [420, 500],
        pivot: [395, 120],
        target: 262.1,
        // The close-up reference leg is a touch wider than the plate's thigh.
        stretchX: 0.82,
      },
    ],
  },
  {
    source: LOWER,
    pieces: [
      {
        id: "shin",
        box: [180, 80, 520, 1040],
        jointA: [330, 90],
        jointB: [270, 990],
        pivot: [330, 90],
        target: 292.6,
        capPx: 74,
      },
      {
        id: "shoe",
        box: [55, 930, 760, 1285],
        jointA: [270, 990],
        jointB: [270, 1245],
        pivot: [270, 990],
        target: 47,
        stretchX: 1.4,
        neutral: 0,
      },
      {
        id: "shoeToe",
        box: [450, 930, 760, 1285],
        jointA: [270, 990],
        jointB: [270, 1245],
        pivot: [480, 1235],
        target: 47,
        neutral: 0,
        scaleFrom: "shoe",
      },
    ],
  },
];
