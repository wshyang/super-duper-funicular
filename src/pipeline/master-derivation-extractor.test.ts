import { describe, expect, it } from 'vitest';
import {
  assembleFallbackPartBank,
  deriveFarLimbPartBank,
  deriveMedialLimbFromLateral,
  listFarLimbPartIds,
  mirrorRasterHorizontally,
} from './master-derivation-extractor.js';
import { createRaster, readPixel } from './raster.js';
import type { BodyPartId, RasterImage } from '../shared/types.js';

function createGradientLimb(
  width = 160,
  height = 160,
): RasterImage {
  const raster = createRaster(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const opaque = x >= 40 && x <= 120 && y >= 10 && y <= 150;
      writeGradientPixel(raster, x, y, opaque);
    }
  }
  return raster;
}

function writeGradientPixel(
  raster: RasterImage,
  x: number,
  y: number,
  opaque: boolean,
): void {
  const color = opaque
    ? { r: 200, g: 120 + (x % 40), b: 90, a: 255 }
    : { r: 0, g: 0, b: 0, a: 0 };
  const data = raster.data;
  const idx = (y * raster.width + x) * 4;
  data[idx] = color.r;
  data[idx + 1] = color.g;
  data[idx + 2] = color.b;
  data[idx + 3] = color.a;
}

function meanLuminance(raster: RasterImage): number {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < raster.data.length; i += 4) {
    if ((raster.data[i + 3] ?? 0) >= 128) {
      sum += (raster.data[i] ?? 0) * 0.3 +
        (raster.data[i + 1] ?? 0) * 0.59 +
        (raster.data[i + 2] ?? 0) * 0.11;
      count += 1;
    }
  }
  return count === 0 ? 0 : sum / count;
}

describe('one-master deterministic far-limb derivation', () => {
  it('mirrors the near limb horizontally pixel-for-pixel', () => {
    const near = createGradientLimb();
    const mirrored = mirrorRasterHorizontally(near);
    for (const [x, y] of [
      [50, 80] as const,
      [90, 120] as const,
      [110, 30] as const,
    ]) {
      expect(readPixel(mirrored, mirrored.width - 1 - x, y)).toEqual(
        readPixel(near, x, y),
      );
    }
  });

  it('applies deterministic medial shading that darkens every opaque pixel', () => {
    const near = createGradientLimb();
    const far = deriveMedialLimbFromLateral(near);
    expect(meanLuminance(far)).toBeLessThan(
      meanLuminance(near),
    );
    const first = readPixel(far, 80, 80);
    expect(first.a).toBe(255);
    expect(first.b).toBeGreaterThanOrEqual(
      Math.round(90 * 0.82),
    );
  });

  it('derives exactly the six far-side limb parts from a near-side bank', () => {
    const nearBank: Partial<Record<BodyPartId, RasterImage>> = {
      nearUpperArm: createGradientLimb(),
      nearForearm: createGradientLimb(),
      nearHand: createGradientLimb(),
      nearThigh: createGradientLimb(),
      nearShin: createGradientLimb(),
      nearFoot: createGradientLimb(),
    };
    const farBank = deriveFarLimbPartBank(nearBank);
    for (const farPartId of listFarLimbPartIds()) {
      expect(farBank[farPartId], `missing ${farPartId}`).toBeDefined();
    }
    expect(Object.keys(farBank)).toHaveLength(6);
  });

  it('assembles a complete 17-part fallback bank from 11 near/static parts', () => {
    const staticAndNear: Partial<Record<BodyPartId, RasterImage>> = {
      head: createGradientLimb(),
      hairAccessory: createGradientLimb(),
      neck: createGradientLimb(),
      torso: createGradientLimb(),
      pelvis: createGradientLimb(),
      nearUpperArm: createGradientLimb(),
      nearForearm: createGradientLimb(),
      nearHand: createGradientLimb(),
      nearThigh: createGradientLimb(),
      nearShin: createGradientLimb(),
      nearFoot: createGradientLimb(),
    };
    const bank = assembleFallbackPartBank(staticAndNear);
    expect(Object.keys(bank)).toHaveLength(17);
    expect(bank.farUpperArm).toBeDefined();
    expect(bank.farFoot).toBeDefined();
  });

  it('leaves near-only banks untouched when near limbs are absent', () => {
    const farBank = deriveFarLimbPartBank({});
    expect(Object.keys(farBank)).toHaveLength(0);
  });
});
