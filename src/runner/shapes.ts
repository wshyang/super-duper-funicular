import type { Point2D, RasterImage, RgbaColor } from '../shared/types.js';
import { createRaster, readPixel, writePixel } from '../pipeline/raster.js';

export interface TaperedCapsuleSpec {
  readonly start: Point2D;
  readonly end: Point2D;
  readonly radiusStart: number;
  readonly radiusEnd: number;
  readonly fillColor: RgbaColor;
  readonly outlineColor: RgbaColor;
  readonly outlineWidth: number;
}

export interface DiscSpec {
  readonly center: Point2D;
  readonly radius: number;
  readonly fillColor: RgbaColor;
  readonly outlineColor: RgbaColor;
  readonly outlineWidth: number;
}

export function drawTaperedCapsule(raster: RasterImage, spec: TaperedCapsuleSpec): void {
  const maxR = Math.max(spec.radiusStart, spec.radiusEnd) + spec.outlineWidth + 2;
  const minX = Math.max(0, Math.floor(Math.min(spec.start.x, spec.end.x) - maxR));
  const maxX = Math.min(raster.width - 1, Math.ceil(Math.max(spec.start.x, spec.end.x) + maxR));
  const minY = Math.max(0, Math.floor(Math.min(spec.start.y, spec.end.y) - maxR));
  const maxY = Math.min(raster.height - 1, Math.ceil(Math.max(spec.start.y, spec.end.y) + maxR));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      shadeCapsulePixel(raster, spec, { x, y });
    }
  }
}

function shadeCapsulePixel(
  raster: RasterImage,
  spec: TaperedCapsuleSpec,
  point: Point2D,
): void {
  const proj = projectOntoSegment(point, spec.start, spec.end);
  const localRadius = spec.radiusStart + (spec.radiusEnd - spec.radiusStart) * proj.t;
  const outerRadius = localRadius + spec.outlineWidth;
  if (proj.distance > outerRadius) {
    return;
  }
  if (proj.distance >= localRadius) {
    writePixel(raster, point, spec.outlineColor);
    return;
  }
  writePixel(raster, point, spec.fillColor);
}

interface SegmentProjection {
  readonly t: number;
  readonly distance: number;
}

export function projectOntoSegment(
  point: Point2D,
  start: Point2D,
  end: Point2D,
): SegmentProjection {
  const vx = end.x - start.x;
  const vy = end.y - start.y;
  const lenSq = vx * vx + vy * vy;
  if (lenSq < 1e-6) {
    return { t: 0, distance: Math.hypot(point.x - start.x, point.y - start.y) };
  }
  const rawT = ((point.x - start.x) * vx + (point.y - start.y) * vy) / lenSq;
  const t = Math.max(0, Math.min(1, rawT));
  const projX = start.x + t * vx;
  const projY = start.y + t * vy;
  return { t, distance: Math.hypot(point.x - projX, point.y - projY) };
}

export function drawOutlinedDisc(raster: RasterImage, spec: DiscSpec): void {
  const outer = spec.radius + spec.outlineWidth;
  const minX = Math.max(0, Math.floor(spec.center.x - outer - 1));
  const maxX = Math.min(raster.width - 1, Math.ceil(spec.center.x + outer + 1));
  const minY = Math.max(0, Math.floor(spec.center.y - outer - 1));
  const maxY = Math.min(raster.height - 1, Math.ceil(spec.center.y + outer + 1));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dist = Math.hypot(x - spec.center.x, y - spec.center.y);
      if (dist <= spec.radius) {
        writePixel(raster, { x, y }, spec.fillColor);
      } else if (dist <= outer) {
        writePixel(raster, { x, y }, spec.outlineColor);
      }
    }
  }
}

export function quantizePixelScale(source: RasterImage, scale: 1 | 2 | 3): RasterImage {
  if (scale === 1) {
    return source;
  }
  const out = createRaster(source.width, source.height);
  for (let y = 0; y < source.height; y += scale) {
    for (let x = 0; x < source.width; x += scale) {
      const sample = readPixel(source, x, y);
      fillBlock(out, { x, y, scale }, sample);
    }
  }
  return out;
}

interface BlockCoords {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

function fillBlock(raster: RasterImage, block: BlockCoords, color: RgbaColor): void {
  for (let dy = 0; dy < block.scale; dy++) {
    for (let dx = 0; dx < block.scale; dx++) {
      writePixel(raster, { x: block.x + dx, y: block.y + dy }, color);
    }
  }
}
