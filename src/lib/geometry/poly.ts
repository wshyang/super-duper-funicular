import { add, scale, subtract, vec, type Vec2 } from "./vec.ts";

/** A closed polygon in local or world space, counter-clockwise not guaranteed. */
export type Polygon = readonly Vec2[];

export interface Bounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

const TAU = Math.PI * 2;

export function circlePolygon(center: Vec2, radiusX: number, radiusY: number, segments = 24): Polygon {
  return Array.from({ length: segments }, (_, index) => {
    const angle = (index / segments) * TAU;
    return vec(center.x + Math.cos(angle) * radiusX, center.y + Math.sin(angle) * radiusY);
  });
}

export function ellipsePoint(center: Vec2, radiusX: number, radiusY: number, angle: number): Vec2 {
  return vec(center.x + Math.cos(angle) * radiusX, center.y + Math.sin(angle) * radiusY);
}

/**
 * A tapered capsule: a straight limb between two joints with rounded ends.
 * Used for every long bone so the body is generated, never painted by hand.
 */
export function capsule(from: Vec2, to: Vec2, radiusFrom: number, radiusTo: number, segments = 18): Polygon {
  const axis = subtract(to, from);
  const magnitude = Math.hypot(axis.x, axis.y);
  if (magnitude < 1e-9) return circlePolygon(from, radiusFrom, radiusFrom, segments);
  const direction = scale(axis, 1 / magnitude);
  const normal = vec(-direction.y, direction.x);
  const baseAngle = Math.atan2(direction.y, direction.x);
  const fromArc = arcPoints(from, radiusFrom, baseAngle + Math.PI / 2, baseAngle + Math.PI * 1.5, segments);
  const toArc = arcPoints(to, radiusTo, baseAngle - Math.PI / 2, baseAngle + Math.PI / 2, segments);
  return [...fromArc, ...toArc];
}

function arcPoints(center: Vec2, radius: number, start: number, end: number, segments: number): Vec2[] {
  return Array.from({ length: segments + 1 }, (_, index) => {
    const angle = start + ((end - start) * index) / segments;
    return vec(center.x + Math.cos(angle) * radius, center.y + Math.sin(angle) * radius);
  });
}

/** Catmull-Rom resampling of a closed control polygon, for organic outlines. */
export function smoothClosedPolygon(points: Polygon, samplesPerSegment = 6): Polygon {
  const output: Vec2[] = [];
  const count = points.length;
  for (let index = 0; index < count; index += 1) {
    const p0 = points[(index - 1 + count) % count] as Vec2;
    const p1 = points[index] as Vec2;
    const p2 = points[(index + 1) % count] as Vec2;
    const p3 = points[(index + 2) % count] as Vec2;
    for (let sample = 0; sample < samplesPerSegment; sample += 1) {
      output.push(catmullRom(p0, p1, p2, p3, sample / samplesPerSegment));
    }
  }
  return output;
}

function catmullRom(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const t2 = t * t;
  const t3 = t2 * t;
  const x =
    0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
  const y =
    0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
  return vec(x, y);
}

/** Corner-cut / chamfer, used for shoes and fists. */
export function chamferedBox(center: Vec2, halfWidth: number, halfHeight: number, chamfer: number): Polygon {
  const x = center.x;
  const y = center.y;
  const c = chamfer;
  return [
    vec(x - halfWidth + c, y - halfHeight),
    vec(x + halfWidth - c, y - halfHeight),
    vec(x + halfWidth, y - halfHeight + c),
    vec(x + halfWidth, y + halfHeight - c),
    vec(x + halfWidth - c, y + halfHeight),
    vec(x - halfWidth + c, y + halfHeight),
    vec(x - halfWidth, y + halfHeight - c),
    vec(x - halfWidth, y - halfHeight + c),
  ];
}

export function transformPolygon(points: Polygon, radians: number, offset: Vec2): Polygon {
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return points.map((point) =>
    vec(offset.x + point.x * cosine - point.y * sine, offset.y + point.x * sine + point.y * cosine),
  );
}

export function polygonBounds(points: Polygon): Bounds {
  if (points.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  return { minX, maxX, minY, maxY };
}

export function boundsUnion(a: Bounds, b: Bounds): Bounds {
  return {
    minX: Math.min(a.minX, b.minX),
    maxX: Math.max(a.maxX, b.maxX),
    minY: Math.min(a.minY, b.minY),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

export function polygonArea(points: Polygon): number {
  let total = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index] as Vec2;
    const next = points[(index + 1) % points.length] as Vec2;
    total += current.x * next.y - next.x * current.y;
  }
  return Math.abs(total) / 2;
}

/** The lowest point of a polygon, which is a foot's ground contact candidate. */
export function lowestPoint(points: Polygon): Vec2 {
  return points.reduce((lowest, point) => (point.y < lowest.y ? point : lowest), points[0] as Vec2);
}

export function pointsToSvgPath(points: Polygon): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points as readonly [Vec2, ...Vec2[]];
  return `M ${first.x.toFixed(3)} ${first.y.toFixed(3)} ` + rest.map((p) => `L ${p.x.toFixed(3)} ${p.y.toFixed(3)}`).join(" ") + " Z";
}

export function translatePolygon(points: Polygon, offset: Vec2): Polygon {
  return points.map((point) => add(point, offset));
}
