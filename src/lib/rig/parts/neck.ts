import { capsule } from "../../geometry/poly.ts";
import { vec } from "../../geometry/vec.ts";
import type { BodyMetrics } from "../body.ts";
import { edgeBand, shape, type PartGeometry } from "./types.ts";

/**
 * The neck is a real segment with its own joint, not part of the head or the
 * torso. Its angle is solved independently so the head can stay level while
 * the trunk leans and bobs.
 */
export function buildNeck(body: BodyMetrics): PartGeometry {
  const { neckLength } = body;
  return {
    id: "neck",
    label: "Neck",
    length: neckLength,
    origin: vec(0, 0),
    tip: vec(0, neckLength),
    shapes: [
      shape(capsule(vec(0, -0.012), vec(0, neckLength + 0.006), 0.028, 0.024), "skin"),
      shape(edgeBand(vec(0, -0.008), vec(0, neckLength), 0.027, 0.024, -1, 0.45), "skinShade"),
      shape(edgeBand(vec(0, -0.004), vec(0, neckLength), 0.022, 0.019, 1, 0.28), "skinLight"),
    ],
  };
}
