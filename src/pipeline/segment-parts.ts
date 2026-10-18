import type { ArticulatedPartId, Point2D, RigPose } from '../shared/rig.js';
import { ARTICULATED_PART_IDS } from '../shared/rig.js';

interface BoneGeometry {
  readonly ax: number;
  readonly ay: number;
  readonly bx: number;
  readonly by: number;
  readonly lengthPx: number;
}

export interface JointSpec {
  readonly name: string;
  readonly point: Point2D;
  readonly partA: ArticulatedPartId;
  readonly partB: ArticulatedPartId;
}

export interface FigureSegmentation {
  readonly masks: Readonly<Record<ArticulatedPartId, Uint8Array>>;
  readonly joints: readonly JointSpec[];
}

export interface SegmentationInput {
  readonly pose: RigPose;
  readonly keyedAlpha: Uint8Array;
  readonly distanceTransform: Float64Array;
  readonly width: number;
  readonly height: number;
}

const BONE_TORSO = 0;
const BONE_PELVIS = 1;
const BONE_HEAD = 2;
const BONE_NEAR_UPPER_ARM = 3;
const BONE_NEAR_FOREARM = 4;
const BONE_FAR_UPPER_ARM = 5;
const BONE_FAR_FOREARM = 6;
const BONE_NEAR_THIGH = 7;
const BONE_NEAR_SHIN = 8;
const BONE_FAR_THIGH = 9;
const BONE_FAR_SHIN = 10;
const EXTREMITY_NEAR_HAND = -20;
const EXTREMITY_FAR_HAND = -21;
const EXTREMITY_NEAR_FOOT = -22;
const EXTREMITY_FAR_FOOT = -23;
const FOREARM_TO_HAND_S = 0.86;
const SHIN_TO_FOOT_S = 0.84;
const OPAQUE_THRESHOLD = 16;

const BONE_PART_IDS: Record<number, ArticulatedPartId> = {
  [BONE_TORSO]: 'torso',
  [BONE_PELVIS]: 'pelvis',
  [BONE_HEAD]: 'head',
  [BONE_NEAR_UPPER_ARM]: 'nearUpperArm',
  [BONE_NEAR_FOREARM]: 'nearForearm',
  [BONE_FAR_UPPER_ARM]: 'farUpperArm',
  [BONE_FAR_FOREARM]: 'farForearm',
  [BONE_NEAR_THIGH]: 'nearThigh',
  [BONE_NEAR_SHIN]: 'nearShin',
  [BONE_FAR_THIGH]: 'farThigh',
  [BONE_FAR_SHIN]: 'farShin',
};

const EXTREMITY_PART_IDS: Record<number, ArticulatedPartId> = {
  [EXTREMITY_NEAR_HAND]: 'nearHand',
  [EXTREMITY_FAR_HAND]: 'farHand',
  [EXTREMITY_NEAR_FOOT]: 'nearFoot',
  [EXTREMITY_FAR_FOOT]: 'farFoot',
};

export function boneGeometries(pose: RigPose): readonly BoneGeometry[] {
  const bones: BoneGeometry[] = [];
  bones[BONE_TORSO] = bone(pose.waist, pose.neckBase);
  bones[BONE_PELVIS] = bone(pose.pelvis, pose.waist);
  bones[BONE_HEAD] = bone(pose.headCenter, pose.headCenter);
  bones[BONE_NEAR_UPPER_ARM] = bone(pose.nearArm.root, pose.nearArm.mid);
  bones[BONE_NEAR_FOREARM] = bone(pose.nearArm.mid, pose.nearArm.tip);
  bones[BONE_FAR_UPPER_ARM] = bone(pose.farArm.root, pose.farArm.mid);
  bones[BONE_FAR_FOREARM] = bone(pose.farArm.mid, pose.farArm.tip);
  bones[BONE_NEAR_THIGH] = bone(pose.nearLeg.root, pose.nearLeg.mid);
  bones[BONE_NEAR_SHIN] = bone(pose.nearLeg.mid, pose.nearLeg.tip);
  bones[BONE_FAR_THIGH] = bone(pose.farLeg.root, pose.farLeg.mid);
  bones[BONE_FAR_SHIN] = bone(pose.farLeg.mid, pose.farLeg.tip);
  return bones;
}

function bone(a: Point2D, b: Point2D): BoneGeometry {
  return { ax: a.x, ay: a.y, bx: b.x, by: b.y, lengthPx: Math.hypot(b.x - a.x, b.y - a.y) };
}

export function jointsFromPose(pose: RigPose): readonly JointSpec[] {
  return [
    { name: 'waist', point: pose.waist, partA: 'torso', partB: 'pelvis' },
    { name: 'neckBase', point: pose.neckBase, partA: 'torso', partB: 'head' },
    { name: 'nearShoulder', point: pose.nearArm.root, partA: 'torso', partB: 'nearUpperArm' },
    { name: 'nearElbow', point: pose.nearArm.mid, partA: 'nearUpperArm', partB: 'nearForearm' },
    { name: 'nearWrist', point: pose.nearArm.tip, partA: 'nearForearm', partB: 'nearHand' },
    { name: 'farShoulder', point: pose.farArm.root, partA: 'torso', partB: 'farUpperArm' },
    { name: 'farElbow', point: pose.farArm.mid, partA: 'farUpperArm', partB: 'farForearm' },
    { name: 'farWrist', point: pose.farArm.tip, partA: 'farForearm', partB: 'farHand' },
    { name: 'nearHip', point: pose.nearLeg.root, partA: 'pelvis', partB: 'nearThigh' },
    { name: 'nearKnee', point: pose.nearLeg.mid, partA: 'nearThigh', partB: 'nearShin' },
    { name: 'nearAnkle', point: pose.nearLeg.tip, partA: 'nearShin', partB: 'nearFoot' },
    { name: 'farHip', point: pose.farLeg.root, partA: 'pelvis', partB: 'farThigh' },
    { name: 'farKnee', point: pose.farLeg.mid, partA: 'farThigh', partB: 'farShin' },
    { name: 'farAnkle', point: pose.farLeg.tip, partA: 'farShin', partB: 'farFoot' },
  ];
}

export function segmentFigureParts(input: SegmentationInput): FigureSegmentation {
  const bones = boneGeometries(input.pose);
  const labels = assignBaseLabels(input, bones);
  reassignDistalExtremities(labels, input, bones);
  const masks = buildPartMasks(labels, input);
  const joints = jointsFromPose(input.pose);
  paintJointOverlapDiscs(masks, joints, input);
  return { masks, joints };
}

function assignBaseLabels(input: SegmentationInput, bones: readonly BoneGeometry[]): Int8Array {
  const labels = new Int8Array(input.width * input.height).fill(-1);
  for (let y = 0; y < input.height; y++) {
    for (let x = 0; x < input.width; x++) {
      assignPixelBaseLabel(labels, input, bones, x, y);
    }
  }
  return labels;
}

function assignPixelBaseLabel(
  labels: Int8Array,
  input: SegmentationInput,
  bones: readonly BoneGeometry[],
  x: number,
  y: number,
): void {
  const index = y * input.width + x;
  if (input.keyedAlpha[index] <= OPAQUE_THRESHOLD) return;
  let bestDistanceSq = Number.POSITIVE_INFINITY;
  let bestBone = -1;
  for (let boneIndex = 0; boneIndex < bones.length; boneIndex++) {
    const projected = projectOntoSegment(x + 0.5, y + 0.5, bones[boneIndex]);
    if (projected.distanceSq < bestDistanceSq) {
      bestDistanceSq = projected.distanceSq;
      bestBone = boneIndex;
    }
  }
  labels[index] = bestBone;
}

function projectOntoSegment(px: number, py: number, geometry: BoneGeometry): { distanceSq: number; t: number } {
  const dx = geometry.bx - geometry.ax;
  const dy = geometry.by - geometry.ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq < 1e-9 ? 0 : Math.max(0, Math.min(1, ((px - geometry.ax) * dx + (py - geometry.ay) * dy) / lengthSq));
  const nearestX = geometry.ax + t * dx;
  const nearestY = geometry.ay + t * dy;
  return { distanceSq: (px - nearestX) ** 2 + (py - nearestY) ** 2, t };
}

function reassignDistalExtremities(labels: Int8Array, input: SegmentationInput, bones: readonly BoneGeometry[]): void {
  for (let y = 0; y < input.height; y++) {
    for (let x = 0; x < input.width; x++) {
      const index = y * input.width + x;
      if (labels[index] < 0) continue;
      const projected = projectOntoSegment(x + 0.5, y + 0.5, bones[labels[index]]);
      const alongPx = projected.t * bones[labels[index]].lengthPx;
      labels[index] = relabelDistal(labels[index], alongPx, bones);
    }
  }
}

function relabelDistal(boneIndex: number, alongPx: number, bones: readonly BoneGeometry[]): number {
  if (boneIndex === BONE_NEAR_FOREARM && alongPx > FOREARM_TO_HAND_S * bones[boneIndex].lengthPx) return EXTREMITY_NEAR_HAND;
  if (boneIndex === BONE_FAR_FOREARM && alongPx > FOREARM_TO_HAND_S * bones[boneIndex].lengthPx) return EXTREMITY_FAR_HAND;
  if (boneIndex === BONE_NEAR_SHIN && alongPx > SHIN_TO_FOOT_S * bones[boneIndex].lengthPx) return EXTREMITY_NEAR_FOOT;
  if (boneIndex === BONE_FAR_SHIN && alongPx > SHIN_TO_FOOT_S * bones[boneIndex].lengthPx) return EXTREMITY_FAR_FOOT;
  return boneIndex;
}

function buildPartMasks(labels: Int8Array, input: SegmentationInput): Record<ArticulatedPartId, Uint8Array> {
  const masks = {} as Record<ArticulatedPartId, Uint8Array>;
  for (const partId of ARTICULATED_PART_IDS) masks[partId] = new Uint8Array(input.width * input.height);
  for (let index = 0; index < labels.length; index++) {
    const label = labels[index];
    if (label === -1) continue;
    const partId = BONE_PART_IDS[label] !== undefined ? BONE_PART_IDS[label] : EXTREMITY_PART_IDS[label];
    masks[partId][index] = 1;
  }
  return masks;
}

function paintJointOverlapDiscs(
  masks: Record<ArticulatedPartId, Uint8Array>,
  joints: readonly JointSpec[],
  input: SegmentationInput,
): void {
  for (const joint of joints) {
    paintOneDisc(masks, joint, input);
  }
}

function paintOneDisc(masks: Record<ArticulatedPartId, Uint8Array>, joint: JointSpec, input: SegmentationInput): void {
  const centerX = Math.round(joint.point.x);
  const centerY = Math.round(joint.point.y);
  const radius = discRadius(input, centerX, centerY);
  for (let dy = -Math.ceil(radius); dy <= Math.ceil(radius); dy++) {
    for (let dx = -Math.ceil(radius); dx <= Math.ceil(radius); dx++) {
      if (dx * dx + dy * dy > radius * radius) continue;
      const x = centerX + dx;
      const y = centerY + dy;
      if (x < 0 || y < 0 || x >= input.width || y >= input.height) continue;
      const index = y * input.width + x;
      if (input.keyedAlpha[index] <= OPAQUE_THRESHOLD) continue;
      masks[joint.partA][index] = 1;
      masks[joint.partB][index] = 1;
    }
  }
}

function discRadius(input: SegmentationInput, centerX: number, centerY: number): number {
  const clampedX = Math.max(0, Math.min(input.width - 1, centerX));
  const clampedY = Math.max(0, Math.min(input.height - 1, centerY));
  const halfWidth = input.distanceTransform[clampedY * input.width + clampedX];
  return Math.max(0.012 * input.pose.figureHeightPx, Math.min(0.05 * input.pose.figureHeightPx, 1.15 * halfWidth));
}
