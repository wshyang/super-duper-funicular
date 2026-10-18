import { createImage } from './image-io.js';
import type { CanvasSpec, RasterImage } from '../shared/types.js';

export function renderImageAt(
  cutout: RasterImage,
  scale: number,
  centerXPx: number,
  soleYInCanvas: number,
  soleYInSource: number,
  canvas: CanvasSpec,
): RasterImage {
  const output = createImage(canvas.widthPx, canvas.heightPx);
  const scaledWidth = Math.max(1, Math.round(cutout.width * scale));
  const scaledHeight = Math.max(1, Math.round(cutout.height * scale));
  const originX = Math.round(centerXPx - scaledWidth / 2);
  const originY = Math.round(soleYInCanvas - soleYInSource * scale);
  blitScaled(output, cutout, scale, originX, originY);
  return output;
}

function blitScaled(output: RasterImage, source: RasterImage, scale: number, originX: number, originY: number): void {
  for (let y = 0; y < output.height; y++) {
    for (let x = 0; x < output.width; x++) {
      const sourceX = (x + 0.5 - originX) / scale;
      const sourceY = (y + 0.5 - originY) / scale;
      blitPixel(output, source, x, y, sourceX, sourceY);
    }
  }
}

function blitPixel(output: RasterImage, source: RasterImage, x: number, y: number, sourceX: number, sourceY: number): void {
  const sampled = sampleBilinear(source, sourceX, sourceY);
  if (sampled.alpha <= 2) return;
  const offset = (y * output.width + x) * 4;
  output.data[offset] = clampByte(sampled.red);
  output.data[offset + 1] = clampByte(sampled.green);
  output.data[offset + 2] = clampByte(sampled.blue);
  output.data[offset + 3] = Math.max(output.data[offset + 3], clampByte(sampled.alpha));
}

interface SampledRgba {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  readonly alpha: number;
}

function sampleBilinear(image: RasterImage, x: number, y: number): SampledRgba {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  if (x0 < 0 || y0 < 0 || x0 + 1 >= image.width || y0 + 1 >= image.height) {
    return { red: 0, green: 0, blue: 0, alpha: 0 };
  }
  const fx = x - x0;
  const fy = y - y0;
  const corners = [0, 1, 2, 3].map((corner) => readPixel(image, x0 + (corner % 2), y0 + (corner >> 1)));
  const red = bilinearMix(corners.map((c) => c.red), fx, fy);
  const green = bilinearMix(corners.map((c) => c.green), fx, fy);
  const blue = bilinearMix(corners.map((c) => c.blue), fx, fy);
  const alpha = bilinearMix(corners.map((c) => c.alpha), fx, fy);
  return { red, green, blue, alpha };
}

function readPixel(image: RasterImage, x: number, y: number): SampledRgba {
  const offset = (y * image.width + x) * 4;
  return {
    red: image.data[offset],
    green: image.data[offset + 1],
    blue: image.data[offset + 2],
    alpha: image.data[offset + 3],
  };
}

function bilinearMix(values: number[], fx: number, fy: number): number {
  const top = values[0] * (1 - fx) + values[1] * fx;
  const bottom = values[2] * (1 - fx) + values[3] * fx;
  return top * (1 - fy) + bottom * fy;
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}
