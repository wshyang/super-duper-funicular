import { clamp } from '../core/geometry.js';
import { pixelIndex } from '../core/raster.js';
import type { Point2D, RasterImage } from '../core/types.js';
import { addressPoint } from '../atlas/unwrap.js';
import type { Bone } from '../rig/bones.js';
import { DEFAULT_RIG, GROUND_Y, REST_JOINTS, STATURE_PX } from '../rig/spec.js';
import { isChromaPixel, type Rgb } from './master-profile.js';

/**
 * Correspondence between the sprite rig and a photograph.
 *
 * The two previous branches carried ~50 crop/pivot constants and ~80 per-persona
 * ternaries because they positioned the rig on the photograph by hand. There is
 * no need for that: given a keyed plate, the silhouette contains enough
 * information to *fit* the placement. This module does it with one small
 * optimisation — seven parameters, coordinate descent, a fixed seed and a fixed
 * budget — so the result is deterministic and reviewable.
 *
 * The parameters are deliberately anatomical rather than pixel offsets:
 *
 *   scale          master pixels per sprite pixel (uniform, horizontal)
 *   origin         where the sprite's pelvis lands in master pixels
 *   torsoStretch   vertical scale from hip to shoulder
 *   thighStretch   vertical scale from hip to knee
 *   shinStretch    vertical scale from knee to ankle
 *   armStretch     vertical scale along the arm chain
 *
 * Everything else follows from the rest skeleton, so a person with a long torso
 * and short shins is described by two numbers, not by two hand-authored crops.
 */
export interface Correspondence {
  readonly scale: number;
  readonly originX: number;
  readonly originY: number;
  readonly torsoStretch: number;
  readonly thighStretch: number;
  readonly shinStretch: number;
  readonly neckStretch: number;
  readonly headStretch: number;
  readonly armStretch: number;
  /** Silhouette intersection-over-union actually achieved, 0..1. */
  readonly iou: number;
}

/** Mutable working copy used by the optimiser; never escapes this module. */
interface Working {
  scale: number;
  originX: number;
  originY: number;
  torsoStretch: number;
  thighStretch: number;
  shinStretch: number;
  neckStretch: number;
  headStretch: number;
  armStretch: number;
}

export const CORRESPONDENCE_LIMITS = {
  scale: [0.7, 1.3] as const,
  stretch: [0.7, 1.6] as const,
};

const PELVIS: Point2D = { x: DEFAULT_RIG.pelvisRestX, y: DEFAULT_RIG.pelvisRestY };

/** Sprite-space y of each joint, ordered from the ground up. */
const JOINT_ORDER = [
  { key: 'sole', y: GROUND_Y },
  { key: 'ankle', y: REST_JOINTS.ankleY },
  { key: 'knee', y: REST_JOINTS.kneeY },
  { key: 'hip', y: REST_JOINTS.hipY },
  { key: 'shoulder', y: REST_JOINTS.shoulderY },
  { key: 'chin', y: REST_JOINTS.chinY },
  { key: 'vertex', y: REST_JOINTS.vertexY },
] as const;

type JointKey = (typeof JOINT_ORDER)[number]['key'];

/**
 * Vertical stretch of the segment that starts at `lower`. The foot and the head
 * are not stretched: a shoe is a shoe, and the skull is the one measurement a
 * photograph is guaranteed to preserve.
 */
function segmentStretch(lower: JointKey, fit: Working): number {
  switch (lower) {
    case 'ankle':
      return fit.shinStretch;
    case 'knee':
      return fit.thighStretch;
    case 'hip':
      return fit.torsoStretch;
    case 'shoulder':
      return fit.neckStretch;
    case 'chin':
      return fit.headStretch;
    default:
      return 1;
  }
}

/** Distance above the ground plane, in master pixels, for a sprite y. */
function heightAboveGround(spriteY: number, fit: Working): number {
  let height = 0;
  if (spriteY >= JOINT_ORDER[0].y) return 0;
  for (let index = 1; index < JOINT_ORDER.length; index++) {
    const lower = JOINT_ORDER[index - 1] as (typeof JOINT_ORDER)[number];
    const upper = JOINT_ORDER[index] as (typeof JOINT_ORDER)[number];
    const k = fit.scale * segmentStretch(lower.key, fit);
    if (spriteY <= upper.y) {
      height += (lower.y - upper.y) * k;
      continue;
    }
    height += (lower.y - spriteY) * k;
    return height;
  }
  return height;
}

export function masterY(spriteY: number, fit: Working): number {
  const pelvisHeight = heightAboveGround(PELVIS.y, fit);
  return fit.originY + pelvisHeight - heightAboveGround(spriteY, fit);
}

export function isArmBoneId(id: string): boolean {
  return id.endsWith('Arm') || id.endsWith('Hand');
}

/**
 * Arm chains hang from the shoulder, not from the hip, so their vertical
 * placement answers to `armStretch` rather than to the trunk segments. Keeping
 * this separate is what stops a long-torso persona from also getting long arms.
 */
function armMasterY(spriteY: number, fit: Working): number {
  const shoulder = masterY(REST_JOINTS.shoulderY, fit);
  return shoulder + (spriteY - REST_JOINTS.shoulderY) * fit.scale * fit.armStretch;
}

/** Maps a sprite point to master pixels. */
export function toMaster(point: Point2D, fit: Correspondence): Point2D {
  return {
    x: fit.originX + (point.x - PELVIS.x) * fit.scale,
    y: masterY(point.y, fit),
  };
}

/** Applies a correspondence to a set of rest bones, keeping `v` in atlas space. */
export function applyCorrespondence(bones: readonly Bone[], fit: Correspondence): Bone[] {
  return bones.map((bone) => {
    const mapY = isArmBoneId(bone.id) ? armMasterY : masterY;
    const proximal = { x: fit.originX + (bone.proximal.x - PELVIS.x) * fit.scale, y: mapY(bone.proximal.y, fit) };
    const distal = { x: fit.originX + (bone.distal.x - PELVIS.x) * fit.scale, y: mapY(bone.distal.y, fit) };
    const stretch = Math.abs(distal.y - proximal.y) / Math.max(0.5, Math.abs(bone.distal.y - bone.proximal.y));
    const widthScale = fit.scale * (0.5 + 0.5 * stretch);
    return {
      ...bone,
      proximal,
      distal,
      halfWidthProximal: bone.halfWidthProximal * widthScale,
      halfWidthDistal: bone.halfWidthDistal * widthScale,
    };
  });
}

const GRID = 4;

/** Downsampled subject mask: one cell is set if any of its 4×4 master pixels is subject. */
export function subjectGrid(
  master: RasterImage,
  key: Rgb,
): { mask: Uint8Array; width: number; height: number } {
  const width = Math.ceil(master.width / GRID);
  const height = Math.ceil(master.height / GRID);
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < master.height; y++) {
    for (let x = 0; x < master.width; x++) {
      const i = pixelIndex(master, x, y);
      const r = master.data[i] ?? 0;
      const g = master.data[i + 1] ?? 0;
      const b = master.data[i + 2] ?? 0;
      if (isChromaPixel(r, g, b, key)) continue;
      mask[Math.floor(y / GRID) * width + Math.floor(x / GRID)] = 1;
    }
  }
  return { mask, width, height };
}

/**
 * Silhouette IoU between the placed rig and the plate. This is a *reported
 * quality metric and a gate*, not an objective. An earlier version optimised it
 * by coordinate descent and it failed for an instructive reason: the head is
 * about 4 % of the silhouette area, so the gradient through the head is weaker
 * than the noise from the torso, and the optimiser happily left the skull 50 px
 * below the photographed head while reporting a slightly better score. A metric
 * that rewards the wrong thing is worse than no metric.
 */
export function silhouetteIou(
  master: RasterImage,
  key: Rgb,
  bones: readonly Bone[],
  fit: Correspondence,
): number {
  const grid = subjectGrid(master, key);
  const placed = applyCorrespondence(bones, fit);
  const candidate = new Uint8Array(grid.mask.length);
  for (const bone of placed) {
    const pad = Math.max(bone.halfWidthProximal, bone.halfWidthDistal) * 1.5 + GRID;
    const minX = Math.max(0, Math.floor((Math.min(bone.proximal.x, bone.distal.x) - pad) / GRID));
    const maxX = Math.min(grid.width - 1, Math.ceil((Math.max(bone.proximal.x, bone.distal.x) + pad) / GRID));
    const minY = Math.max(0, Math.floor((Math.min(bone.proximal.y, bone.distal.y) - pad) / GRID));
    const maxY = Math.min(grid.height - 1, Math.ceil((Math.max(bone.proximal.y, bone.distal.y) + pad) / GRID));
    for (let gy = minY; gy <= maxY; gy++) {
      for (let gx = minX; gx <= maxX; gx++) {
        const cell = gy * grid.width + gx;
        if (candidate[cell]) continue;
        const point = { x: gx * GRID + GRID / 2, y: gy * GRID + GRID / 2 };
        if (addressPoint(point, bone).normalizedDistance <= 1) candidate[cell] = 1;
      }
    }
  }
  let intersection = 0;
  let union = 0;
  for (let index = 0; index < grid.mask.length; index++) {
    const a = grid.mask[index] ?? 0;
    const b = candidate[index] ?? 0;
    if (a && b) intersection++;
    if (a || b) union++;
  }
  return union === 0 ? 0 : Number((intersection / union).toFixed(4));
}

export interface LandmarkRows {
  /** Top of the head (hair included), master row. */
  readonly crown: number;
  /** Lowest face-skin row, master row. */
  readonly chin: number;
  /** Top of the shoulder strap / the shoulder line, master row. */
  readonly shoulder: number;
  /** Bottom of the foot, master row. */
  readonly sole: number;
}

/** Anthropometric ratios that a single lateral photograph cannot measure. */
const PRIOR = {
  hip: 0.52,
  ankle: 0.039,
  torso: 0.47,
} as const;

/**
 * Correspondence from measured landmark rows.
 *
 * The vertical skeleton comes from four rows that the profile measures
 * directly — crown, chin, shoulder, sole — plus two anthropometric ratios for
 * the joints a photograph cannot see (the hip is inside the body, the ankle is
 * inside the shoe). Every stretch therefore has an interpretation:
 *
 *   headStretch  = this person's head / the rig's head
 *   neckStretch  = this person's neck / the rig's neck
 *   torsoStretch = shoulder-to-hip / the rig's trunk
 *   thigh/shin   = the remainder split by the rig's proportions
 *
 * No search, no constants per persona, and the result prints as six numbers in
 * `persona.json` for review.
 */
export function correspondenceFromLandmarks(
  rows: LandmarkRows,
  originX: number,
  plateHeight: number,
): Correspondence {
  const stature = Math.max(24, rows.sole - rows.crown);
  const scale = stature / STATURE_PX;
  const hip = rows.sole - PRIOR.hip * stature;
  const ankle = rows.sole - PRIOR.ankle * stature;
  const knee = (hip + ankle) / 2;
  const stretch = (masterSpan: number, spriteSpan: number): number =>
    clamp(masterSpan / Math.max(1e-3, spriteSpan * scale), 0.5, 2);
  const headStretch = stretch(rows.chin - rows.crown, REST_JOINTS.chinY - REST_JOINTS.vertexY);
  const neckStretch = stretch(rows.shoulder - rows.chin, REST_JOINTS.shoulderY - REST_JOINTS.chinY);
  const torsoStretch = stretch(hip - rows.shoulder, REST_JOINTS.hipY - REST_JOINTS.shoulderY);
  const thighStretch = stretch(knee - hip, Math.abs(REST_JOINTS.hipY - REST_JOINTS.kneeY));
  const shinStretch = stretch(ankle - knee, Math.abs(REST_JOINTS.kneeY - REST_JOINTS.ankleY));
  return {
    scale,
    originX: clamp(originX, 0, plateHeight * 4),
    originY: hip,
    headStretch,
    neckStretch,
    torsoStretch,
    thighStretch,
    shinStretch,
    armStretch: torsoStretch,
    iou: 0,
  };
}

/**
 * Per-pixel distance to the nearest background, in master pixels (3–4 chamfer).
 * The distance at a bone's axis *is* the radius of the largest disc that fits
 * inside the photographed limb — the medial-axis radius — which is the only
 * width measurement that does not depend on the bone's own assumed width.
 */
export function distanceToBackground(master: RasterImage, key: Rgb): Float32Array {
  const { width, height } = master;
  const distance = new Float32Array(width * height);
  const INF = 1e6;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = pixelIndex(master, x, y);
      const subject = !isChromaPixel(master.data[i] ?? 0, master.data[i + 1] ?? 0, master.data[i + 2] ?? 0, key);
      distance[y * width + x] = subject ? INF : 0;
    }
  }
  const at = (x: number, y: number): number =>
    x < 0 || y < 0 || x >= width || y >= height ? 0 : (distance[y * width + x] ?? 0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if ((distance[index] ?? 0) === 0) continue;
      const best = Math.min(
        at(x - 1, y) + 1,
        at(x, y - 1) + 1,
        at(x - 1, y - 1) + 1.414,
        at(x + 1, y - 1) + 1.414,
        distance[index] ?? 0,
      );
      distance[index] = best;
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const index = y * width + x;
      if ((distance[index] ?? 0) === 0) continue;
      const best = Math.min(
        at(x + 1, y) + 1,
        at(x, y + 1) + 1,
        at(x + 1, y + 1) + 1.414,
        at(x - 1, y + 1) + 1.414,
        distance[index] ?? 0,
      );
      distance[index] = best;
    }
  }
  return distance;
}

/**
 * Measures each bone's half-width from the silhouette instead of assuming the
 * rig's. Three points along the axis, median of the medial-axis radius. This is
 * what makes `v = ±1` mean "edge of the photographed limb", which is the entire
 * reason the atlas can be re-posed without smearing.
 *
 * Where two limbs touch — the hand resting on the thigh, the arm against the
 * ribs — the medial radius belongs to the union and overstates both. That is
 * reported through `confidence`, and `buildPersonaFromPlate` only accepts a
 * measurement when it is consistent along the bone.
 */
export function measureBoneHalfWidths(
  master: RasterImage,
  key: Rgb,
  placed: readonly Bone[],
): Record<string, number> {
  const distance = distanceToBackground(master, key);
  const result: Record<string, number> = {};
  for (const bone of placed) {
    const measures: number[] = [];
    for (const t of [0.25, 0.5, 0.75]) {
      const x = Math.round(bone.proximal.x + (bone.distal.x - bone.proximal.x) * t);
      const y = Math.round(bone.proximal.y + (bone.distal.y - bone.proximal.y) * t);
      if (x < 0 || y < 0 || x >= master.width || y >= master.height) continue;
      const value = distance[y * master.width + x] ?? 0;
      if (value > 0.5 && value < 1e5) measures.push(value);
    }
    if (measures.length === 0) {
      result[bone.id] = 0;
      continue;
    }
    // The minimum, not the median: where two limbs touch, the medial radius
    // belongs to the union and overstates both. The thinnest sample is the one
    // least contaminated by a neighbour.
    result[bone.id] = Math.min(...measures);
  }
  return result;
}
