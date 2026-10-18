import { clamp, distanceToSegment } from '../core/geometry.js';
import { pixelIndex } from '../core/raster.js';
import type { Point2D, RasterImage } from '../core/types.js';
import { classifyPixel, type RegionId, type Rgb } from '../profile/master-profile.js';
import { isChromaPixel } from '../analysis/chroma.js';
import type { Bone, BoneId } from '../rig/bones.js';

/** Atlas tile resolution: `width` samples along `u`, `height` samples across `v`. */
export const ATLAS_TILE_WIDTH = 96;
export const ATLAS_TILE_HEIGHT = 44;

export interface AtlasTile {
  readonly boneId: BoneId;
  readonly width: number;
  readonly height: number;
  /** RGBA at `(u * width, ((v + 1) / 2) * height)`. */
  readonly data: Uint8ClampedArray;
  /** 1 where the tile holds an observed sample, 0 where it is synthetic fill. */
  readonly observed: Uint8Array;
}

export interface Atlas {
  readonly tiles: Readonly<Record<BoneId, AtlasTile>>;
  readonly report: AtlasReport;
}

export interface AtlasReport {
  /** Subject (non-backdrop) pixels found on the plate. */
  readonly subjectPixels: number;
  readonly observedPixels: number;
  readonly syntheticPixels: number;
  readonly syntheticFraction: number;
  readonly perBone: Readonly<Record<BoneId, BoneCoverage>>;
  readonly unassignedSubjectPixels: number;
}

export interface BoneCoverage {
  readonly observed: number;
  readonly synthetic: number;
  /** Median distance of observed pixels from the bone axis, in master px. */
  readonly halfWidthPx: number;
}

interface Accumulator {
  readonly sums: Float64Array;
  readonly weights: Float64Array;
  readonly magnitudes: number[];
}

function emptyAccumulator(): Accumulator {
  return {
    sums: new Float64Array(ATLAS_TILE_WIDTH * ATLAS_TILE_HEIGHT * 4),
    weights: new Float64Array(ATLAS_TILE_WIDTH * ATLAS_TILE_HEIGHT),
    magnitudes: [],
  };
}

interface BoneAddress {
  readonly bone: Bone;
  readonly t: number;
  readonly offset: number;
  readonly normalizedDistance: number;
}

/** Projects a point into a bone's local frame. */
export function addressPoint(point: Point2D, bone: Bone): BoneAddress {
  const dx = bone.distal.x - bone.proximal.x;
  const dy = bone.distal.y - bone.proximal.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq < 1e-9) {
    const distance = Math.hypot(point.x - bone.proximal.x, point.y - bone.proximal.y);
    return { bone, t: 0, offset: 0, normalizedDistance: distance / Math.max(0.5, bone.halfWidthProximal) };
  }
  const t = clamp(((point.x - bone.proximal.x) * dx + (point.y - bone.proximal.y) * dy) / lengthSq, 0, 1);
  const halfWidth = bone.halfWidthProximal + (bone.halfWidthDistal - bone.halfWidthProximal) * t;
  const distance = distanceToSegment(point, bone.proximal, bone.distal);
  const cross = (point.x - bone.proximal.x) * dy - (point.y - bone.proximal.y) * dx;
  return {
    bone,
    t,
    offset: clamp((cross > 0 ? distance : -distance) / Math.max(0.5, halfWidth), -1.6, 1.6),
    normalizedDistance: distance / Math.max(0.5, halfWidth),
  };
}

/**
 * Which materials a bone may claim. Without this, hair binds to the head bone
 * (giving a face the width of a ponytail) and singlet fabric binds to the arm
 * bone (painting crimson stripes down a forearm). The penalty is large enough
 * to override distance but finite, so an unexpected plate still resolves.
 */
const MATERIAL_GROUPS: Readonly<Partial<Record<RegionId, readonly string[]>>> = {
  skin: ['head', 'neck', 'UpperArm', 'Forearm', 'Hand', 'Thigh', 'Shin'],
  fabric: ['torso', 'pelvis'],
  dark: ['pelvis', 'hair'],
  white: ['Foot', 'Shin', 'Hand'],
  hair: ['hair'],
};

/**
 * Bone selection: material first, then occlusion order, then distance.
 *
 * Geometry alone cannot separate an arm from the torso it hangs in front of:
 * the torso bone is four times wider, so every arm pixel is "closer" to it in
 * normalised units and the arm tile ends up empty. The material class fixes
 * that. But material alone is not enough where the *same* material overlaps
 * itself — in a lateral plate the hand rests on the thigh, so hand pixels and
 * thigh pixels are identical skin, and a distance test gives the thigh every
 * one of them because its axis is nearer. That is not a measurement problem:
 * a single photograph contains no depth. It is resolved with the only depth
 * information there is — anatomy. The near arm is in front of the near thigh
 * in a lateral view, so among bones that actually contain the point, the most
 * forward bone wins, and distance is only a tie-break for points outside every
 * capsule.
 *
 * The consequence is deliberate: the hidden part of the thigh is never
 * observed, becomes a hole in its tile, and is filled by interpolation (or
 * left empty) rather than by stealing the hand's pixels.
 */
export function nearestBone(point: Point2D, bones: readonly Bone[], region: RegionId = 'other'): BoneAddress {
  const allowed = MATERIAL_GROUPS[region];
  let contained: BoneAddress | null = null;
  let containedOrder = -Infinity;
  let nearest: BoneAddress | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const bone of bones) {
    if (allowed && !allowed.some((suffix) => bone.id === suffix || bone.id.endsWith(suffix))) continue;
    const candidate = addressPoint(point, bone);
    if (candidate.normalizedDistance <= 1) {
      if (bone.paintOrder > containedOrder) {
        contained = candidate;
        containedOrder = bone.paintOrder;
      }
      continue;
    }
    if (candidate.normalizedDistance < nearestDistance) {
      nearest = candidate;
      nearestDistance = candidate.normalizedDistance;
    }
  }
  const best = contained ?? nearest;
  return best ?? addressPoint(point, bones[0] as Bone);
}

function tileCoords(t: number, offset: number): { tx: number; ty: number } {
  const tx = clamp(Math.floor(t * (ATLAS_TILE_WIDTH - 1)), 0, ATLAS_TILE_WIDTH - 1);
  const ty = clamp(Math.floor(((offset + 1) / 2) * (ATLAS_TILE_HEIGHT - 1)), 0, ATLAS_TILE_HEIGHT - 1);
  return { tx, ty };
}

/**
 * Unwraps a keyed photograph into bone-local atlas tiles.
 *
 * Every subject pixel is projected onto the nearest bone and accumulated at its
 * `(u, v)` address. Because multiple source pixels can share an address (the far
 * limb hides part of the near one, the arm hides part of the torso), the tile is
 * a weighted mean rather than a last-writer-wins copy — which is what keeps
 * lighting continuous across the surface.
 */
export function buildAtlas(master: RasterImage, key: Rgb, bones: readonly Bone[]): Atlas {
  const accumulators = new Map<BoneId, Accumulator>();
  const observed = new Map<BoneId, Uint8Array>();
  for (const bone of bones) {
    accumulators.set(bone.id, emptyAccumulator());
    observed.set(bone.id, new Uint8Array(ATLAS_TILE_WIDTH * ATLAS_TILE_HEIGHT));
  }
  const subject = collectSubject(master, key);
  const claimed = new Uint8Array(subject.length);
  let assigned = 0;
  const claim = (index: number, address: BoneAddress): void => {
    const pixel = subject[index];
    if (!pixel) return;
    const weight = clamp(1.45 - address.normalizedDistance, 0.05, 1);
    accumulate(accumulators.get(address.bone.id) as Accumulator, address, pixel.r, pixel.g, pixel.b, weight);
    const { tx, ty } = tileCoords(address.t, address.offset);
    (observed.get(address.bone.id) as Uint8Array)[ty * ATLAS_TILE_WIDTH + tx] = 1;
    claimed[index] = 1;
    assigned++;
  };
  assignOcclusionAware(subject, bones, claim);
  assignStarved(subject, bones, observed, claimed, claim);
  assignFringe(subject, bones, claimed, claim);
  const { tiles, perBone, totalObserved, totalSynthetic } = resolveAllBones(bones, accumulators, observed);
  synthesiseFarSide(tiles, perBone);
  return {
    tiles,
    report: {
      subjectPixels: subject.filter(Boolean).length,
      observedPixels: totalObserved,
      syntheticPixels: totalSynthetic,
      syntheticFraction: Number((totalSynthetic / Math.max(1, totalObserved + totalSynthetic)).toFixed(4)),
      perBone,
      unassignedSubjectPixels: subject.filter(Boolean).length - assigned,
    },
  };
}

/** Minimum observed cells before a bone is considered covered rather than starved. */
const MIN_OBSERVED_CELLS = 40;

interface SubjectPixel {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly region: RegionId;
}

/** Every non-background pixel of the plate, with its material class. */
function collectSubject(master: RasterImage, key: Rgb): readonly (SubjectPixel | null)[] {
  const pixels: (SubjectPixel | null)[] = new Array<SubjectPixel | null>(master.width * master.height).fill(null);
  for (let y = 0; y < master.height; y++) {
    for (let x = 0; x < master.width; x++) {
      const i = pixelIndex(master, x, y);
      const r = master.data[i] ?? 0;
      const g = master.data[i + 1] ?? 0;
      const b = master.data[i + 2] ?? 0;
      if (isChromaPixel(r, g, b, key)) continue;
      pixels[y * master.width + x] = { x: x + 0.5, y: y + 0.5, r, g, b, region: classifyPixel(r, g, b, key) };
    }
  }
  return pixels;
}

function countObserved(mask: Uint8Array): number {
  let count = 0;
  for (const value of mask) if (value) count++;
  return count;
}

type Claim = (index: number, address: BoneAddress) => void;

/**
 * Pass 1 — occlusion-aware assignment: material class first, then the most
 * forward bone that contains the pixel, then distance.
 */
function assignOcclusionAware(
  subject: readonly (SubjectPixel | null)[],
  bones: readonly Bone[],
  claim: Claim,
): void {
  for (let index = 0; index < subject.length; index++) {
    const pixel = subject[index];
    if (!pixel) continue;
    const address = nearestBone({ x: pixel.x, y: pixel.y }, bones, pixel.region);
    if (address.normalizedDistance > 1.45) continue;
    claim(index, address);
  }
}

/**
 * Pass 2 — recovery. A bone that pass 1 starved (it sits behind a wider bone
 * everywhere it is visible) may claim unclaimed pixels strictly inside its own
 * capsule. Evidence beats invention: this runs before any synthesised fill, and
 * is what gives the neck its own texture instead of a copy of the jaw.
 */
function assignStarved(
  subject: readonly (SubjectPixel | null)[],
  bones: readonly Bone[],
  observed: ReadonlyMap<BoneId, Uint8Array>,
  claimed: Uint8Array,
  claim: Claim,
): void {
  const starved = bones.filter(
    (bone) => countObserved(observed.get(bone.id) as Uint8Array) < MIN_OBSERVED_CELLS,
  );
  for (const bone of starved) {
    for (let index = 0; index < subject.length; index++) {
      if (claimed[index]) continue;
      const pixel = subject[index];
      if (!pixel) continue;
      const address = addressPoint({ x: pixel.x, y: pixel.y }, bone);
      if (address.normalizedDistance > 1) continue;
      claim(index, address);
    }
  }
}

/**
 * Pass 3 — fringe. The capsules are anatomical, so they stop at the bone's
 * nominal surface, but a photograph does not: the shoe sole, the fingertips and
 * the outside of a bent knee all reach past it. Those pixels used to be dropped
 * (12.5 % of the subject), which showed up as transparent bites in the rendered
 * silhouette. They are now claimed by nearest normalised distance, with a low
 * weight so they sharpen the tile's edge without dominating its interior.
 */
function assignFringe(
  subject: readonly (SubjectPixel | null)[],
  bones: readonly Bone[],
  claimed: Uint8Array,
  claim: Claim,
): void {
  for (let index = 0; index < subject.length; index++) {
    if (claimed[index]) continue;
    const pixel = subject[index];
    if (!pixel) continue;
    const address = nearestBone({ x: pixel.x, y: pixel.y }, bones, pixel.region);
    if (address.normalizedDistance > 2.5) continue;
    claim(index, address);
  }
}

function resolveAllBones(
  bones: readonly Bone[],
  accumulators: ReadonlyMap<BoneId, Accumulator>,
  observed: ReadonlyMap<BoneId, Uint8Array>,
): {
  tiles: Record<BoneId, AtlasTile>;
  perBone: Record<BoneId, BoneCoverage>;
  totalObserved: number;
  totalSynthetic: number;
} {
  const tiles = {} as Record<BoneId, AtlasTile>;
  const perBone = {} as Record<BoneId, BoneCoverage>;
  let totalObserved = 0;
  let totalSynthetic = 0;
  for (const bone of bones) {
    const accumulator = accumulators.get(bone.id) as Accumulator;
    const resolved = resolveTile(bone, accumulator, observed.get(bone.id) as Uint8Array);
    tiles[bone.id] = resolved.tile;
    perBone[bone.id] = {
      observed: resolved.observed,
      synthetic: resolved.synthetic,
      halfWidthPx: percentile(accumulator.magnitudes, 0.5),
    };
    totalObserved += resolved.observed;
    totalSynthetic += resolved.synthetic;
  }
  return { tiles, perBone, totalObserved, totalSynthetic };
}

function accumulate(
  accumulator: Accumulator,
  address: BoneAddress,
  r: number,
  g: number,
  b: number,
  weight: number,
): void {
  const { tx, ty } = tileCoords(address.t, address.offset);
  accumulator.magnitudes.push(Math.abs(address.offset) * localHalfWidth(address));
  const index = ty * ATLAS_TILE_WIDTH + tx;
  accumulator.sums[index * 4] = (accumulator.sums[index * 4] ?? 0) + r * weight;
  accumulator.sums[index * 4 + 1] = (accumulator.sums[index * 4 + 1] ?? 0) + g * weight;
  accumulator.sums[index * 4 + 2] = (accumulator.sums[index * 4 + 2] ?? 0) + b * weight;
  accumulator.sums[index * 4 + 3] = (accumulator.sums[index * 4 + 3] ?? 0) + weight * 255;
  accumulator.weights[index] = (accumulator.weights[index] ?? 0) + weight;
}

interface ResolvedTile {
  readonly tile: AtlasTile;
  readonly observed: number;
  readonly synthetic: number;
}

/**
 * Turns weighted sums into an RGBA tile and fills unobserved addresses along
 * each `u` row by interpolating between the nearest observed `v` samples. Filled
 * samples stay marked unobserved so the report can count them honestly.
 */
function resolveTile(bone: Bone, accumulator: Accumulator, observedMask: Uint8Array): ResolvedTile {
  const data = new Uint8ClampedArray(ATLAS_TILE_WIDTH * ATLAS_TILE_HEIGHT * 4);
  const observed = new Uint8Array(ATLAS_TILE_WIDTH * ATLAS_TILE_HEIGHT);
  for (let tx = 0; tx < ATLAS_TILE_WIDTH; tx++) {
    for (let index = 0; index < ATLAS_TILE_HEIGHT; index++) {
      const cell = index * ATLAS_TILE_WIDTH + tx;
      const weight = accumulator.weights[cell] ?? 0;
      const out = cell * 4;
      if (weight > 0) {
        data[out] = (accumulator.sums[out] ?? 0) / weight;
        data[out + 1] = (accumulator.sums[out + 1] ?? 0) / weight;
        data[out + 2] = (accumulator.sums[out + 2] ?? 0) / weight;
        data[out + 3] = 255;
        observed[cell] = 1;
      }
    }
  }
  let observedCells = 0;
  let syntheticCells = 0;
  for (let tx = 0; tx < ATLAS_TILE_WIDTH; tx++) {
    for (let index = 0; index < ATLAS_TILE_HEIGHT; index++) {
      const cell = index * ATLAS_TILE_WIDTH + tx;
      if (observed[cell]) {
        observedCells++;
        continue;
      }
      const filled = interpolateGap(data, observed, index, tx);
      if (filled) {
        data[cell * 4 + 3] = 255;
        syntheticCells++;
      }
    }
  }
  return {
    tile: { boneId: bone.id, width: ATLAS_TILE_WIDTH, height: ATLAS_TILE_HEIGHT, data, observed: observedMask },
    observed: observedCells,
    synthetic: syntheticCells,
  };
}

/**
 * Fills a hole along `v` only when observed cells exist on *both* sides. A cell
 * beyond the outermost observation is left transparent: that region of the body
 * was never photographed, and inventing it would inflate the texture without
 * evidence. The count of what was invented is what `syntheticFraction` reports.
 */
function interpolateGap(data: Uint8ClampedArray, observed: Uint8Array, row: number, tx: number): boolean {
  let above = -1;
  let below = -1;
  for (let index = row - 1; index >= 0; index--) {
    if (observed[index * ATLAS_TILE_WIDTH + tx]) {
      above = index;
      break;
    }
  }
  for (let index = row + 1; index < ATLAS_TILE_HEIGHT; index++) {
    if (observed[index * ATLAS_TILE_WIDTH + tx]) {
      below = index;
      break;
    }
  }
  if (above < 0 || below < 0) return false;
  const a = above;
  const b = below;
  const span = b - a;
  const ratio = span === 0 ? 0 : (row - a) / span;
  const cell = row * ATLAS_TILE_WIDTH + tx;
  const cellA = a * ATLAS_TILE_WIDTH + tx;
  const cellB = b * ATLAS_TILE_WIDTH + tx;
  for (let channel = 0; channel < 3; channel++) {
    const va = data[cellA * 4 + channel] ?? 0;
    const vb = data[cellB * 4 + channel] ?? 0;
    data[cell * 4 + channel] = va + (vb - va) * ratio;
  }
  return true;
}

/**
 * The lateral master shows only the near limbs. Rather than leave the far layer
 * empty (which is what a strict geometric assignment does), mirror the near
 * limb's atlas across the bone axis and mark every mirrored cell synthetic. The
 * result is visibly consistent — the far arm is lit like the near arm, because
 * it *is* the near arm — and its cost is counted instead of hidden.
 */
const FAR_TO_NEAR: Readonly<Record<string, string>> = {
  farUpperArm: 'nearUpperArm',
  farForearm: 'nearForearm',
  farHand: 'nearHand',
  farThigh: 'nearThigh',
  farShin: 'nearShin',
  farFoot: 'nearFoot',
};

function synthesiseFarSide(
  tiles: Record<BoneId, AtlasTile>,
  perBone: Record<BoneId, BoneCoverage>,
): void {
  for (const [farId, nearId] of Object.entries(FAR_TO_NEAR) as Array<[BoneId, BoneId]>) {
    const far = tiles[farId];
    const near = tiles[nearId];
    const coverage = perBone[farId];
    const farObserved = coverage.observed / (ATLAS_TILE_WIDTH * ATLAS_TILE_HEIGHT);
    if (farObserved > 0.08) continue;
    const data = new Uint8ClampedArray(near.data.length);
    let mirrored = 0;
    for (let index = 0; index < ATLAS_TILE_HEIGHT; index++) {
      const source = ATLAS_TILE_HEIGHT - 1 - index;
      for (let tx = 0; tx < ATLAS_TILE_WIDTH; tx++) {
        const target = (index * ATLAS_TILE_WIDTH + tx) * 4;
        const from = (source * ATLAS_TILE_WIDTH + tx) * 4;
        if ((near.data[from + 3] ?? 0) === 0) continue;
        data[target] = (near.data[from] ?? 0) * 0.86;
        data[target + 1] = (near.data[from + 1] ?? 0) * 0.86;
        data[target + 2] = (near.data[from + 2] ?? 0) * 0.86;
        data[target + 3] = 255;
        mirrored++;
      }
    }
    tiles[farId] = { boneId: farId, width: ATLAS_TILE_WIDTH, height: ATLAS_TILE_HEIGHT, data, observed: far.observed };
    perBone[farId] = { observed: coverage.observed, synthetic: coverage.synthetic + mirrored, halfWidthPx: perBone[nearId].halfWidthPx };
  }
}

function localHalfWidth(address: BoneAddress): number {
  const { bone, t } = address;
  return bone.halfWidthProximal + (bone.halfWidthDistal - bone.halfWidthProximal) * t;
}

function percentile(values: readonly number[], fraction: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * fraction)));
  return Number((sorted[index] ?? 0).toFixed(2));
}

export function sampleAtlas(tile: AtlasTile, t: number, offset: number): { r: number; g: number; b: number } {
  const fx = clamp(t, 0, 1) * (ATLAS_TILE_WIDTH - 1);
  const fy = clamp((offset + 1) / 2, 0, 1) * (ATLAS_TILE_HEIGHT - 1);
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(ATLAS_TILE_WIDTH - 1, x0 + 1);
  const y1 = Math.min(ATLAS_TILE_HEIGHT - 1, y0 + 1);
  const ax = fx - x0;
  const ay = fy - y0;
  const sample = (x: number, y: number, channel: number): number =>
    tile.data[(y * ATLAS_TILE_WIDTH + x) * 4 + channel] ?? 0;
  const bilinear = (channel: number): number => {
    const top = sample(x0, y0, channel) * (1 - ax) + sample(x1, y0, channel) * ax;
    const bottom = sample(x0, y1, channel) * (1 - ax) + sample(x1, y1, channel) * ax;
    return top * (1 - ay) + bottom * ay;
  };
  return { r: bilinear(0), g: bilinear(1), b: bilinear(2) };
}
