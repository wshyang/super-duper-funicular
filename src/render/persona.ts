import type { PoseFrame, RasterImage } from '../core/types.js';
import { buildAtlas, type Atlas } from '../atlas/unwrap.js';
import { BONE_LAYER, type Bone, type BoneId } from '../rig/bones.js';
import { poseBones } from '../rig/pose-bones.js';
import { DEFAULT_RIG } from '../rig/spec.js';
import {
  detectKeyColour,
  keyMaster,
  measureMaster,
  type KeyedMaster,
  type MasterProfile,
  type Rgb,
} from '../profile/master-profile.js';
import {
  applyCorrespondence,
  correspondenceFromLandmarks,
  measureBoneHalfWidths,
  silhouetteIou,
  type Correspondence,
} from '../profile/register.js';
import { solveStandingPose } from './standing.js';

/**
 * How far a measured limb width may move the rig's own width. Wide enough to
 * capture a real difference between two people, tight enough that a limb
 * touching its neighbour cannot inflate it into a slab.
 */
export const WIDTH_TRUST_MIN = 0.7;
export const WIDTH_TRUST_MAX = 1.25;

/** Lateral offset of the hanging arm in the neutral standing pose, in sprite px. */
export const ARM_REST_OFFSET_X = 3;

const ARM_BONE_IDS = new Set(['nearUpperArm', 'nearForearm', 'nearHand', 'farUpperArm', 'farForearm', 'farHand']);

export function isArmBone(id: string): boolean {
  return ARM_BONE_IDS.has(id);
}

export interface PersonaContext {
  readonly id: string;
  readonly profile: MasterProfile;
  readonly atlas: Atlas;
  readonly key: Rgb;
  /** master pixels per sprite pixel. */
  readonly masterScale: number;
  readonly masterOrigin: { readonly x: number; readonly y: number };
  /** Per bone: the measured limb half-width in sprite px and its ratio to the rig's. */
  readonly boneHalfWidths: Readonly<Partial<Record<BoneId, { readonly halfWidthPx: number; readonly ratio: number }>>>;
  /** The standing rig mapped into master pixels — the space the atlas was built in. */
  readonly masterBones: readonly Bone[];
  /** Fitted rig-to-photograph correspondence and its achieved silhouette IoU. */
  readonly fit: Correspondence;
  readonly width: number;
  readonly height: number;
}

/**
 * Everything a persona needs is derived from one photograph. `masterScale` and
 * `masterOrigin` are the entire correspondence between the atlas and the rig;
 * they are measured, printed to `persona.json`, and never hand-edited.
 */
export function buildPersonaFromPlate(id: string, plate: RasterImage): PersonaContext {
  const key = detectKeyColour(plate);
  const keyed = keyMaster(plate, key);
  const profile = measureMaster(keyed);
  const rest0 = poseBones(solveStandingPose());
  const fit = measureCorrespondence(plate, key, keyed, profile, rest0);
  const masterBones = trustBoneWidths(plate, key, applyCorrespondence(rest0, fit));
  const atlas = buildAtlas(plate, key, masterBones);
  return {
    id,
    profile,
    atlas,
    key,
    fit,
    masterScale: fit.scale,
    masterOrigin: { x: fit.originX, y: fit.originY },
    boneHalfWidths: summariseWidths(atlas, rest0, fit),
    masterBones,
    width: DEFAULT_RIG.canvasWidth,
    height: DEFAULT_RIG.canvasHeight,
  };
}

/**
 * The vertical skeleton is measured, not searched: four landmark rows plus two
 * anatomical ratios. The silhouette IoU is computed only to be *reported*.
 */
function measureCorrespondence(
  plate: RasterImage,
  key: Rgb,
  keyed: KeyedMaster,
  profile: MasterProfile,
  restBones: readonly Bone[],
): Correspondence {
  const hipRow = profile.soleY - 0.52 * profile.heightPx;
  const base = correspondenceFromLandmarks(
    {
      crown: profile.topY,
      chin: profile.landmarks.neck,
      shoulder: profile.landmarks.shoulder,
      sole: profile.soleY,
    },
    profileKeyRowCentre(keyed, hipRow, plate.width),
    plate.height,
  );
  return { ...base, iou: silhouetteIou(plate, key, restBones, base) };
}

/**
 * Measured widths are clamped to a band around the rig's own. The medial-axis
 * measurement is exact where a limb is isolated and wrong where two limbs touch
 * (the hand resting on the thigh inflates both to the union's radius), so it is
 * allowed to nudge the anatomy, not to replace it.
 */
function trustBoneWidths(plate: RasterImage, key: Rgb, placed: readonly Bone[]): Bone[] {
  const widths = measureBoneHalfWidths(plate, key, placed);
  return placed.map((bone) => {
    const measured = widths[bone.id] ?? 0;
    const rigWidth = (bone.halfWidthProximal + bone.halfWidthDistal) / 2;
    if (measured <= 1 || rigWidth <= 0) return bone;
    const accepted = Math.min(rigWidth * WIDTH_TRUST_MAX, Math.max(rigWidth * WIDTH_TRUST_MIN, measured));
    const taper = bone.halfWidthDistal / Math.max(0.5, bone.halfWidthProximal);
    return { ...bone, halfWidthProximal: accepted, halfWidthDistal: accepted * taper };
  });
}

function summariseWidths(
  atlas: Atlas,
  restBones: readonly Bone[],
  fit: Correspondence,
): Partial<Record<BoneId, { halfWidthPx: number; ratio: number }>> {
  const summary: Partial<Record<BoneId, { halfWidthPx: number; ratio: number }>> = {};
  for (const rest of restBones) {
    const coverage = atlas.report.perBone[rest.id as BoneId];
    if (!coverage || coverage.halfWidthPx <= 0) continue;
    const rigHalfWidth = (rest.halfWidthProximal + rest.halfWidthDistal) / 2;
    const measuredSprite = coverage.halfWidthPx / fit.scale;
    summary[rest.id as BoneId] = {
      halfWidthPx: Number(measuredSprite.toFixed(2)),
      ratio: Number(
        Math.min(WIDTH_TRUST_MAX, Math.max(WIDTH_TRUST_MIN, measuredSprite / Math.max(0.5, rigHalfWidth))).toFixed(3),
      ),
    };
  }
  return summary;
}

/** Horizontal centre of the subject on the row closest to `y`. */
function profileKeyRowCentre(keyed: KeyedMaster, y: number, fallback: number): number {
  const row = keyed.rows.find((span) => span.y === Math.round(y));
  return row ? (row.minX + row.maxX) / 2 : fallback;
}

/**
 * Pose bones with the atlas's measured half-widths substituted, so that `v`
 * means the same fraction of limb width in the atlas and in the pose. Without
 * this the texture would stretch whenever the rig's radii differ from the
 * photograph's.
 */
export function poseBonesForPersona(pose: PoseFrame, context: PersonaContext): Bone[] {
  return poseBones(pose).map((bone) => {
    const measured = context.boneHalfWidths[bone.id as BoneId];
    if (!measured || measured.ratio <= 0) return bone;
    return {
      ...bone,
      layer: BONE_LAYER[bone.id as BoneId],
      halfWidthProximal: bone.halfWidthProximal * measured.ratio,
      halfWidthDistal: bone.halfWidthDistal * measured.ratio,
    };
  });
}
