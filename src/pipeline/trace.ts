import type { Vec2 } from '../shared/types.ts';

interface Segment {
  readonly a: Vec2;
  readonly b: Vec2;
}

const pointKey = (point: Vec2): string => `${point.x.toFixed(2)},${point.y.toFixed(2)}`;

const cornersOf = (mask: Uint8Array, width: number, x: number, y: number): number[] => [
  mask[y * width + x] ?? 0,
  mask[y * width + x + 1] ?? 0,
  mask[(y + 1) * width + x + 1] ?? 0,
  mask[(y + 1) * width + x] ?? 0,
];

/** Crossing points in clockwise edge order: top, right, bottom, left. */
const crossingsOf = (corners: readonly number[], x: number, y: number): Vec2[] => {
  const points: Vec2[] = [];
  if (corners[0] !== corners[1]) points.push({ x: x + 0.5, y });
  if (corners[1] !== corners[2]) points.push({ x: x + 1, y: y + 0.5 });
  if (corners[3] !== corners[2]) points.push({ x: x + 0.5, y: y + 1 });
  if (corners[0] !== corners[3]) points.push({ x, y: y + 0.5 });
  return points;
};

const cellsToSegments = (mask: Uint8Array, width: number, height: number): Segment[] => {
  const segments: Segment[] = [];
  for (let y = 0; y < height - 1; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      const points = crossingsOf(cornersOf(mask, width, x, y), x, y);
      if (points.length === 2) {
        segments.push({ a: points[0] as Vec2, b: points[1] as Vec2 });
      } else if (points.length === 4) {
        segments.push({ a: points[0] as Vec2, b: points[3] as Vec2 });
        segments.push({ a: points[1] as Vec2, b: points[2] as Vec2 });
      }
    }
  }
  return segments;
};

const stitch = (segments: readonly Segment[]): Vec2[][] => {
  const adjacency = new Map<string, number[]>();
  segments.forEach((segment, index) => {
    for (const key of [pointKey(segment.a), pointKey(segment.b)]) {
      const list = adjacency.get(key) ?? [];
      list.push(index);
      adjacency.set(key, list);
    }
  });
  const used = new Uint8Array(segments.length);
  const loops: Vec2[][] = [];
  for (let start = 0; start < segments.length; start += 1) {
    if (used[start] === 1) continue;
    const first = segments[start] as Segment;
    const loop: Vec2[] = [first.a];
    let tail = first.b;
    used[start] = 1;
    for (let guard = 0; guard <= segments.length + 1; guard += 1) {
      loop.push(tail);
      if (pointKey(tail) === pointKey(first.a)) break;
      const candidates = adjacency.get(pointKey(tail)) ?? [];
      const nextIndex = candidates.find((index) => used[index] === 0);
      if (nextIndex === undefined) break;
      const next = segments[nextIndex] as Segment;
      used[nextIndex] = 1;
      // Segments are undirected: continue from whichever endpoint we did not enter.
      tail = pointKey(next.a) === pointKey(tail) ? next.b : next.a;
    }
    if (loop.length >= 4) loops.push(loop);
  }
  return loops;
};

const squaredDistanceToSegment = (point: Vec2, a: Vec2, b: Vec2): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return (point.x - a.x) ** 2 + (point.y - a.y) ** 2;
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
  return (point.x - (a.x + t * dx)) ** 2 + (point.y - (a.y + t * dy)) ** 2;
};

/** Ramer–Douglas–Peucker on an open polyline; the caller closes the loop later. */
export const simplifyPath = (points: readonly Vec2[], tolerance: number): Vec2[] => {
  if (points.length <= 2) return [...points];
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  const threshold = tolerance * tolerance;
  while (stack.length > 0) {
    const [start, end] = stack.pop() as [number, number];
    let farthest = -1;
    let farthestDistance = 0;
    for (let index = start + 1; index < end; index += 1) {
      const distance = squaredDistanceToSegment(
        points[index] as Vec2,
        points[start] as Vec2,
        points[end] as Vec2,
      );
      if (distance > farthestDistance) {
        farthestDistance = distance;
        farthest = index;
      }
    }
    if (farthest >= 0 && farthestDistance > threshold) {
      keep[farthest] = 1;
      stack.push([start, farthest], [farthest, end]);
    }
  }
  return points.filter((_, index) => keep[index] === 1);
};

/** Signed area of a closed polygon, in square pixels. */
export const polygonArea = (points: readonly Vec2[]): number => {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index] as Vec2;
    const next = points[(index + 1) % points.length] as Vec2;
    area += current.x * next.y - next.x * current.y;
  }
  return Math.abs(area) / 2;
};

export interface ContourOptions {
  readonly tolerance?: number;
  readonly minArea?: number;
}

/**
 * Marching-squares contours for a binary mask. Loops are emitted for outer edges
 * and holes alike; consumers must fill them with the even-odd rule.
 */
export const contoursOfMask = (
  mask: Uint8Array,
  width: number,
  height: number,
  options: ContourOptions = {},
): Vec2[][] => {
  const tolerance = options.tolerance ?? 0.75;
  const minArea = options.minArea ?? 6;
  const paddedWidth = width + 2;
  const padded = new Uint8Array(paddedWidth * (height + 2));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      padded[(y + 1) * paddedWidth + x + 1] = mask[y * width + x] ?? 0;
    }
  }
  const loops = stitch(cellsToSegments(padded, paddedWidth, height + 2));
  const shifted = loops.map((loop) => loop.map((point) => ({ x: point.x - 1, y: point.y - 1 })));
  return shifted
    .map((loop) => simplifyPath(loop, tolerance))
    .filter((loop) => loop.length >= 3 && polygonArea(loop) >= minArea);
};
