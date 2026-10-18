import { pixelIndex } from '../core/raster.js';
import { isChromaPixel } from '../analysis/chroma.js';

export { isChromaPixel };
import type { RasterImage } from '../core/types.js';

/**
 * Measurements taken from a persona master plate. Every value is produced by
 * scanning the plate: vertical landmarks, garment boundaries, band widths, and
 * a colour palette. Nothing here is a hand-tuned crop constant.
 */
export interface MasterProfile {
  readonly sourceWidth: number;
  readonly sourceHeight: number;
  readonly detectedKey: Rgb;
  readonly topY: number;
  readonly soleY: number;
  readonly heightPx: number;
  readonly minX: number;
  readonly maxX: number;
  readonly landmarks: Readonly<Record<LandmarkId, number>>;
  readonly normalized: Readonly<Record<LandmarkId, number>>;
  readonly bands: Readonly<Record<BandId, number>>;
  readonly palette: Readonly<Record<'skin' | 'fabric' | 'shorts' | 'shoe' | 'hair', Rgb>>;
  /** Measured hanging-arm axis: the arm is the right-hand skin column in the torso band. */
  readonly armAxis: { readonly x: number; readonly topY: number; readonly bottomY: number };
}

export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export type RegionId = 'skin' | 'fabric' | 'dark' | 'white' | 'hair' | 'key' | 'other';

export type LandmarkId =
  | 'headTop'
  | 'neck'
  | 'shoulder'
  | 'waist'
  | 'hip'
  | 'shortsHem'
  | 'knee'
  | 'ankle'
  | 'sockTop'
  | 'sole';

export type BandId = 'head' | 'neck' | 'torso' | 'pelvis' | 'thigh' | 'shin' | 'arm';

export interface RowSpan {
  readonly y: number;
  readonly minX: number;
  readonly maxX: number;
  readonly width: number;
}

export interface RowRegions {
  readonly y: number;
  readonly counts: Readonly<Record<RegionId, number>>;
}

export interface KeyedMaster {
  readonly image: RasterImage;
  readonly key: Rgb;
  readonly rows: readonly RowSpan[];
  readonly regions: readonly RowRegions[];
  readonly topY: number;
  readonly soleY: number;
  readonly minX: number;
  readonly maxX: number;
}

/** Median colour of the image border: the backdrop that must be keyed out. */
export function detectKeyColour(image: RasterImage): Rgb {
  const channel = (index: 0 | 1 | 2): number => {
    const values: number[] = [];
    for (let x = 0; x < image.width; x += 4) {
      values.push(image.data[pixelIndex(image, x, 0) + index] ?? 0);
      values.push(image.data[pixelIndex(image, x, image.height - 1) + index] ?? 0);
    }
    for (let y = 0; y < image.height; y += 4) {
      values.push(image.data[pixelIndex(image, 0, y) + index] ?? 0);
      values.push(image.data[pixelIndex(image, image.width - 1, y) + index] ?? 0);
    }
    const sorted = values.sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] ?? 0;
  };
  return { r: channel(0), g: channel(1), b: channel(2) };
}

/**
 * Material classification. Warm skin is separated from crimson fabric by the
 * green channel (fabric dye absorbs green), and from dark shorts and hair by
 * luminance. These tests are intentionally loose: they are used for band
 * statistics, not for matting.
 */
export function classifyPixel(r: number, g: number, b: number, key: Rgb): RegionId {
  if (isChromaPixel(r, g, b, key)) return 'key';
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max < 78) return 'hair';
  if (min > 168 && max - min < 26) return 'white';
  if (r > 95 && g > 78 && b > 45 && r > g + 18 && g > b + 6) return 'skin';
  if (r > 70 && r - g > 40 && r - b > 25 && g < 95) return 'fabric';
  if (max < 110 && max - min < 45) return 'dark';
  return 'other';
}

/** Keys the backdrop and returns both per-row silhouette spans and region counts. */
export function keyMaster(image: RasterImage, key: Rgb): KeyedMaster {
  const rows: RowSpan[] = [];
  const regions: RowRegions[] = [];
  let topY = image.height;
  let soleY = -1;
  let minX = image.width;
  let maxX = -1;
  for (let y = 0; y < image.height; y++) {
    let rowMin = image.width;
    let rowMax = -1;
    const counts: Record<RegionId, number> = { skin: 0, fabric: 0, dark: 0, white: 0, hair: 0, key: 0, other: 0 };
    for (let x = 0; x < image.width; x++) {
      const i = pixelIndex(image, x, y);
      const r = image.data[i] ?? 0;
      const g = image.data[i + 1] ?? 0;
      const b = image.data[i + 2] ?? 0;
      const region = classifyPixel(r, g, b, key);
      counts[region]++;
      if (region === 'key') continue;
      if (x < rowMin) rowMin = x;
      if (x > rowMax) rowMax = x;
    }
    regions.push({ y, counts });
    if (rowMax < 0) continue;
    rows.push({ y, minX: rowMin, maxX: rowMax, width: rowMax - rowMin + 1 });
    topY = Math.min(topY, y);
    soleY = Math.max(soleY, y);
    minX = Math.min(minX, rowMin);
    maxX = Math.max(maxX, rowMax);
  }
  return { image, key, rows, regions, topY, soleY, minX, maxX };
}

export function widthAt(rows: readonly RowSpan[], y: number): number {
  const row = rows.find((span) => span.y === Math.round(y));
  return row?.width ?? 0;
}

function narrowest(rows: readonly RowSpan[], from: number, to: number, predicate?: (y: number) => boolean): number {
  let bestY = Math.round(from);
  let bestWidth = Number.POSITIVE_INFINITY;
  for (let y = Math.round(from); y <= Math.round(to); y++) {
    if (predicate && !predicate(y)) continue;
    const width = widthAt(rows, y);
    if (width > 0 && width < bestWidth) {
      bestWidth = width;
      bestY = y;
    }
  }
  return bestY;
}

function firstRow(regions: readonly RowRegions[], region: RegionId, from: number, to: number, minCount = 6): number {
  for (let y = Math.round(from); y <= Math.round(to); y++) {
    if ((regions[y]?.counts[region] ?? 0) >= minCount) return y;
  }
  return -1;
}

function lastRow(regions: readonly RowRegions[], region: RegionId, from: number, to: number, minCount = 6): number {
  for (let y = Math.round(to); y >= Math.round(from); y--) {
    if ((regions[y]?.counts[region] ?? 0) >= minCount) return y;
  }
  return -1;
}

export function measureMaster(keyed: KeyedMaster): MasterProfile {
  const heightPx = keyed.soleY - keyed.topY;
  const at = (fraction: number): number => keyed.topY + heightPx * fraction;
  const neck = narrowest(keyed.rows, at(0.13), at(0.24));
  const fabricPeak = Math.max(...keyed.regions.map((row) => row.counts.fabric));
  const fabricThreshold = Math.max(8, Math.round(fabricPeak * 0.5));
  const shoulder = Math.max(neck + 4, firstRow(keyed.regions, 'fabric', at(0.15), at(0.35), fabricThreshold));
  const waist = lastRow(keyed.regions, 'fabric', shoulder, at(0.62), fabricThreshold);
  const hip = firstRow(keyed.regions, 'dark', Math.max(waist, at(0.5)), at(0.7));
  const shortsHem = lastRow(keyed.regions, 'dark', Math.max(hip, at(0.5)), at(0.72));
  const sockTop = firstRow(keyed.regions, 'white', at(0.86), keyed.soleY);
  const ankle = sockTop > 0 ? Math.round(sockTop + 2) : narrowest(keyed.rows, at(0.88), at(0.985));
  const knee = Math.round((Math.max(waist, at(0.5)) + ankle) / 2);
  const landmarks: Record<LandmarkId, number> = {
    headTop: keyed.topY,
    neck,
    shoulder,
    waist: waist < 0 ? Math.round(at(0.55)) : waist,
    hip: hip < 0 ? Math.round(at(0.6)) : hip,
    shortsHem: shortsHem < 0 ? Math.round(at(0.68)) : shortsHem,
    knee,
    ankle,
    sockTop: sockTop < 0 ? Math.round(at(0.93)) : sockTop,
    sole: keyed.soleY,
  };
  return {
    sourceWidth: keyed.image.width,
    sourceHeight: keyed.image.height,
    detectedKey: keyed.key,
    topY: keyed.topY,
    soleY: keyed.soleY,
    heightPx,
    minX: keyed.minX,
    maxX: keyed.maxX,
    landmarks,
    normalized: normalizeLandmarks(landmarks, keyed.topY, heightPx),
    bands: measureBands(keyed.rows, landmarks),
    palette: samplePalette(keyed, landmarks),
    armAxis: measureArmAxis(keyed, landmarks),
  };
}

function normalizeLandmarks(
  landmarks: Record<LandmarkId, number>,
  topY: number,
  heightPx: number,
): Record<LandmarkId, number> {
  const entries = Object.entries(landmarks).map(([key, y]) => [
    key,
    Number((1 - (y - topY) / heightPx).toFixed(4)),
  ]);
  return Object.fromEntries(entries) as Record<LandmarkId, number>;
}

function averageWidth(rows: readonly RowSpan[], from: number, to: number): number {
  const selected = rows.filter((row) => row.y >= from && row.y <= to);
  if (selected.length === 0) return 0;
  return Number((selected.reduce((sum, row) => sum + row.width, 0) / selected.length).toFixed(1));
}

function measureBands(rows: readonly RowSpan[], landmarks: Record<LandmarkId, number>): Record<BandId, number> {
  const { headTop, neck, shoulder, waist, hip, shortsHem, knee, ankle, sole } = landmarks;
  return {
    head: averageWidth(rows, headTop + 4, neck),
    neck: averageWidth(rows, neck, shoulder),
    torso: averageWidth(rows, shoulder, waist),
    pelvis: averageWidth(rows, hip, shortsHem),
    thigh: averageWidth(rows, shortsHem, knee),
    shin: averageWidth(rows, knee, ankle),
    arm: averageWidth(rows, ankle, sole),
  };
}

/**
 * In a lateral standing photograph the near arm hangs in front of the singlet,
 * so it is the only skin-classified column inside the torso band. Measuring its
 * axis is what lets the atlas bind arm pixels to arm bones instead of smearing
 * singlet fabric down the forearm.
 */
function measureArmAxis(
  keyed: KeyedMaster,
  landmarks: Record<LandmarkId, number>,
): { x: number; topY: number; bottomY: number } {
  const centres: number[] = [];
  const topY = landmarks.shoulder;
  const bottomY = landmarks.hip + Math.round((landmarks.knee - landmarks.hip) * 0.15);
  for (let y = topY; y <= bottomY; y++) {
    const centre = skinColumnCentre(keyed, y);
    if (centre !== null) centres.push(centre);
  }
  centres.sort((a, b) => a - b);
  const median = centres[Math.floor(centres.length / 2)] ?? keyed.maxX;
  return { x: Number(median.toFixed(1)), topY, bottomY };
}

function skinColumnCentre(keyed: KeyedMaster, y: number): number | null {
  let sum = 0;
  let count = 0;
  for (let x = keyed.minX; x <= keyed.maxX; x++) {
    const i = pixelIndex(keyed.image, x, y);
    const r = keyed.image.data[i] ?? 0;
    const g = keyed.image.data[i + 1] ?? 0;
    const b = keyed.image.data[i + 2] ?? 0;
    if (classifyPixel(r, g, b, keyed.key) !== 'skin') continue;
    sum += x;
    count++;
  }
  return count >= 4 ? sum / count : null;
}

function samplePalette(keyed: KeyedMaster, landmarks: Record<LandmarkId, number>): MasterProfile['palette'] {
  return {
    skin: medianRegionColour(keyed, 'skin', landmarks.shortsHem, landmarks.knee),
    fabric: medianRegionColour(keyed, 'fabric', landmarks.shoulder, landmarks.waist),
    shorts: medianRegionColour(keyed, 'dark', landmarks.hip, landmarks.shortsHem),
    shoe: medianRegionColour(keyed, 'white', landmarks.ankle, landmarks.sole),
    hair: medianRegionColour(keyed, 'hair', landmarks.headTop, landmarks.neck),
  };
}

function medianRegionColour(
  keyed: KeyedMaster,
  region: RegionId,
  fromY: number,
  toY: number,
): Rgb {
  const reds: number[] = [];
  const greens: number[] = [];
  const blues: number[] = [];
  for (let y = Math.round(fromY); y <= Math.round(toY); y += 2) {
    for (let x = 0; x < keyed.image.width; x += 2) {
      const i = pixelIndex(keyed.image, x, y);
      const r = keyed.image.data[i] ?? 0;
      const g = keyed.image.data[i + 1] ?? 0;
      const b = keyed.image.data[i + 2] ?? 0;
      if (classifyPixel(r, g, b, keyed.key) !== region) continue;
      reds.push(r);
      greens.push(g);
      blues.push(b);
    }
  }
  const median = (values: number[]): number => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] ?? 0;
  };
  return { r: median(reds), g: median(greens), b: median(blues) };
}
