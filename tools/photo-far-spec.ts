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
  /**
   * Fit the cut-out to a target silhouette size in final plate pixels, taken
   * from the near part it must sit against. Reference shoots differ in framing,
   * so bone-length scaling alone leaves one limb visibly fatter than the other.
   */
  readonly fit?: { readonly width?: number; readonly height?: number };
  /**
   * Pixels from the pivot down to the declared sole, in the near rig's plate
   * scale. Foot textures are clipped here so nothing reaches under the ground
   * line the gait solver uses.
   */
  readonly soleBelowPivot?: number;
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
    // One photograph for the whole arm: upper arm and forearm share a scale,
    // so the elbow cannot change thickness where the two pieces meet.
    source: ARM,
    pieces: [
      {
        id: "upperArm",
        box: [318, 120, 525, 660],
        jointA: [405, 175],
        jointB: [405, 615],
        pivot: [405, 175],
        target: 236.5,
        capPx: 46,
        fit: { width: 88 },
      },
      {
        id: "forearm",
        box: [295, 600, 530, 1330],
        jointA: [405, 615],
        jointB: [405, 1010],
        pivot: [405, 615],
        target: 0,
        scaleFrom: "upperArm",
        capPx: 46,
        fit: { width: 65 },
      },
    ],
  },
  {
    // One photograph for the whole leg. The seam is at the knee, so thigh and
    // shin carry the same skin tone and the same width at the joint.
    source: LEG,
    pieces: [
      {
        id: "shin",
        box: [235, 480, 540, 1010],
        jointA: [405, 520],
        jointB: [375, 975],
        pivot: [405, 520],
        target: 293,
        capPx: 62,
        fit: { width: 86 },
      },
      {
        id: "thigh",
        box: [270, 110, 560, 570],
        jointA: [420, 220],
        jointB: [405, 520],
        pivot: [420, 220],
        target: 0,
        scaleFrom: "shin",
        capPx: 62,
        fit: { width: 152 },
      },
    ],
  },
  {
    source: LOWER,
    pieces: [
      {
        id: "shoe",
        // Hindfoot only: stops at the ball, with a 40 px overlap band so the
        // hinge never shows a seam.
        box: [70, 930, 505, 1270],
        jointA: [270, 990],
        jointB: [270, 1245],
        pivot: [320, 1035],
        target: 47,
        stretchX: 1.55,
        neutral: 0,
        fit: { width: 149 },
        soleBelowPivot: 47,
      },
      {
        id: "shoeToe",
        box: [465, 930, 745, 1270],
        jointA: [270, 990],
        jointB: [270, 1245],
        pivot: [470, 1180],
        target: 47,
        neutral: 0,
        scaleFrom: "shoe",
        fit: { width: 64 },
        soleBelowPivot: 47,
      },
    ],
  },
];
