import type { RunnerPose } from "../gait/pose.ts";
import type { Vec2 } from "../geometry/vec.ts";
import type { PhotoPartId } from "./cut.ts";
import { partById, type PhotoPart, type PhotoRig } from "./rig.ts";

/** One photographic part, placed and rotated for a pose. */
export interface PhotoDraw {
  readonly id: PhotoPartId;
  readonly far: boolean;
  /** Canvas rotation in radians, clockwise (canvas y points down). */
  readonly angle: number;
  /** World position of the joint this part turns about. */
  readonly pivot: Vec2;
  readonly file: string;
  readonly width: number;
  readonly height: number;
  /** Pivot inside the crop, in plate pixels. */
  readonly pivotX: number;
  readonly pivotY: number;
}

interface Placement {
  readonly id: PhotoPartId;
  readonly far: boolean;
  /** Bone angle in the solver's convention, or the axial angle for the trunk. */
  readonly poseAngle: number;
  readonly axial: boolean;
  readonly pivot: Vec2;
}

const neutral = (rig: PhotoRig, key: string): number => rig.neutralAngles[key] ?? 0;

/**
 * Canvas rotation for a bone that hangs *downwards*: the pose angle and the
 * plate angle are both measured from straight down, and canvas rotation runs
 * opposite to world rotation because y points down.
 */
const limbAngle = (neutralAngle: number, poseAngle: number): number => neutralAngle - poseAngle;

/**
 * Canvas rotation for a bone that stands *upright* (trunk, neck, head). These
 * angles are measured from straight up, which is half a turn away from the
 * limb convention, so the sign flips back.
 */
const axialAngle = (neutralAngle: number, poseAngle: number): number => poseAngle - neutralAngle;

/**
 * Turns a solved pose into paint order. The rotation for every part is
 * `neutral - posed`: the plate's own standing attitude is subtracted, so a
 * delta of zero draws the photograph exactly as it was taken.
 *
 * Order is back to front: far limbs, near limbs, then the trunk and head, then
 * the near arm. The near leg is deliberately *behind* the torso so the shorts
 * of the torso cover the top of the rotating thigh.
 */
export function composePhotoRunner(pose: RunnerPose, rig: PhotoRig): PhotoDraw[] {
  const nearLeg = pose.near.leg;
  const farLeg = pose.far.leg;
  const limb = (id: PhotoPartId, far: boolean, poseAngle: number, pivot: Vec2): Placement => ({
    id,
    far,
    poseAngle,
    axial: false,
    pivot,
  });
  const placements: Placement[] = [
    limb("thigh", true, farLeg.thighAngle, farLeg.hip),
    limb("shin", true, farLeg.shinAngle, farLeg.knee),
    limb("shoe", true, farLeg.hindAngle, farLeg.ankle),
    limb("shoeToe", true, farLeg.foreAngle, farLeg.foot.ball),
    limb("upperArm", true, pose.far.arm.upperAngle, pose.far.arm.shoulder),
    limb("forearm", true, pose.far.arm.forearmAngle, pose.far.arm.elbow),
    limb("thigh", false, nearLeg.thighAngle, nearLeg.hip),
    limb("shin", false, nearLeg.shinAngle, nearLeg.knee),
    limb("shoe", false, nearLeg.hindAngle, nearLeg.ankle),
    limb("shoeToe", false, nearLeg.foreAngle, nearLeg.foot.ball),
    { id: "torso", far: false, poseAngle: pose.torsoAngle, axial: true, pivot: pose.hip },
    { id: "neck", far: false, poseAngle: pose.neckAngle, axial: true, pivot: pose.neckBase },
    { id: "head", far: false, poseAngle: pose.headAngle, axial: true, pivot: pose.headBase },
    limb("upperArm", false, pose.near.arm.upperAngle, pose.near.arm.shoulder),
    limb("forearm", false, pose.near.arm.forearmAngle, pose.near.arm.elbow),
  ];
  return placements.map((placement) => {
    const part: PhotoPart = partById(rig, placement.id);
    const far = placement.far ? part.far : undefined;
    const restAngle = far?.neutral ?? neutral(rig, placement.id);
    const angle = placement.axial
      ? axialAngle(restAngle, placement.poseAngle)
      : limbAngle(restAngle, placement.poseAngle);
    return {
      id: placement.id,
      far: placement.far,
      angle,
      pivot: placement.pivot,
      file: far?.file ?? (placement.far ? part.fileFar : part.file),
      width: far?.width ?? part.width,
      height: far?.height ?? part.height,
      pivotX: far?.pivot[0] ?? part.pivot[0],
      pivotY: far?.pivot[1] ?? part.pivot[1],
    };
  });
}

/** Filenames a renderer must have before it can draw this rig. */
export function photoAssetFiles(rig: PhotoRig): readonly string[] {
  return rig.parts.flatMap((part) => [
    part.file,
    part.fileFar,
    ...(part.far === undefined ? [] : [part.far.file]),
  ]);
}
