import type { Bone, BoneId } from './bones.js';
import { BONE_LAYER } from './bones.js';
import { PAINT_ORDER } from './bones.js';
import type { Capsule, LimbSegment, PoseFrame } from '../core/types.js';

function fromCapsule(id: BoneId, capsule: Capsule, shrinkStart = 0, shrinkEnd = 0): Bone {
  return {
    id,
    layer: BONE_LAYER[id],
    proximal: capsule.a,
    distal: capsule.b,
    halfWidthProximal: Math.max(0.6, capsule.radiusStart - shrinkStart),
    halfWidthDistal: Math.max(0.6, capsule.radiusEnd - shrinkEnd),
    priority: BONE_LAYER[id] === 'front' ? 2 : 1,
    paintOrder: PAINT_ORDER[id],
  };
}

function fromSegments(segments: readonly LimbSegment[], ids: readonly BoneId[]): Bone[] {
  return segments.map((segment, index) => {
    const id = ids[index] as BoneId;
    const capsule = segment.capsule;
    return {
      id,
      layer: BONE_LAYER[id],
      proximal: capsule.a,
      distal: capsule.b,
      halfWidthProximal: capsule.radiusStart,
      halfWidthDistal: capsule.radiusEnd,
      priority: BONE_LAYER[id] === 'front' ? 2 : 1,
      paintOrder: PAINT_ORDER[id],
    } satisfies Bone;
  });
}

/**
 * Projects a solved pose into the same bone vocabulary the atlas speaks. This is
 * the interface between geometry and appearance: everything upstream is pure
 * kinematics, everything downstream is pure texture sampling.
 */
export function poseBones(pose: PoseFrame): Bone[] {
  return [
    fromCapsule('hair', pose.hair, 0.4, 0),
    fromCapsule('head', pose.head, 0, 0),
    fromCapsule('neck', pose.neck, 0.3, 0),
    fromCapsule('torso', pose.torso, 0.5, 0.5),
    fromCapsule('pelvis', pose.pelvisCapsule, 0.5, 0.5),
    ...fromSegments(pose.nearArm, ['nearUpperArm', 'nearForearm', 'nearHand']),
    ...fromSegments(pose.farArm, ['farUpperArm', 'farForearm', 'farHand']),
    ...fromSegments(pose.nearLeg, ['nearThigh', 'nearShin']),
    ...fromSegments(pose.farLeg, ['farThigh', 'farShin']),
    {
      id: 'nearFoot',
      layer: BONE_LAYER.nearFoot,
      proximal: pose.nearFoot.heel,
      distal: pose.nearFoot.toe,
      halfWidthProximal: 6,
      halfWidthDistal: 4.4,
      priority: 2,
      paintOrder: PAINT_ORDER.nearFoot,
    },
    {
      id: 'farFoot',
      layer: BONE_LAYER.farFoot,
      proximal: pose.farFoot.heel,
      distal: pose.farFoot.toe,
      halfWidthProximal: 5.6,
      halfWidthDistal: 4,
      priority: 1,
      paintOrder: PAINT_ORDER.farFoot,
    },
  ];
}
