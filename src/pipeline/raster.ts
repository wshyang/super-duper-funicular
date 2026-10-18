import type { BoundingBox, Point2D, RasterImage, RgbaColor } from '../shared/types.js';

export function createRaster(width: number, height: number): RasterImage {
  return {
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
  };
}

export function cloneRaster(source: RasterImage): RasterImage {
  return {
    width: source.width,
    height: source.height,
    data: new Uint8ClampedArray(source.data),
  };
}

export function isInsideRaster(raster: RasterImage, point: Point2D): boolean {
  const x = Math.trunc(point.x);
  const y = Math.trunc(point.y);
  return x >= 0 && x < raster.width && y >= 0 && y < raster.height;
}

export function readPixel(raster: RasterImage, x: number, y: number): RgbaColor {
  if (!isInsideRaster(raster, { x, y })) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  const offset = (Math.trunc(y) * raster.width + Math.trunc(x)) * 4;
  return {
    r: raster.data[offset] ?? 0,
    g: raster.data[offset + 1] ?? 0,
    b: raster.data[offset + 2] ?? 0,
    a: raster.data[offset + 3] ?? 0,
  };
}

export function writePixel(raster: RasterImage, point: Point2D, color: RgbaColor): void {
  if (!isInsideRaster(raster, point)) {
    return;
  }
  const offset = (Math.trunc(point.y) * raster.width + Math.trunc(point.x)) * 4;
  raster.data[offset] = color.r;
  raster.data[offset + 1] = color.g;
  raster.data[offset + 2] = color.b;
  raster.data[offset + 3] = color.a;
}

export function blendPixel(raster: RasterImage, point: Point2D, color: RgbaColor): void {
  if (!isInsideRaster(raster, point) || color.a <= 0) {
    return;
  }
  if (color.a >= 255) {
    writePixel(raster, point, color);
    return;
  }
  const dst = readPixel(raster, point.x, point.y);
  const srcA = color.a / 255;
  const dstA = (dst.a / 255) * (1 - srcA);
  const outA = srcA + dstA;
  if (outA <= 0) {
    return;
  }
  writePixel(raster, point, {
    r: Math.round((color.r * srcA + dst.r * dstA) / outA),
    g: Math.round((color.g * srcA + dst.g * dstA) / outA),
    b: Math.round((color.b * srcA + dst.b * dstA) / outA),
    a: Math.round(outA * 255),
  });
}

export function cropRaster(source: RasterImage, bounds: BoundingBox): RasterImage {
  const out = createRaster(bounds.width, bounds.height);
  for (let row = 0; row < bounds.height; row++) {
    copyRowSegment(source, out, { bounds, row });
  }
  return out;
}

interface CopyRowParams {
  readonly bounds: BoundingBox;
  readonly row: number;
}

function copyRowSegment(source: RasterImage, out: RasterImage, params: CopyRowParams): void {
  const srcY = params.bounds.y + params.row;
  for (let col = 0; col < params.bounds.width; col++) {
    const px = readPixel(source, params.bounds.x + col, srcY);
    writePixel(out, { x: col, y: params.row }, px);
  }
}

export function blitRaster(target: RasterImage, source: RasterImage, destination: Point2D): void {
  for (let y = 0; y < source.height; y++) {
    blitRow(target, source, { destination, y });
  }
}

interface BlitRowParams {
  readonly destination: Point2D;
  readonly y: number;
}

function blitRow(target: RasterImage, source: RasterImage, params: BlitRowParams): void {
  const dstY = Math.trunc(params.destination.y) + params.y;
  for (let x = 0; x < source.width; x++) {
    const px = readPixel(source, x, params.y);
    if (px.a > 0) {
      blendPixel(target, { x: Math.trunc(params.destination.x) + x, y: dstY }, px);
    }
  }
}

export function fillRaster(raster: RasterImage, color: RgbaColor): void {
  for (let i = 0; i < raster.data.length; i += 4) {
    raster.data[i] = color.r;
    raster.data[i + 1] = color.g;
    raster.data[i + 2] = color.b;
    raster.data[i + 3] = color.a;
  }
}
