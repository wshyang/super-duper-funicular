import type { BodyPartId, RasterImage, RgbaColor } from '../shared/types.js';
import { createRaster, readPixel, writePixel } from './raster.js';

/**
 * One-Master Deterministic Derivation (revised pipeline Stage 1).
 *
 * Derives the six far-side limb jigs from their near-side counterparts by
 * horizontal mirroring plus deterministic medial shading, so a complete
 * 17-part bank can be assembled from a single verified master plate when a
 * phase-frame harvest fails its acceptance gates.
 *
 * Design goals served:
 *  - G1/G2: one stochastic generation per persona; far-limb identity,
 *    skin tone, lighting, and proportion are derived, never re-rolled.
 *  - G4: photography enters as appearance; the mirror+shade transform is
 *    deterministic and reproducible (no diffusion call in the loop).
 */

export interface FarLimbDerivationOptions {
  readonly shadeScale: number;
  readonly coolShift: number;
}

export const DEFAULT_FAR_LIMB_OPTIONS: FarLimbDerivationOptions = {
  shadeScale: 0.82,
  coolShift: 10,
};

const FAR_LIMB_PART_IDS: readonly BodyPartId[] = [
  'farUpperArm',
  'farForearm',
  'farHand',
  'farThigh',
  'farShin',
  'farFoot',
];

const NEAR_TO_FAR_PART_IDS: Readonly<
  Partial<Record<BodyPartId, BodyPartId>>
> = {
  nearUpperArm: 'farUpperArm',
  nearForearm: 'farForearm',
  nearHand: 'farHand',
  nearThigh: 'farThigh',
  nearShin: 'farShin',
  nearFoot: 'farFoot',
};

export function deriveMedialLimbFromLateral(
  nearLimb: RasterImage,
  options: FarLimbDerivationOptions = DEFAULT_FAR_LIMB_OPTIONS,
): RasterImage {
  const mirrored = mirrorRasterHorizontally(nearLimb);
  return applyMedialShading(mirrored, options);
}

export function mirrorRasterHorizontally(
  source: RasterImage,
): RasterImage {
  const mirrored = createRaster(source.width, source.height);
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      writePixel(
        mirrored,
        { x: source.width - 1 - x, y },
        readPixel(source, x, y),
      );
    }
  }
  return mirrored;
}

function applyMedialShading(
  source: RasterImage,
  options: FarLimbDerivationOptions,
): RasterImage {
  const shaded = createRaster(source.width, source.height);
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      writePixel(
        shaded,
        { x, y },
        shadePixelMedially(readPixel(source, x, y), options),
      );
    }
  }
  return shaded;
}

function shadePixelMedially(
  color: RgbaColor,
  options: FarLimbDerivationOptions,
): RgbaColor {
  if (color.a === 0) {
    return color;
  }
  return {
    a: color.a,
    r: clampByte(color.r * options.shadeScale),
    g: clampByte(color.g * options.shadeScale),
    b: clampByte(
      color.b * options.shadeScale + options.coolShift,
    ),
  };
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function deriveFarLimbPartBank(
  nearPartBank: Partial<Record<BodyPartId, RasterImage>>,
  options: FarLimbDerivationOptions = DEFAULT_FAR_LIMB_OPTIONS,
): Partial<Record<BodyPartId, RasterImage>> {
  const derived: Partial<Record<BodyPartId, RasterImage>> = {};
  for (const nearPartId of Object.keys(
    NEAR_TO_FAR_PART_IDS,
  ) as BodyPartId[]) {
    const nearLimb = nearPartBank[nearPartId];
    const farPartId = NEAR_TO_FAR_PART_IDS[nearPartId];
    if (!nearLimb || !farPartId) {
      continue;
    }
    derived[farPartId] = deriveMedialLimbFromLateral(
      nearLimb,
      options,
    );
  }
  return derived;
}

export function listFarLimbPartIds(): readonly BodyPartId[] {
  return FAR_LIMB_PART_IDS;
}

export function assembleFallbackPartBank(
  staticAndNearParts: Partial<Record<BodyPartId, RasterImage>>,
  options: FarLimbDerivationOptions = DEFAULT_FAR_LIMB_OPTIONS,
): Partial<Record<BodyPartId, RasterImage>> {
  const farLimbs = deriveFarLimbPartBank(
    staticAndNearParts,
    options,
  );
  return { ...staticAndNearParts, ...farLimbs };
}
