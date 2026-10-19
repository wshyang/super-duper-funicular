import type { BodyPartId, RasterImage } from '../shared/types.js';
import { createRaster, readPixel } from './raster.js';
import { distanceToSegment, isSkinPixel } from './pose-silhouette.js';
import { warpPhotorealSegmentToQuad } from '../runner/photoreal-warp.js';
import type { Point2D } from '../shared/types.js';

/**
 * Round-trip verification for harvested material.
 *
 * A 160x160 cutout that looks plausible in isolation can still be in the wrong
 * orientation or scale. Re-warping it with the exact function the renderer uses,
 * then comparing against the source pixels it came from, is the only check that
 * proves the cutout is usable *by the rig* rather than merely good-looking.
 */
export interface VerifySpec {
  readonly cutout: RasterImage;
  readonly source: RasterImage;
  readonly tubeStart: Point2D;
  readonly tubeEnd: Point2D;
  readonly halfWidthPx: number;
}

export interface VerifyResult {
  readonly alphaIou: number;
  readonly meanColorDelta: number;
  readonly passed: boolean;
}

export function verifyRoundTrip(spec: VerifySpec): VerifyResult {
  const probe = createRaster(spec.source.width, spec.source.height);
  warpPhotorealSegmentToQuad(probe, spec.cutout, {
    dstStart: spec.tubeStart,
    dstEnd: spec.tubeEnd,
    dstHalfWidthPx: spec.halfWidthPx,
  });
  let predicted = 0;
  let actual = 0;
  let both = 0;
  let colourSum = 0;
  let colourCount = 0;
  const minX = Math.max(0, Math.floor(Math.min(spec.tubeStart.x, spec.tubeEnd.x) - spec.halfWidthPx * 2));
  const maxX = Math.min(spec.source.width - 1, Math.ceil(Math.max(spec.tubeStart.x, spec.tubeEnd.x) + spec.halfWidthPx * 2));
  const minY = Math.max(0, Math.floor(Math.min(spec.tubeStart.y, spec.tubeEnd.y) - spec.halfWidthPx * 2));
  const maxY = Math.min(spec.source.height - 1, Math.ceil(Math.max(spec.tubeStart.y, spec.tubeEnd.y) + spec.halfWidthPx * 2));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const axisFraction = fractionAlongTube({ x, y }, spec.tubeStart, spec.tubeEnd);
      // Terminal caps are synthesised by both the rectifier and the renderer with
      // different radii, so they are compared separately; the shaft is what
      // proves orientation, contour and shading survived the round trip.
      if (axisFraction < 0.22 || axisFraction > 0.78) continue;
      const isPredicted = (readPixel(probe, x, y).a ?? 0) > 96;
      // "Actual" means foreground *inside the tube footprint*: source pixels
      // elsewhere are not part of this material and must not dilute the score.
      const isActual =
        distanceToSegment({ x, y }, spec.tubeStart, spec.tubeEnd) <= spec.halfWidthPx &&
        (readPixel(spec.source, x, y).a ?? 0) > 96;
      if (isPredicted) predicted++;
      if (isActual) actual++;
      if (isPredicted && isActual) {
        both++;
        const a = readPixel(probe, x, y);
        const b = readPixel(spec.source, x, y);
        colourSum += (Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b)) / 3;
        colourCount++;
      }
    }
  }
  const union = predicted + actual - both;
  const alphaIou = union === 0 ? 0 : both / union;
  const meanColorDelta = colourCount === 0 ? 255 : colourSum / colourCount;
  return { alphaIou, meanColorDelta, passed: alphaIou >= 0.85 && meanColorDelta <= 24 };
}

function fractionAlongTube(point: Point2D, start: Point2D, end: Point2D): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq < 1e-6) return 0;
  return ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq;
}

export interface MaterialClass {
  readonly skin: number;
  readonly crimson: number;
  readonly white: number;
  readonly dark: number;
}

/**
 * Appearance class of a cutout. This is the gate that prevents harvesting the
 * singlet as an arm: in a strict profile the near upper arm is occluded by the
 * torso, so a coverage-based probe happily locks onto the jersey and reports a
 * confident angle. The garment is crimson/white while limbs are skin, so the
 * class check rejects that failure instead of shipping a red "arm".
 */
export function classifyMaterial(image: RasterImage): MaterialClass {
  let opaque = 0;
  let skin = 0;
  let crimson = 0;
  let white = 0;
  let dark = 0;
  for (let i = 0; i < image.data.length; i += 4) {
    if ((image.data[i + 3] ?? 0) < 200) continue;
    opaque++;
    if (isSkinPixel(image, i)) {
      skin++;
      continue;
    }
    const r = image.data[i] ?? 0;
    const g = image.data[i + 1] ?? 0;
    const b = image.data[i + 2] ?? 0;
    if (r > 170 && g < 110 && b < 110) crimson++;
    else if (r > 200 && g > 200 && b > 200) white++;
    else if (Math.max(r, g, b) < 110) dark++;
  }
  const denom = Math.max(1, opaque);
  return {
    skin: skin / denom,
    crimson: crimson / denom,
    white: white / denom,
    dark: dark / denom,
  };
}

export const SKIN_DOMINANT_MIN = 0.45;

/**
 * Skin fraction inside an arbitrary capsule of a source plate. The audit and the
 * harvester both use this so that "this region is clothing, not a limb" is one
 * shared fact rather than two independent opinions.
 */
export function skinFractionInCapsule(
  image: RasterImage,
  start: Point2D,
  end: Point2D,
  halfWidth: number,
): number {
  const axis = { x: end.x - start.x, y: end.y - start.y };
  const length = Math.hypot(axis.x, axis.y);
  if (length < 1) return 0;
  const normal = { x: -axis.y / length, y: axis.x / length };
  let opaque = 0;
  let skin = 0;
  for (let t = 0; t <= length; t += 2) {
    for (let o = -halfWidth; o <= halfWidth; o += 2) {
      const x = Math.round(start.x + (axis.x / length) * t + normal.x * o);
      const y = Math.round(start.y + (axis.y / length) * t + normal.y * o);
      if (x < 0 || y < 0 || x >= image.width || y >= image.height) continue;
      const index = (y * image.width + x) * 4;
      if ((image.data[index + 3] ?? 0) < 200) continue;
      opaque++;
      if (isSkinPixel(image, index)) skin++;
    }
  }
  return opaque === 0 ? 0 : skin / opaque;
}

export function partFamily(partId: BodyPartId): 'arm' | 'leg' | 'static' {
  if (partId.includes('Arm') || partId.includes('Hand')) return 'arm';
  if (partId.includes('Thigh') || partId.includes('Shin') || partId.includes('Foot')) return 'leg';
  return 'static';
}

export function proximalTrimFor(partId: BodyPartId): number {
  if (partId.includes('UpperArm') || partId.includes('Thigh')) return 0.28;
  return 0.08;
}
