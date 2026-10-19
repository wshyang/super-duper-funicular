import type { RasterImage, RgbaColor } from '../shared/types.js';
import { createRaster, readPixel } from './raster.js';
import { removeSmallOpaqueIslands } from './connected-components.js';

/**
 * Photo-plate chroma matte.
 *
 * The studio plates are not flat magenta: the backdrop has a soft vertical
 * gradient, and cast shadow is the same magenta darkened by roughly 40 %, which
 * changes its RGB ratios but not its hue. Keying on RGB distance therefore eats
 * half the shadow and keeps the other half. This module models the backdrop as a
 * per-row median and decides membership by *hue* with a saturation gate, then
 * unmixes the remaining backdrop contribution from partially transparent pixels.
 */

export interface BackdropSample {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface BackdropModel {
  readonly width: number;
  readonly height: number;
  readonly rowMedians: readonly BackdropSample[];
  readonly globalMedian: BackdropSample;
  readonly noise: number;
}

export interface MatteStats {
  readonly foregroundPixels: number;
  readonly ghostPixels: number;
  readonly ghostRatio: number;
  readonly fringeRatio: number;
  readonly magentaLeakPixels: number;
  readonly interiorLeakPixels: number;
  readonly interiorLeakRatio: number;
  readonly shadowFraction: number;
  readonly backdropNoise: number;
}

export interface KeyedPlate {
  readonly image: RasterImage;
  readonly model: BackdropModel;
  readonly stats: MatteStats;
}

export interface PlateKeyOptions {
  readonly borderWidth?: number;
  readonly hueToleranceDeg?: number;
  readonly minimumAlpha?: number;
  readonly clearBorderPx?: number;
}

const DEFAULT_BORDER = 12;
const DEFAULT_HUE_TOLERANCE = 16;
const DEFAULT_MIN_ALPHA = 20;
const DEFAULT_CLEAR_BORDER = 3;

function medianOf(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 0
    ? Math.round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2)
    : (sorted[mid] ?? 0);
}

function borderChannels(plate: RasterImage, row: number, border: number): number[][] {
  const out: number[][] = [[], [], []];
  const push = (color: RgbaColor): void => {
    out[0]?.push(color.r);
    out[1]?.push(color.g);
    out[2]?.push(color.b);
  };
  for (let x = 0; x < border; x++) {
    push(readPixel(plate, x, row));
    push(readPixel(plate, plate.width - 1 - x, row));
  }
  return out;
}

export function estimateBackdropModel(
  plate: RasterImage,
  borderWidth: number = DEFAULT_BORDER,
): BackdropModel {
  const rowMedians: BackdropSample[] = [];
  const samples: BackdropSample[] = [];
  for (let y = 0; y < plate.height; y++) {
    const channels = borderChannels(plate, y, borderWidth);
    const sample: BackdropSample = {
      r: medianOf(channels[0] ?? []),
      g: medianOf(channels[1] ?? []),
      b: medianOf(channels[2] ?? []),
    };
    rowMedians.push(sample);
    if (y % 5 === 0) samples.push(sample);
  }
  const globalMedian: BackdropSample = {
    r: medianOf(samples.map((entry) => entry.r)),
    g: medianOf(samples.map((entry) => entry.g)),
    b: medianOf(samples.map((entry) => entry.b)),
  };
  const noise = medianOf(samples.map((entry) => Math.abs(entry.g - globalMedian.g)));
  return { width: plate.width, height: plate.height, rowMedians, globalMedian, noise };
}

interface Hsv {
  readonly hueDeg: number;
  readonly saturation: number;
  readonly value: number;
}

export function toHsv(color: BackdropSample): Hsv {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const saturation = max <= 0 ? 0 : delta / max;
  if (delta < 1e-6) return { hueDeg: 0, saturation, value: max };
  let hue: number;
  if (max === r) hue = 60 * (((g - b) / delta) % 6);
  else if (max === g) hue = 60 * ((b - r) / delta + 2);
  else hue = 60 * ((r - g) / delta + 4);
  if (hue < 0) hue += 360;
  return { hueDeg: hue, saturation, value: max };
}

export function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

export function backdropRow(model: BackdropModel, y: number): BackdropSample {
  const clamped = Math.max(0, Math.min(model.height - 1, y));
  return model.rowMedians[clamped] ?? model.globalMedian;
}

/** 1 = fully backdrop, 0 = fully subject, smooth in between. */
export function backdropMembership(
  color: RgbaColor,
  reference: BackdropSample,
  hueToleranceDeg: number = DEFAULT_HUE_TOLERANCE,
): number {
  const referenceHsv = toHsv(reference);
  const hsv = toHsv(color);
  if (hsv.saturation < 0.08) return 0;
  const distance = hueDistance(hsv.hueDeg, referenceHsv.hueDeg);
  const hueScore = clamp01((hueToleranceDeg + 8 - distance) / 8);
  if (hueScore <= 0) return 0;
  const saturationScore = clamp01((hsv.saturation - 0.12) / 0.1);
  const valueScore = clamp01((hsv.value - referenceHsv.value * 0.25) / (referenceHsv.value * 0.2));
  return Math.min(hueScore, saturationScore, valueScore);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function unmixBackdrop(
  color: RgbaColor,
  backdrop: BackdropSample,
  keepAlpha: number,
): RgbaColor {
  if (keepAlpha >= 0.999) return { ...color, a: color.a };
  const a = Math.max(0.05, keepAlpha);
  const undo = (channel: number, back: number): number =>
    Math.max(0, Math.min(255, Math.round((channel - (1 - a) * back) / a)));
  return {
    r: undo(color.r, backdrop.r),
    g: undo(color.g, backdrop.g),
    b: undo(color.b, backdrop.b),
    a: Math.round(255 * keepAlpha),
  };
}

export function keyPhotoPlate(
  plate: RasterImage,
  options: PlateKeyOptions = {},
): KeyedPlate {
  const border = options.borderWidth ?? DEFAULT_BORDER;
  const hueTolerance = options.hueToleranceDeg ?? DEFAULT_HUE_TOLERANCE;
  const minAlpha = options.minimumAlpha ?? DEFAULT_MIN_ALPHA;
  const model = estimateBackdropModel(plate, border);
  const image = createRaster(plate.width, plate.height);
  const clear = options.clearBorderPx ?? DEFAULT_CLEAR_BORDER;
  let foreground = 0;
  let ghost = 0;
  for (let y = 0; y < plate.height; y++) {
    const reference = backdropRow(model, y);
    for (let x = 0; x < plate.width; x++) {
      if (x < clear || y < clear || x >= plate.width - clear || y >= plate.height - clear) continue;
      const src = readPixel(plate, x, y);
      const membership = backdropMembership(src, reference, hueTolerance);
      const alpha = Math.round(255 * (1 - membership));
      if (alpha < minAlpha) continue;
      const keyed = unmixBackdrop(src, reference, alpha / 255);
      const index = (y * plate.width + x) * 4;
      image.data[index] = keyed.r;
      image.data[index + 1] = keyed.g;
      image.data[index + 2] = keyed.b;
      image.data[index + 3] = alpha;
      foreground++;
      if (alpha < 240) ghost++;
    }
  }
  const cleaned = removeSmallOpaqueIslands(image, 32);
  image.data.set(cleaned.data);
  foreground = countOpaqueForeground(image);
  const stats: MatteStats = {
    foregroundPixels: foreground,
    ghostPixels: ghost,
    ghostRatio: foreground === 0 ? 0 : ghost / foreground,
    fringeRatio: measureFringeRatio(image),
    magentaLeakPixels: countMagentaFringe(image, model),
    ...measureInteriorLeak(image, model),
    shadowFraction: measureShadowFraction(plate, model),
    backdropNoise: model.noise,
  };
  return { image, model, stats };
}

function measureFringeRatio(image: RasterImage): number {
  let foreground = 0;
  let fringe = 0;
  for (let i = 3; i < image.data.length; i += 4) {
    const alpha = image.data[i] ?? 0;
    if (alpha < 16) continue;
    foreground++;
    if (alpha < 240 && !isMagentaHue(image, i - 3)) fringe++;
  }
  return foreground === 0 ? 0 : fringe / foreground;
}

function isMagentaHue(image: RasterImage, index: number): boolean {
  const hsv = toHsv({
    r: image.data[index] ?? 0,
    g: image.data[index + 1] ?? 0,
    b: image.data[index + 2] ?? 0,
  });
  return hsv.saturation > 0.2 && hueDistance(hsv.hueDeg, 322) < 25;
}

function countMagentaFringe(image: RasterImage, model: BackdropModel): number {
  let leak = 0;
  for (let y = 0; y < image.height; y++) {
    const reference = backdropRow(model, y);
    const referenceHsv = toHsv(reference);
    for (let x = 0; x < image.width; x++) {
      const index = (y * image.width + x) * 4;
      const alpha = image.data[index + 3] ?? 0;
      if (alpha < 40) continue;
      const hsv = toHsv({
        r: image.data[index] ?? 0,
        g: image.data[index + 1] ?? 0,
        b: image.data[index + 2] ?? 0,
      });
      if (hsv.saturation > 0.25 && hueDistance(hsv.hueDeg, referenceHsv.hueDeg) < 20) leak++;
    }
  }
  return leak;
}

/**
 * Cast shadow is backdrop that has been darkened. It keys out cleanly by hue,
 * but it must never end up inside a shoe crop, so measure it just above the
 * bottom of the plate.
 */
function measureShadowFraction(plate: RasterImage, model: BackdropModel): number {
  const bandHeight = Math.max(8, Math.round(plate.height * 0.08));
  const start = Math.max(0, plate.height - bandHeight);
  let sampled = 0;
  let shadowed = 0;
  for (let y = start; y < plate.height; y++) {
    const reference = backdropRow(model, y);
    const referenceHsv = toHsv(reference);
    const referenceLuma = 0.299 * reference.r + 0.587 * reference.g + 0.114 * reference.b;
    for (let x = 0; x < plate.width; x += 2) {
      const color = readPixel(plate, x, y);
      const hsv = toHsv(color);
      if (hsv.saturation < 0.2 || hueDistance(hsv.hueDeg, referenceHsv.hueDeg) > 20) continue;
      sampled++;
      const luma = 0.299 * color.r + 0.587 * color.g + 0.114 * color.b;
      if (luma < referenceLuma * 0.94) shadowed++;
    }
  }
  return sampled === 0 ? 0 : shadowed / sampled;
}

/**
 * Boundary antialiasing always contains a thin magenta ring; that is expected.
 * Contamination is magenta that survives two pixels *inside* the silhouette,
 * which is what would show up as a pink halo around a harvested limb.
 */
function measureInteriorLeak(
  image: RasterImage,
  model: BackdropModel,
): { readonly interiorLeakPixels: number; readonly interiorLeakRatio: number } {
  let opaque = 0;
  let leak = 0;
  for (let y = 2; y < image.height - 2; y++) {
    const referenceHsv = toHsv(backdropRow(model, y));
    for (let x = 2; x < image.width - 2; x++) {
      const index = (y * image.width + x) * 4;
      if ((image.data[index + 3] ?? 0) <= 200) continue;
      opaque++;
      if (!isInterior(image, x, y)) continue;
      const hsv = toHsv({
        r: image.data[index] ?? 0,
        g: image.data[index + 1] ?? 0,
        b: image.data[index + 2] ?? 0,
      });
      if (hsv.saturation > 0.25 && hueDistance(hsv.hueDeg, referenceHsv.hueDeg) < 20) leak++;
    }
  }
  return {
    interiorLeakPixels: leak,
    interiorLeakRatio: opaque === 0 ? 0 : leak / opaque,
  };
}

function isInterior(image: RasterImage, x: number, y: number): boolean {
  for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= image.width || ny >= image.height) return false;
    if ((image.data[(ny * image.width + nx) * 4 + 3] ?? 0) <= 200) return false;
  }
  return true;
}

export function countOpaqueForeground(image: RasterImage): number {
  let count = 0;
  for (let i = 3; i < image.data.length; i += 4) {
    if ((image.data[i] ?? 0) > 96) count++;
  }
  return count;
}
