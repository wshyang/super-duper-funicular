import type { BoundingBox, Point2D, RasterImage } from '../shared/types.js';
import { cloneRaster, readPixel, writePixel } from './raster.js';

export interface ForegroundRegionStats {
  readonly bounds: BoundingBox;
  readonly pixelCount: number;
  readonly centroid: Point2D;
  readonly anchorPoint: Point2D;
  readonly frontFootX: number;
  readonly rearFootX: number;
}

export function removeSmallOpaqueIslands(raster: RasterImage, minAreaPx: number): RasterImage {
  const out = cloneRaster(raster);
  const visited = new Uint8Array(out.width * out.height);
  for (let i = 0; i < visited.length; i++) {
    if (visited[i] === 0 && (out.data[i * 4 + 3] ?? 0) > 0) {
      pruneComponentIfSmall(out, visited, { startIdx: i, minAreaPx });
    }
  }
  return out;
}

export function listOpaqueComponentSizes(
  raster: RasterImage,
  minAreaPx: number,
): number[] {
  const visited = new Uint8Array(raster.width * raster.height);
  const sizes: number[] = [];
  for (let i = 0; i < visited.length; i++) {
    if (visited[i] === 0 && (raster.data[i * 4 + 3] ?? 0) >= 32) {
      const comp = collectComponentIndices(raster, visited, i);
      if (comp.length >= minAreaPx) {
        sizes.push(comp.length);
      }
    }
  }
  return sizes.sort((a, b) => b - a);
}

interface PruneOptions {
  readonly startIdx: number;
  readonly minAreaPx: number;
}

function pruneComponentIfSmall(
  raster: RasterImage,
  visited: Uint8Array,
  options: PruneOptions,
): void {
  const component = collectComponentIndices(raster, visited, options.startIdx);
  if (component.length >= options.minAreaPx) {
    return;
  }
  for (const idx of component) {
    const x = idx % raster.width;
    const y = Math.floor(idx / raster.width);
    writePixel(raster, { x, y }, { r: 0, g: 0, b: 0, a: 0 });
  }
}

function collectComponentIndices(
  raster: RasterImage,
  visited: Uint8Array,
  startIdx: number,
): number[] {
  const members: number[] = [];
  const queue: number[] = [startIdx];
  visited[startIdx] = 1;
  let head = 0;
  while (head < queue.length) {
    const current = queue[head] ?? 0;
    head++;
    members.push(current);
    pushOpaqueNeighbors(raster, visited, { current, queue });
  }
  return members;
}

interface QueueContext {
  readonly current: number;
  readonly queue: number[];
}

function pushOpaqueNeighbors(
  raster: RasterImage,
  visited: Uint8Array,
  ctx: QueueContext,
): void {
  const x = ctx.current % raster.width;
  const y = Math.floor(ctx.current / raster.width);
  tryPushNeighbor(raster, visited, { x: x - 1, y, queue: ctx.queue });
  tryPushNeighbor(raster, visited, { x: x + 1, y, queue: ctx.queue });
  tryPushNeighbor(raster, visited, { x, y: y - 1, queue: ctx.queue });
  tryPushNeighbor(raster, visited, { x, y: y + 1, queue: ctx.queue });
}

interface NeighborCoord {
  readonly x: number;
  readonly y: number;
  readonly queue: number[];
}

function tryPushNeighbor(
  raster: RasterImage,
  visited: Uint8Array,
  coord: NeighborCoord,
): void {
  if (coord.x < 0 || coord.x >= raster.width || coord.y < 0 || coord.y >= raster.height) {
    return;
  }
  const idx = coord.y * raster.width + coord.x;
  if (visited[idx] === 1 || (raster.data[idx * 4 + 3] ?? 0) === 0) {
    return;
  }
  visited[idx] = 1;
  coord.queue.push(idx);
}

export function measureForegroundRegion(raster: RasterImage): ForegroundRegionStats {
  const accum = scanOpaquePixels(raster);
  if (accum.count === 0) {
    return createEmptyRegionStats(raster);
  }
  const bounds: BoundingBox = {
    x: accum.minX,
    y: accum.minY,
    width: accum.maxX - accum.minX + 1,
    height: accum.maxY - accum.minY + 1,
  };
  const centroid: Point2D = {
    x: accum.sumX / accum.count,
    y: accum.sumY / accum.count,
  };
  const footSpan = measureLowerLimbSpan(raster, bounds);
  return {
    bounds,
    pixelCount: accum.count,
    centroid,
    anchorPoint: { x: Math.round(centroid.x), y: accum.maxY },
    frontFootX: footSpan.maxX,
    rearFootX: footSpan.minX,
  };
}

interface PixelScanAccumulator {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  sumX: number;
  sumY: number;
  count: number;
}

function scanOpaquePixels(raster: RasterImage): PixelScanAccumulator {
  const acc: PixelScanAccumulator = {
    minX: raster.width,
    minY: raster.height,
    maxX: 0,
    maxY: 0,
    sumX: 0,
    sumY: 0,
    count: 0,
  };
  for (let y = 0; y < raster.height; y++) {
    for (let x = 0; x < raster.width; x++) {
      if (readPixel(raster, x, y).a >= 64) {
        updateAccumulator(acc, x, y);
      }
    }
  }
  return acc;
}

function updateAccumulator(acc: PixelScanAccumulator, x: number, y: number): void {
  if (x < acc.minX) acc.minX = x;
  if (y < acc.minY) acc.minY = y;
  if (x > acc.maxX) acc.maxX = x;
  if (y > acc.maxY) acc.maxY = y;
  acc.sumX += x;
  acc.sumY += y;
  acc.count++;
}

function createEmptyRegionStats(raster: RasterImage): ForegroundRegionStats {
  return {
    bounds: { x: 0, y: 0, width: raster.width, height: raster.height },
    pixelCount: 0,
    centroid: { x: raster.width / 2, y: raster.height / 2 },
    anchorPoint: { x: Math.round(raster.width / 2), y: raster.height - 1 },
    frontFootX: raster.width / 2,
    rearFootX: raster.width / 2,
  };
}

function measureLowerLimbSpan(
  raster: RasterImage,
  bounds: BoundingBox,
): { minX: number; maxX: number } {
  const lowerStartY = bounds.y + Math.floor(bounds.height * 0.62);
  const lowerEndY = bounds.y + bounds.height - 1;
  let minX = bounds.x + bounds.width;
  let maxX = bounds.x;
  for (let y = lowerStartY; y <= lowerEndY; y++) {
    for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
      if (readPixel(raster, x, y).a >= 128) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
  }
  return { minX, maxX };
}
