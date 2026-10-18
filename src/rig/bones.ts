import type { Point2D, RigSpec } from '../core/types.js';
import { DEFAULT_RIG } from './spec.js';

/**
 * Bones are the unit of both deformation and texture addressing. A bone owns a
 * rectangular slice of the atlas addressed by `(u, v)`: `u` runs proximal →
 * distal along the bone, `v` is the signed offset across it, normalised by the
 * local measured half-width.
 */
export type BoneId =
  | 'hair'
  | 'head'
  | 'neck'
  | 'torso'
  | 'pelvis'
  | 'nearUpperArm'
  | 'nearForearm'
  | 'nearHand'
  | 'farUpperArm'
  | 'farForearm'
  | 'farHand'
  | 'nearThigh'
  | 'nearShin'
  | 'nearFoot'
  | 'farThigh'
  | 'farShin'
  | 'farFoot';

export type AtlasLayer = 'back' | 'front';

export interface Bone {
  readonly id: BoneId;
  readonly layer: AtlasLayer;
  readonly proximal: Point2D;
  readonly distal: Point2D;
  readonly halfWidthProximal: number;
  readonly halfWidthDistal: number;
  /** Higher wins when a pixel is equidistant; near-side limbs sit above far-side. */
  readonly priority: number;
  /**
   * Intra-layer paint order, ascending: later paints over earlier. This is the
   * only ordering in the pipeline, and it is a property of anatomy (hair behind
   * the face, torso behind the arm), not of a photograph.
   */
  readonly paintOrder: number;
  /**
   * A joint this bone must physically reach even though it is not one of its two
   * endpoints. The foot is the case that needs it: its capsule runs heel → toe
   * along the sole, which sits `ankleHeight` below the ankle, while the shin ends
   * *at* the ankle. During toe-off the pitch opens a one-pixel gap and the shoe
   * detaches from the leg. Filling to the ankle closes it with the bone's own
   * texture; ownership and atlas addressing are unaffected, so no metric moves
   * except the one that should.
   */
  readonly jointFill?: Point2D;
}

export const ATLAS_BONE_IDS: readonly BoneId[] = [
  'hair',
  'head',
  'neck',
  'torso',
  'pelvis',
  'nearUpperArm',
  'nearForearm',
  'nearHand',
  'farUpperArm',
  'farForearm',
  'farHand',
  'nearThigh',
  'nearShin',
  'nearFoot',
  'farThigh',
  'farShin',
  'farFoot',
];

export const BONE_LAYER: Readonly<Record<BoneId, AtlasLayer>> = {
  hair: 'front',
  head: 'front',
  neck: 'front',
  torso: 'front',
  pelvis: 'front',
  nearUpperArm: 'front',
  nearForearm: 'front',
  nearHand: 'front',
  farUpperArm: 'back',
  farForearm: 'back',
  farHand: 'back',
  nearThigh: 'front',
  nearShin: 'front',
  nearFoot: 'front',
  farThigh: 'back',
  farShin: 'back',
  farFoot: 'back',
};

/** Intra-layer paint order: hair and pelvis first, extremities last. */
export const PAINT_ORDER: Readonly<Record<BoneId, number>> = {
  hair: 1,
  pelvis: 2,
  torso: 3,
  neck: 4,
  head: 5,
  farUpperArm: 3,
  farForearm: 4,
  farHand: 5,
  farThigh: 3,
  farShin: 4,
  farFoot: 5,
  nearUpperArm: 6,
  nearForearm: 7,
  nearHand: 8,
  nearThigh: 6,
  nearShin: 7,
  nearFoot: 8,
};

/** Paints the layers in this order; within a layer, bones share one silhouette. */
export const LAYER_ORDER: readonly AtlasLayer[] = ['back', 'front'];

/**
 * The rest skeleton: a neutral standing pose that the source photograph must
 * itself be in. Every joint below is derived from `RigSpec`, which is derived
 * from anthropometric stature fractions — never from the photograph.
 */
export function restBones(rig: RigSpec = DEFAULT_RIG): Bone[] {
  const x = rig.pelvisRestX;
  const hip = rig.pelvisRestY;
  const shoulder = hip - rig.torsoLength;
  const chin = shoulder - rig.neckLength;
  const vertex = chin - rig.headRadius * 2;
  const knee = hip + rig.thighLength;
  const ankle = knee + rig.shinLength;
  const elbow = shoulder + rig.upperArmLength;
  const wrist = elbow + rig.forearmLength;
  const handTip = wrist + rig.handLength;
  return [
    bone('hair', 'front', { x: x - 9, y: vertex + 4 }, { x: x - 30, y: vertex + rig.hairLength }, 7.2, 2.6, 1, 1),
    bone('head', 'front', { x: x + 1, y: chin }, { x: x + 1, y: vertex }, rig.headRadius, rig.headRadius * 0.92, 2, 5),
    bone('neck', 'front', { x: x + 1, y: shoulder }, { x: x + 1, y: chin }, 5.6, 5, 2, 4),
    bone('torso', 'front', { x, y: hip }, { x, y: shoulder }, rig.torsoHalfWidth * 0.9, rig.torsoHalfWidth, 3, 3),
    bone('pelvis', 'front', { x, y: hip + 9 }, { x, y: hip - 3 }, rig.hipHalfWidth + 4, rig.hipHalfWidth + 2, 3, 2),
    bone('nearUpperArm', 'front', { x: x + 3, y: shoulder + 3 }, { x: x + 3, y: elbow }, rig.limbRadius.upperArm + 2, rig.limbRadius.upperArm, 2, 6),
    bone('nearForearm', 'front', { x: x + 3, y: elbow }, { x: x + 3, y: wrist }, rig.limbRadius.forearm + 1, rig.limbRadius.forearm, 2, 7),
    bone('nearHand', 'front', { x: x + 3, y: wrist }, { x: x + 3, y: handTip }, 5, 4, 2, 8),
    bone('farUpperArm', 'back', { x: x - 5, y: shoulder + 3 }, { x: x - 5, y: elbow }, rig.limbRadius.upperArm + 1, rig.limbRadius.upperArm, 1, 3),
    bone('farForearm', 'back', { x: x - 5, y: elbow }, { x: x - 5, y: wrist }, rig.limbRadius.forearm, rig.limbRadius.forearm * 0.9, 1, 4),
    bone('farHand', 'back', { x: x - 5, y: wrist }, { x: x - 5, y: handTip }, 4.6, 3.6, 1, 5),
    bone('nearThigh', 'front', { x: x + 2, y: hip }, { x: x + 2, y: knee }, rig.limbRadius.thigh + 1, rig.limbRadius.thigh * 0.86, 2, 6),
    bone('nearShin', 'front', { x: x + 2, y: knee }, { x: x + 2, y: ankle }, rig.limbRadius.shin + 1, rig.limbRadius.shin * 0.66, 2, 7),
    {
      ...bone('nearFoot', 'front', { x: x - 9, y: ankle + 4 }, { x: x + 21, y: ankle + 4 }, 6, 5, 2, 8),
      jointFill: { x, y: ankle },
    },
    bone('farThigh', 'back', { x: x - 4, y: hip }, { x: x - 4, y: knee }, rig.limbRadius.thigh, rig.limbRadius.thigh * 0.86, 1, 3),
    bone('farShin', 'back', { x: x - 4, y: knee }, { x: x - 4, y: ankle }, rig.limbRadius.shin, rig.limbRadius.shin * 0.66, 1, 4),
    {
      ...bone('farFoot', 'back', { x: x - 12, y: ankle + 4 }, { x: x + 18, y: ankle + 4 }, 5.6, 4.6, 1, 5),
      jointFill: { x: x - 4, y: ankle },
    },
  ];
}

function bone(
  id: BoneId,
  layer: AtlasLayer,
  proximal: Point2D,
  distal: Point2D,
  halfWidthProximal: number,
  halfWidthDistal: number,
  priority: number,
  paintOrder: number,
): Bone {
  return { id, layer, proximal, distal, halfWidthProximal, halfWidthDistal, priority, paintOrder };
}

export interface PoseBones {
  readonly byId: Readonly<Record<BoneId, Bone>>;
  readonly list: readonly Bone[];
}

/** The rest skeleton translated and scaled into another image's coordinates. */
export function transformBones(bones: readonly Bone[], scale: number, origin: Point2D): Bone[] {
  const map = (point: Point2D): Point2D => ({
    x: origin.x + (point.x - DEFAULT_RIG.pelvisRestX) * scale,
    y: origin.y + (point.y - DEFAULT_RIG.pelvisRestY) * scale,
  });
  return bones.map((source) => ({
    ...source,
    proximal: map(source.proximal),
    distal: map(source.distal),
    ...(source.jointFill ? { jointFill: map(source.jointFill) } : {}),
    halfWidthProximal: source.halfWidthProximal * scale,
    halfWidthDistal: source.halfWidthDistal * scale,
  }));
}

export function indexBones(bones: readonly Bone[]): Readonly<Record<BoneId, Bone>> {
  const entries = bones.map((entry) => [entry.id, entry] as const);
  return Object.fromEntries(entries) as Record<BoneId, Bone>;
}
