import type { RasterImage, SilhouetteBounds } from '../shared/types.js';

export function computeSilhouetteBounds(image: RasterImage, alphaThreshold = 16): SilhouetteBounds {
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  let pixelCount = 0;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (image.data[(y * image.width + x) * 4 + 3] <= alphaThreshold) continue;
      pixelCount++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, minY, maxX, maxY, pixelCount };
}

export function computeSoleBaselineY(image: RasterImage, bounds: SilhouetteBounds): number {
  const minimumColumnSupport = Math.max(2, Math.round((bounds.maxX - bounds.minX) * 0.02));
  for (let y = bounds.maxY; y >= bounds.minY; y--) {
    if (countOpaqueInRow(image, y, bounds) >= minimumColumnSupport) return y;
  }
  return bounds.maxY;
}

function countOpaqueInRow(image: RasterImage, y: number, bounds: SilhouetteBounds): number {
  let count = 0;
  for (let x = bounds.minX; x <= bounds.maxX; x++) {
    if (image.data[(y * image.width + x) * 4 + 3] > 16) count++;
  }
  return count;
}

export function computeSilhouetteIoU(a: RasterImage, b: RasterImage): number {
  if (a.width !== b.width || a.height !== b.height) return 0;
  let intersection = 0;
  let union = 0;
  for (let index = 3; index < a.data.length; index += 4) {
    const inA = a.data[index] > 16;
    const inB = b.data[index] > 16;
    if (inA && inB) intersection++;
    if (inA || inB) union++;
  }
  return union === 0 ? 0 : intersection / union;
}
