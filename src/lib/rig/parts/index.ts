import type { BodyMetrics } from "../body.ts";
import { buildHead } from "./head.ts";
import { buildForearm, buildShin, buildThigh, buildUpperArm } from "./limbs.ts";
import { buildNeck } from "./neck.ts";
import { buildShoe, buildShoeToe } from "./shoe.ts";
import { buildTorso } from "./torso.ts";
import type { HairStyle, PartGeometry } from "./types.ts";

export type { HairStyle, MaterialKey, PartBuilder, PartGeometry, PartId, Shape } from "./types.ts";
export { buildHead } from "./head.ts";
export { buildForearm, buildShin, buildThigh, buildUpperArm } from "./limbs.ts";
export { buildNeck } from "./neck.ts";
export { buildShoe, buildShoeToe } from "./shoe.ts";
export { buildTorso } from "./torso.ts";

/** The nine articulated parts, in the order the painter may compose them. */
export function buildAllParts(body: BodyMetrics, hair: HairStyle = "short"): readonly PartGeometry[] {
  return [
    buildTorso(body),
    buildNeck(body),
    buildHead(body, hair),
    buildThigh(body),
    buildShin(body),
    buildShoe(body),
    buildShoeToe(body),
    buildUpperArm(body),
    buildForearm(body),
  ];
}
