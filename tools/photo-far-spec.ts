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
  readonly fit?: {
    readonly width?: number;
    readonly height?: number;
    /**
     * Scale the width and the height by the same factor. A limb must not be
     * squeezed along its own axis: anisotropic fitting makes a calf thin when
     * it hangs and fat when it swings, which is exactly how it gives itself away.
     */
    readonly uniform?: boolean;
  };
  /**
   * Pixels from the pivot down to the declared sole, in the near rig's plate
   * scale. Foot textures are clipped here so nothing reaches under the ground
   * line the gait solver uses.
   */
  readonly soleBelowPivot?: number;
  /**
   * Distance in final pixels from the pivot down to the far end of the bone.
   * Reference shots that crop a limb short (a calf that ends at mid-calf) are
   * stretched by this rather than by their own total height, so the child's
   * joint still lands where the skeleton puts it.
   */
  readonly reachBelowPivot?: number;
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
    // One shot of the whole arm, hanging, palm to camera. Both pieces share its
    // scale so the elbow cannot change thickness at the seam.
    source: ARM,
    pieces: [
      {
        id: "upperArm",
        box: [628, 18, 812, 420],
        jointA: [700, 120],
        jointB: [668, 709],
        pivot: [700, 120],
        target: 517,
        capPx: 40,
        fit: { width: 68 },
      },
      {
        id: "forearm",
        box: [622, 322, 802, 766],
        jointA: [700, 120],
        jointB: [668, 709],
        pivot: [699, 340],
        target: 0,
        scaleFrom: "upperArm",
        capPx: 36,
        fit: { width: 65 },
      },
    ],
  },
  {
    // One shot of the whole standing leg. The hip sits just above the frame
    // edge; the shorts hem fixes where it must be.
    source: LEG,
    pieces: [
      {
        id: "thigh",
        box: [556, 0, 842, 610],
        jointA: [700, 60],
        jointB: [660, 490],
        pivot: [700, 60],
        target: 262,
        capPx: 52,
        fit: { width: 152, uniform: true },
      },

    ],
  },
  {
    // This shot is framed on the lower leg: its top edge is the knee and the
    // sock line is the ankle, so one piece spans the whole shin without any
    // longitudinal stretching.
    source: LOWER,
    pieces: [
      {
        id: "shin",
        box: [528, 0, 800, 584],
        jointA: [645, 0],
        jointB: [645, 583],
        pivot: [645, 0],
        // Knee at the frame's top edge, ankle at the sock line: the bone-length
        // scale alone lands the shin at the right width, so no width fit.
        target: 293,
        capPx: 40,
        fit: { width: 86, uniform: true },
      },
      {
        id: "shoe",
        box: [528, 470, 812, 704],
        // Height is scaled from the shoe itself (top of collar to sole), so the
        // foot lands at the near shoe's size however close the shot was taken.
        // Ankle at the sock line, sole at y 701. Depth (sole to collar) sets the
        // scale: the reference is a close-up, so this maps the foot to the near
        // shoe's height instead of stretching it by its length.
        jointA: [645, 701],
        jointB: [645, 583],
        pivot: [645, 583],
        target: 118,
        neutral: 0,
        fit: { width: 149, height: 143 },
        soleBelowPivot: 47,
      },
      {
        id: "shoeToe",
        box: [788, 610, 968, 704],
        jointA: [645, 570],
        jointB: [645, 700],
        pivot: [822, 690],
        target: 0,
        neutral: 0,
        scaleFrom: "shoe",
        fit: { width: 64, height: 52 },
        soleBelowPivot: 47,
      },
    ],
  },
];
