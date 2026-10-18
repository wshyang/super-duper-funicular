import { cloneImage, getPixel, setPixel, type RgbaImage } from './rgba-image.ts';

export interface CapSpec {
  readonly centerX: number;
  readonly proximalY: number;
  readonly distalY?: number;
  readonly capRadius: number;
  readonly blendPx?: number;
}

function hermite(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return clamped * clamped * (3 - 2 * clamped);
}

function capFactor(distance: number, radius: number, blend: number): number {
  if (distance <= radius - blend) return 1;
  if (distance >= radius + blend) return 0;
  return 1 - hermite((distance - (radius - blend)) / (2 * blend));
}

export function applyPivotCaps(image: RgbaImage, spec: CapSpec): RgbaImage {
  const out = cloneImage(image);
  const blend = Math.max(1, spec.blendPx ?? 2);
  for (let y = 0; y < out.height; y += 1) {
    for (let x = 0; x < out.width; x += 1) {
      const pixel = getPixel(out, x, y);
      if (pixel.a === 0) continue;
      let factor = 1;
      if (y < spec.proximalY) {
        factor = capFactor(Math.hypot(x - spec.centerX, y - spec.proximalY), spec.capRadius, blend);
      } else if (spec.distalY !== undefined && y > spec.distalY) {
        factor = capFactor(Math.hypot(x - spec.centerX, y - spec.distalY), spec.capRadius, blend);
      }
      if (factor < 1) setPixel(out, x, y, { ...pixel, a: Math.round(pixel.a * factor) });
    }
  }
  return out;
}
