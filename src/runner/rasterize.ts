import { type Raster, createRaster, pixelOffset } from "../pipeline/raster.ts";
import type { PaintOp } from "./paint-op.ts";
import type { Rgb } from "./palette.ts";
import { boundsOf, containsPoint, type Shape } from "./shapes.ts";
import { vec, type Vec2 } from "./vector.ts";

/** Maps body units (x forward, y up) to screen pixels (x right, y down). */
export interface ScreenFrame {
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly originX: number;
  readonly groundRow: number;
}

export function toScreen(point: Vec2, frame: ScreenFrame): Vec2 {
  return vec(frame.originX + point.x * frame.scale, frame.groundRow - point.y * frame.scale);
}

/** Scales a shape into screen space. Radii scale with the frame; polygons map point by point. */
export function shapeToScreen(shape: Shape, frame: ScreenFrame): Shape {
  if (shape.kind === "polygon") return { kind: "polygon", points: shape.points.map((point) => toScreen(point, frame)) };
  if (shape.kind === "circle") {
    return { kind: "circle", center: toScreen(shape.center, frame), radius: shape.radius * frame.scale };
  }
  return {
    kind: "capsule",
    from: toScreen(shape.from, frame),
    to: toScreen(shape.to, frame),
    radiusFrom: shape.radiusFrom * frame.scale,
    radiusTo: shape.radiusTo * frame.scale,
  };
}

function clampedRange(low: number, high: number, limit: number): { from: number; to: number } {
  return { from: Math.max(0, Math.floor(low)), to: Math.min(limit - 1, Math.ceil(high)) };
}

function paintShape(data: Uint8Array, raster: Raster, op: PaintOp, frame: ScreenFrame): void {
  const screenShape = shapeToScreen(op.shape, frame);
  const bounds = boundsOf(screenShape);
  const xs = clampedRange(bounds.minX, bounds.maxX, raster.width);
  const ys = clampedRange(bounds.minY, bounds.maxY, raster.height);
  for (let y = ys.from; y <= ys.to; y += 1) {
    for (let x = xs.from; x <= xs.to; x += 1) {
      if (!containsPoint(screenShape, vec(x + 0.5, y + 0.5))) continue;
      writeColor(data, pixelOffset(raster, x, y), op.color);
    }
  }
}

function writeColor(data: Uint8Array, offset: number, color: Rgb): void {
  data[offset] = color[0];
  data[offset + 1] = color[1];
  data[offset + 2] = color[2];
  data[offset + 3] = 255;
}

/** Paints ops in order onto a transparent canvas. Returns a new raster. */
export function paintLayer(frame: ScreenFrame, ops: readonly PaintOp[]): Raster {
  const raster = createRaster(frame.width, frame.height);
  const data = new Uint8Array(raster.data);
  for (const op of ops) paintShape(data, raster, op, frame);
  return { ...raster, data };
}

/** Adds a 1-pixel outline around every opaque region, in a new raster. */
export function addOutline(raster: Raster, color: Rgb): Raster {
  const data = new Uint8Array(raster.data);
  for (let y = 0; y < raster.height; y += 1) {
    for (let x = 0; x < raster.width; x += 1) {
      const offset = pixelOffset(raster, x, y);
      if (raster.data[offset + 3] !== 0) continue;
      if (hasOpaqueNeighbour(raster, x, y)) writeColor(data, offset, color);
    }
  }
  return { ...raster, data };
}

function hasOpaqueNeighbour(raster: Raster, x: number, y: number): boolean {
  const neighbours: readonly (readonly [number, number])[] = [
    [x + 1, y],
    [x - 1, y],
    [x, y + 1],
    [x, y - 1],
  ];
  return neighbours.some(([nx, ny]) => {
    if (nx < 0 || ny < 0 || nx >= raster.width || ny >= raster.height) return false;
    return raster.data[pixelOffset(raster, nx, ny) + 3] !== 0;
  });
}
