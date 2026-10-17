import { capsule, type Polygon } from "../../geometry/poly.ts";
import { normalize, scale, subtract, vec, type Vec2 } from "../../geometry/vec.ts";
import type { Palette } from "../palette.ts";

export type MaterialKey = keyof Palette | "none";

export interface Shape {
  readonly points: Polygon;
  readonly material: MaterialKey;
  /** Informational: the scene painter outlines whole groups, not single shapes. */
  readonly outline?: boolean;
}

export type PartId =
  | "torso"
  | "neck"
  | "head"
  | "thigh"
  | "shin"
  | "shoe"
  | "shoeToe"
  | "upperArm"
  | "forearm";

export interface PartGeometry {
  readonly id: PartId;
  readonly label: string;
  /** Length along the part's own bone, in body units. */
  readonly length: number;
  readonly shapes: readonly Shape[];
  /** Proximal joint in the part's local space. */
  readonly origin: Vec2;
  /** Distal joint in the part's local space. */
  readonly tip: Vec2;
}

/** Hair silhouette a skin can request. */
export type HairStyle = "short" | "ponytail";

/** A skin may replace any part builder to change silhouette without new art. */
export type PartBuilder = () => PartGeometry;

export const shape = (points: Polygon, material: MaterialKey): Shape => ({ points, material });

/** A crescent along one edge of a tapering limb, used for cel shading. */
export function edgeBand(
  from: Vec2,
  to: Vec2,
  radiusFrom: number,
  radiusTo: number,
  side: 1 | -1,
  depth: number,
  samples = 10,
): Polygon {
  const axis = normalize(subtract(to, from));
  const normal = scale(vec(-axis.y, axis.x), side);
  const edge: Vec2[] = [];
  const inner: Vec2[] = [];
  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples;
    const center = vec(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
    const radius = radiusFrom + (radiusTo - radiusFrom) * t;
    edge.push(vec(center.x + normal.x * radius, center.y + normal.y * radius));
    inner.push(vec(center.x + normal.x * radius * (1 - depth), center.y + normal.y * radius * (1 - depth)));
  }
  return [...edge, ...inner.reverse()];
}

/** Skin capsule with a shadow edge and a lit edge. */
export function skinLimb(length: number, topRadius: number, bottomRadius: number): Shape[] {
  const from = vec(0, 0);
  const to = vec(0, -length);
  return [
    shape(capsule(from, to, topRadius, bottomRadius), "skin"),
    shape(edgeBand(from, to, topRadius, bottomRadius, -1, 0.5), "skinShade"),
    shape(edgeBand(from, to, topRadius, bottomRadius, 1, 0.32), "skinLight"),
  ];
}

/** A garment band over a limb: fill plus shade and highlight edges. */
export function garmentBand(
  from: Vec2,
  to: Vec2,
  radiusFrom: number,
  radiusTo: number,
  material: MaterialKey,
  shade: MaterialKey,
  highlight: MaterialKey,
): Shape[] {
  return [
    shape(capsule(from, to, radiusFrom, radiusTo), material),
    shape(edgeBand(from, to, radiusFrom, radiusTo, -1, 0.42), shade),
    shape(edgeBand(from, to, radiusFrom, radiusTo, 1, 0.2), highlight),
  ];
}

