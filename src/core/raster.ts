import type { Point2D, RasterImage, Rect, RgbaColor } from './types.js';

export const TRANSPARENT: RgbaColor = { r: 0, g: 0, b: 0, a: 0 };

export function createRaster(width: number, height: number, fill?: RgbaColor): RasterImage {
  const data = new Uint8ClampedArray(width * height * 4);
  if (fill) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = fill.r;
      data[i + 1] = fill.g;
      data[i + 2] = fill.b;
      data[i + 3] = fill.a;
    }
  }
  return { width, height, data };
}

export function pixelIndex(image: RasterImage, x: number, y: number): number {
  return (y * image.width + x) * 4;
}

export function readPixel(image: RasterImage, x: number, y: number): RgbaColor {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return TRANSPARENT;
  const i = pixelIndex(image, x, y);
  const data = image.data;
  return { r: data[i] ?? 0, g: data[i + 1] ?? 0, b: data[i + 2] ?? 0, a: data[i + 3] ?? 0 };
}

export function writePixel(image: RasterImage, x: number, y: number, color: RgbaColor): void {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const i = pixelIndex(image, x, y);
  const data = image.data;
  data[i] = color.r;
  data[i + 1] = color.g;
  data[i + 2] = color.b;
  data[i + 3] = color.a;
}

/** Source-over blend of `color` onto the pixel at (x, y). */
export function blendPixel(image: RasterImage, x: number, y: number, color: RgbaColor): void {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  if (color.a <= 0) return;
  const dst = readPixel(image, x, y);
  const sa = color.a / 255;
  const da = dst.a / 255;
  const outA = sa + da * (1 - sa);
  if (outA <= 0) return;
  const mix = (s: number, d: number): number => (s * sa + d * da * (1 - sa)) / outA;
  writePixel(image, x, y, {
    r: mix(color.r, dst.r),
    g: mix(color.g, dst.g),
    b: mix(color.b, dst.b),
    a: Math.round(outA * 255),
  });
}

export function sampleBilinear(image: RasterImage, x: number, y: number): RgbaColor {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const p00 = readPixel(image, x0, y0);
  const p10 = readPixel(image, x0 + 1, y0);
  const p01 = readPixel(image, x0, y0 + 1);
  const p11 = readPixel(image, x0 + 1, y0 + 1);
  const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
  return {
    r: lerp(lerp(p00.r, p10.r, fx), lerp(p01.r, p11.r, fx), fy),
    g: lerp(lerp(p00.g, p10.g, fx), lerp(p01.g, p11.g, fx), fy),
    b: lerp(lerp(p00.b, p10.b, fx), lerp(p01.b, p11.b, fx), fy),
    a: lerp(lerp(p00.a, p10.a, fx), lerp(p01.a, p11.a, fx), fy),
  };
}

export function cloneRaster(image: RasterImage): RasterImage {
  return { width: image.width, height: image.height, data: new Uint8ClampedArray(image.data) };
}

export function computeOpaqueBounds(image: RasterImage, alphaThreshold = 16): Rect | null {
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if ((image.data[pixelIndex(image, x, y) + 3] ?? 0) <= alphaThreshold) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return maxX < 0 ? null : { minX, minY, maxX, maxY };
}

export function cropRaster(image: RasterImage, rect: Rect): RasterImage {
  const width = rect.maxX - rect.minX + 1;
  const height = rect.maxY - rect.minY + 1;
  const out = createRaster(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      writePixel(out, x, y, readPixel(image, rect.minX + x, rect.minY + y));
    }
  }
  return out;
}

export function blitRaster(dst: RasterImage, src: RasterImage, origin: Point2D): void {
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      blendPixel(dst, origin.x + x, origin.y + y, readPixel(src, x, y));
    }
  }
}
