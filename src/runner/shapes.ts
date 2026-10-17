import { clamp, subVec, vec, type Vec2 } from "./vector.ts";

export interface CapsuleShape {
  readonly kind: "capsule";
  readonly from: Vec2;
  readonly to: Vec2;
  readonly radiusFrom: number;
  readonly radiusTo: number;
}

export interface CircleShape {
  readonly kind: "circle";
  readonly center: Vec2;
  readonly radius: number;
}

export interface PolygonShape {
  readonly kind: "polygon";
  readonly points: readonly Vec2[];
}

export type Shape = CapsuleShape | CircleShape | PolygonShape;

export interface Bounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export function capsule(from: Vec2, to: Vec2, radiusFrom: number, radiusTo: number): CapsuleShape {
  return { kind: "capsule", from, to, radiusFrom, radiusTo };
}

export function circle(center: Vec2, radius: number): CircleShape {
  return { kind: "circle", center, radius };
}

export function polygon(points: readonly Vec2[]): PolygonShape {
  return { kind: "polygon", points };
}

/** Closest point on the segment a-b to p, and the parameter t in [0, 1] that produced it. */
function closestOnSegment(p: Vec2, a: Vec2, b: Vec2): { point: Vec2; t: number } {
  const ab = subVec(b, a);
  const lengthSquared = ab.x * ab.x + ab.y * ab.y;
  const projection = lengthSquared === 0 ? 0 : ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / lengthSquared;
  const t = clamp(projection, 0, 1);
  return { point: vec(a.x + ab.x * t, a.y + ab.y * t), t };
}

function insideCapsule(shape: CapsuleShape, p: Vec2): boolean {
  const { point, t } = closestOnSegment(p, shape.from, shape.to);
  const radius = shape.radiusFrom + (shape.radiusTo - shape.radiusFrom) * t;
  const dx = p.x - point.x;
  const dy = p.y - point.y;
  return dx * dx + dy * dy <= radius * radius;
}

function insideCircle(shape: CircleShape, p: Vec2): boolean {
  const dx = p.x - shape.center.x;
  const dy = p.y - shape.center.y;
  return dx * dx + dy * dy <= shape.radius * shape.radius;
}

/** Even-odd rule: a ray cast to +x crosses an odd number of edges only inside the polygon. */
function insidePolygon(shape: PolygonShape, p: Vec2): boolean {
  let inside = false;
  const points = shape.points;
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
    const a = points[index]!;
    const b = points[previous]!;
    const crosses = a.y > p.y !== b.y > p.y;
    if (crosses && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export function containsPoint(shape: Shape, p: Vec2): boolean {
  if (shape.kind === "capsule") return insideCapsule(shape, p);
  if (shape.kind === "circle") return insideCircle(shape, p);
  return insidePolygon(shape, p);
}

export function boundsOf(shape: Shape): Bounds {
  const extremes = extremePoints(shape);
  return {
    minX: Math.min(...extremes.map((point) => point.x)),
    minY: Math.min(...extremes.map((point) => point.y)),
    maxX: Math.max(...extremes.map((point) => point.x)),
    maxY: Math.max(...extremes.map((point) => point.y)),
  };
}

function extremePoints(shape: Shape): Vec2[] {
  if (shape.kind === "polygon") return [...shape.points];
  if (shape.kind === "circle") return ringPoints(shape.center, shape.radius);
  return [...ringPoints(shape.from, shape.radiusFrom), ...ringPoints(shape.to, shape.radiusTo)];
}

function ringPoints(center: Vec2, radius: number): Vec2[] {
  return [vec(center.x - radius, center.y), vec(center.x + radius, center.y), vec(center.x, center.y - radius), vec(center.x, center.y + radius)];
}
