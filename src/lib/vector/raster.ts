import type { Vec2 } from "../geometry/vec.ts";
import type { PathCommand, TracedShape } from "./trace.ts";

/**
 * Flattens and scan-converts a traced path. Used for quality control: the
 * vector silhouette is compared pixel-for-pixel against the matte it came
 * from, so "it looks smooth" can be backed by a measured overlap.
 */

const flattenCurve = (start: Vec2, c1: Vec2, c2: Vec2, to: Vec2, steps: number): Vec2[] => {
  const points: Vec2[] = [];
  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    const inverse = 1 - t;
    const a = inverse * inverse * inverse;
    const b = 3 * inverse * inverse * t;
    const c = 3 * inverse * t * t;
    const d = t * t * t;
    points.push({
      x: a * start.x + b * c1.x + c * c2.x + d * to.x,
      y: a * start.y + b * c1.y + c * c2.y + d * to.y,
    });
  }
  return points;
};

/** Samples one closed loop into a polygon, dense enough for a 4x supersample. */
export function flattenLoop(commands: readonly PathCommand[], start: Vec2): Vec2[] {
  const polygon: Vec2[] = [start];
  let pen = start;
  for (const command of commands) {
    if (command.kind === "line") {
      polygon.push(command.to);
    } else {
      const span = Math.hypot(command.c1.x - pen.x, command.c1.y - pen.y);
      const steps = Math.max(4, Math.min(24, Math.ceil(span / 1.5)));
      polygon.push(...flattenCurve(pen, command.c1, command.c2, command.to, steps));
    }
    pen = command.to;
  }
  return polygon;
}

/** Even-odd scanline coverage of every loop, in 0..1 per pixel. */
export function rasteriseShape(shape: TracedShape, width: number, height: number, supersample = 4): Float32Array {
  const polygons = shape.loops.map((commands, index) => flattenLoop(commands, shape.starts[index] as Vec2));
  const coverage = new Float32Array(width * height);
  const step = 1 / supersample;
  for (let y = 0; y < height; y += 1) {
    for (let subY = 0; subY < supersample; subY += 1) {
      const row = y + (subY + 0.5) * step;
      const crossings: number[] = [];
      for (const polygon of polygons) {
        for (let index = 0; index < polygon.length; index += 1) {
          const from = polygon[index] as Vec2;
          const to = polygon[(index + 1) % polygon.length] as Vec2;
          if (from.y > row === to.y > row) continue;
          crossings.push(from.x + ((row - from.y) / (to.y - from.y)) * (to.x - from.x));
        }
      }
      crossings.sort((a, b) => a - b);
      for (let pair = 0; pair + 1 < crossings.length; pair += 2) {
        const from = crossings[pair] as number;
        const to = crossings[pair + 1] as number;
        for (let x = 0; x < width; x += 1) {
          let covered = 0;
          for (let subX = 0; subX < supersample; subX += 1) {
            const column = x + (subX + 0.5) * step;
            if (column >= from && column <= to) covered += 1;
          }
          if (covered > 0) coverage[y * width + x] = (coverage[y * width + x] ?? 0) + covered * step * step;
        }
      }
    }
  }
  return coverage;
}

/** Intersection-over-union of a traced shape against a matte, at 0.5 coverage. */
export function silhouetteIou(
  shape: TracedShape,
  alpha: Float32Array,
  width: number,
  height: number,
  threshold = 0.5,
): number {
  const coverage = rasteriseShape(shape, width, height);
  let intersection = 0;
  let union = 0;
  for (let index = 0; index < alpha.length; index += 1) {
    const inside = (alpha[index] ?? 0) >= threshold;
    const traced = (coverage[index] ?? 0) >= 0.5;
    if (inside && traced) intersection += 1;
    if (inside || traced) union += 1;
  }
  return union === 0 ? 1 : intersection / union;
}
