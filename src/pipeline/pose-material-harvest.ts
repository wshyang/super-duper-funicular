import type { BodyPartId, Point2D, RasterImage } from '../shared/types.js';
import { createRaster, readPixel } from './raster.js';
import { sampleBilinearRgba } from '../runner/photoreal-warp.js';

/**
 * Rectifies a measured limb tube into the cutout convention the rig already
 * expects: 160x160 RGBA, bone vertical at x = 80 from y = 36 to y = 124, and
 * +-80 px of lateral source extent. Following the existing convention is not
 * cosmetic: `warpPhotorealSegmentToQuad` assumes exactly this mapping, so any
 * other convention renders as a distorted tube.
 */
export interface RectifySpec {
  readonly sourceStart: Point2D;
  readonly sourceEnd: Point2D;
  readonly lateralHalfExtentPx: number;
  readonly capRadiusPx: number;
  /**
   * Cap radius at the proximal end. Joints are covered by the neighbouring
   * segment, and the renderer magnifies anything beyond a bone end by
   * 80/dstHalfWidthPx, so a large proximal cap becomes a skin-coloured blob over
   * the shorts. Harvested material therefore uses a tight proximal cap.
   */
  readonly capRadiusTopPx?: number;
  /**
   * Fraction of the proximal end that is discarded. In a strict lateral profile
   * the top quarter of a thigh and the top third of an upper arm sit inside the
   * torso/shorts silhouette, so they cannot be harvested without dragging fabric
   * into the cutout. The rig re-attaches that span with its rounded stump, which
   * is why the trim is geometric rather than a prompt instruction.
   */
  readonly proximalTrimFraction: number;
}

export const MATERIAL_SIZE = 160;
const DST_TOP = 36;
const DST_BOTTOM = 124;
const DST_HALF_LATERAL = 80;

/**
 * Lateral extent that keeps the cutout isotropic for a given bone length in
 * source pixels. One value drives both the rectifier and its verification, so a
 * mismatch cannot silently reintroduce anisotropic stretching.
 */
export function isotropicLateralExtent(sourceBoneLengthPx: number): number {
  return (DST_HALF_LATERAL * Math.max(1, sourceBoneLengthPx)) / (DST_BOTTOM - DST_TOP);
}

export function rectifyTube(source: RasterImage, spec: RectifySpec): RasterImage {
  const out = createRaster(MATERIAL_SIZE, MATERIAL_SIZE);
  const sdx = spec.sourceEnd.x - spec.sourceStart.x;
  const sdy = spec.sourceEnd.y - spec.sourceStart.y;
  const srcLen = Math.max(1, Math.hypot(sdx, sdy));
  const sux = sdx / srcLen;
  const suy = sdy / srcLen;
  const dstLen = DST_BOTTOM - DST_TOP;
  // Isotropic mapping: one cutout pixel must represent the same source distance
  // along the bone and across it. The renderer preserves this ratio, so any
  // anisotropy here comes back as a limb that is too wide or too thin — the
  // "skin blob" failure seen in the first demo. `lateralHalfExtentPx` is kept
  // only as an upper clamp for very short bones.
  const lateralHalfExtent = isotropicLateralExtent(srcLen);
  const lateralScale = lateralHalfExtent / DST_HALF_LATERAL;
  const trim = Math.max(0, Math.min(0.6, spec.proximalTrimFraction));
  for (let y = 0; y < MATERIAL_SIZE; y++) {
    for (let x = 0; x < MATERIAL_SIZE; x++) {
      const dstT = (y - DST_TOP) / dstLen;
      if (dstT < 0) continue;
      const along = (trim + dstT * (1 - trim)) * srcLen;
      // The renderer maps cutout x -> across as `uOff = (across/halfWidth)*80`
      // i.e. x = 80 - uOff, so the rectifier must use the same handedness or the
      // material comes back mirrored (shading and asymmetric contour flipped).
      const across = (DST_HALF_LATERAL - x) * lateralScale;
      const u = spec.sourceStart.x + sux * along - suy * across;
      const v = spec.sourceStart.y + suy * along + sux * across;
      const sampled = sampleBilinearRgba(source, u, v);
      if (sampled.a <= 10) continue;
      const coverage = capCoverage(x, y, spec.capRadiusTopPx ?? 4, spec.capRadiusPx);
      if (coverage <= 0) continue;
      const index = (y * MATERIAL_SIZE + x) * 4;
      out.data[index] = sampled.r;
      out.data[index + 1] = sampled.g;
      out.data[index + 2] = sampled.b;
      out.data[index + 3] = Math.round(sampled.a * coverage);
    }
  }
  return out;
}

/**
 * Elliptical caps in destination space. A square end is the single most visible
 * harvest artefact once the rig rotates the cutout, because the renderer extrudes
 * the cutout past the bone ends.
 */
function capCoverage(
  dstX: number,
  dstY: number,
  radiusTop: number,
  radiusBottom: number,
): number {
  const rTop = Math.max(2, Math.min(DST_BOTTOM - DST_TOP, radiusTop));
  const rBot = Math.max(2, Math.min(DST_BOTTOM - DST_TOP, radiusBottom));
  const r = dstY <= DST_TOP ? rTop : rBot;
  let value = 1;
  if (dstY < DST_TOP) {
    const dy = DST_TOP - dstY;
    if (dy > rTop) return 0;
    value = Math.min(value, Math.sqrt(Math.max(0, 1 - (dy / rTop) ** 2)));
  }
  if (dstY > DST_BOTTOM) {
    const dy = dstY - DST_BOTTOM;
    if (dy > rBot) return 0;
    value = Math.min(value, Math.sqrt(Math.max(0, 1 - (dy / rBot) ** 2)));
  }
  const dx = Math.abs(dstX - DST_HALF_LATERAL) - (DST_HALF_LATERAL - r);
  if (dx > 0) {
    if (dx > r) return 0;
    value = Math.min(value, Math.sqrt(Math.max(0, 1 - (dx / r) ** 2)));
  }
  return Math.max(0, Math.min(1, value));
}

/**
 * Keeps only the contiguous span that crosses the bone axis on each row, and
 * drops rows whose span is far wider than the limb's own median width. Without
 * this, a tube that grazes the other leg or the shorts merges both into one
 * "limb", which is exactly the amorphous blob that made the first demo unusable.
 */
export function trimCutoutToAxis(
  image: RasterImage,
  expectedHalfWidth: number,
): { readonly image: RasterImage; readonly droppedRows: number } {
  const out = createRaster(image.width, image.height);
  out.data.set(image.data);
  const axisX = Math.round(DST_HALF_LATERAL);
  const widths: number[] = [];
  for (let y = DST_TOP; y <= DST_BOTTOM; y++) {
    const span = contiguousSpan(image, y, axisX);
    if (span) widths.push(span.width);
  }
  const median = widths.length === 0 ? 0 : [...widths].sort((a, b) => a - b)[Math.floor(widths.length / 2)] ?? 0;
  const tolerance = Math.max(6, median * 0.45);
  let droppedRows = 0;
  for (let y = 0; y < image.height; y++) {
    const span = contiguousSpan(image, y, axisX);
    const outsideLimits = span === null || Math.abs(span.width - median) > tolerance;
    if (outsideLimits && y >= DST_TOP && y <= DST_BOTTOM) {
      droppedRows++;
      clearRow(out, y);
      continue;
    }
    if (!span) {
      clearRow(out, y);
      continue;
    }
    for (let x = 0; x < image.width; x++) {
      if (x < span.start || x > span.end) {
        const index = (y * image.width + x) * 4 + 3;
        out.data[index] = 0;
      }
    }
  }
  void expectedHalfWidth;
  return { image: out, droppedRows };
}

function clearRow(image: RasterImage, y: number): void {
  for (let x = 0; x < image.width; x++) {
    const index = (y * image.width + x) * 4 + 3;
    image.data[index] = 0;
  }
}

function contiguousSpan(
  image: RasterImage,
  y: number,
  axisX: number,
): { readonly start: number; readonly end: number; readonly width: number } | null {
  const opaque = (x: number): boolean => x >= 0 && x < image.width && (image.data[(y * image.width + x) * 4 + 3] ?? 0) > 24;
  let seed = -1;
  for (let d = 0; d <= Math.floor(image.width / 2); d++) {
    if (opaque(axisX + d)) { seed = axisX + d; break; }
    if (opaque(axisX - d)) { seed = axisX - d; break; }
  }
  if (seed < 0) return null;
  let start = seed;
  let end = seed;
  while (opaque(start - 1)) start--;
  while (opaque(end + 1)) end++;
  return { start, end, width: end - start + 1 };
}

export interface TrimBox {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/**
 * Extracts a static part (head, neck, torso, pelvis) by bounding box. Static
 * parts are not limb tubes, so they are rectified from their own box rather than
 * from a bone, and never rotated at render time beyond their rig rotation.
 */
export function rectifyBox(source: RasterImage, box: TrimBox, capRadiusPx: number): RasterImage {
  const out = createRaster(MATERIAL_SIZE, MATERIAL_SIZE);
  const width = Math.max(1, box.maxX - box.minX);
  const height = Math.max(1, box.maxY - box.minY);
  const scale = Math.min((MATERIAL_SIZE - 8) / width, (MATERIAL_SIZE - 8) / height);
  const offsetX = (MATERIAL_SIZE - width * scale) / 2;
  const offsetY = (MATERIAL_SIZE - height * scale) / 2;
  for (let y = 0; y < MATERIAL_SIZE; y++) {
    for (let x = 0; x < MATERIAL_SIZE; x++) {
      const u = box.minX + (x - offsetX) / scale;
      const v = box.minY + (y - offsetY) / scale;
      if (u < box.minX || u > box.maxX || v < box.minY || v > box.maxY) continue;
      const sampled = sampleBilinearRgba(source, u, v);
      if (sampled.a <= 10) continue;
      const index = (y * MATERIAL_SIZE + x) * 4;
      out.data[index] = sampled.r;
      out.data[index + 1] = sampled.g;
      out.data[index + 2] = sampled.b;
      out.data[index + 3] = sampled.a;
    }
  }
  void capRadiusPx;
  return out;
}

export function alphaBounds(image: RasterImage): TrimBox | null {
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if ((readPixel(image, x, y).a ?? 0) <= 24) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return maxX < 0 ? null : { minX, minY, maxX, maxY };
}

/**
 * Where a trimmed tube actually begins. Exported so verification measures against
 * the same span the cutout was taken from rather than the untrimmed bone.
 */
export function trimmedTubeStart(start: Point2D, end: Point2D, trimFraction: number): Point2D {
  const trim = Math.max(0, Math.min(0.6, trimFraction));
  return { x: start.x + (end.x - start.x) * trim, y: start.y + (end.y - start.y) * trim };
}

export function angleBucket(angleDeg: number): number {
  const normalized = (((angleDeg + 180) % 360) + 360) % 360 - 180;
  return Math.round(normalized / 15) * 15;
}

export function angleOf(start: Point2D, end: Point2D): number {
  return (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI;
}

export const LIMB_PARTS: readonly BodyPartId[] = [
  'nearUpperArm', 'nearForearm', 'farUpperArm', 'farForearm',
  'nearThigh', 'nearShin', 'farThigh', 'farShin',
];

export const STATIC_PARTS: readonly BodyPartId[] = ['head', 'neck', 'torso', 'pelvis'];
