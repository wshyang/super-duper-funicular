import { capsule, chamferedBox, smoothClosedPolygon } from "../../geometry/poly.ts";
import { vec } from "../../geometry/vec.ts";
import type { BodyMetrics } from "../body.ts";
import { edgeBand, shape, type PartGeometry } from "./types.ts";

/**
 * Ribcage, singlet hem and the shorts block. The torso ends at the neck base:
 * the neck is its own articulated part, drawn separately, so the head can
 * counter-rotate without dragging the shoulders with it.
 */
export function buildTorso(body: BodyMetrics): PartGeometry {
  const { torsoLength, chestDepth, waistDepth, hipDepth, neckLength } = body;
  const shirt = smoothClosedPolygon(
    [
      vec(-hipDepth * 0.98, -0.012),
      vec(-waistDepth * 1.0, 0.06),
      vec(-chestDepth * 0.9, 0.15),
      vec(-chestDepth * 0.94, 0.215),
      vec(-chestDepth * 0.99, 0.252),
      vec(-chestDepth * 0.66, 0.276),
      vec(-0.028, torsoLength - 0.004),
      vec(0.03, torsoLength - 0.004),
      vec(chestDepth * 0.68, 0.276),
      vec(chestDepth * 1.0, 0.25),
      vec(chestDepth * 0.95, 0.21),
      vec(chestDepth * 0.88, 0.14),
      vec(waistDepth * 0.98, 0.065),
      vec(hipDepth * 1.02, -0.012),
      vec(0.01, -0.03),
    ],
    5,
  );
  const shorts = smoothClosedPolygon(
    [
      vec(-hipDepth * 0.96, 0.04),
      vec(-hipDepth * 1.0, -0.012),
      vec(-hipDepth * 0.78, -0.05),
      vec(-0.026, -0.064),
      vec(0.018, -0.06),
      vec(hipDepth * 0.86, -0.044),
      vec(hipDepth * 1.0, -0.008),
      vec(hipDepth * 0.94, 0.042),
      vec(0.01, 0.054),
    ],
    6,
  );
  return {
    id: "torso",
    label: "Torso + pelvis",
    length: torsoLength,
    origin: vec(0, 0),
    tip: vec(0, torsoLength),
    shapes: [
      shape(shorts, "shorts"),
      shape(
        smoothClosedPolygon(
          [
            vec(hipDepth * 0.55, -0.05),
            vec(hipDepth * 0.84, -0.03),
            vec(hipDepth * 0.55, -0.005),
            vec(hipDepth * 0.36, -0.03),
          ],
          3,
        ),
        "stripe",
      ),
      shape(shirt, "shirt"),
      shape(edgeBand(vec(-0.005, 0.02), vec(-0.01, torsoLength - 0.02), hipDepth * 0.98, chestDepth * 0.9, -1, 0.42), "shirtShade"),
      shape(edgeBand(vec(0.01, 0.03), vec(0.012, torsoLength - 0.03), hipDepth * 0.9, chestDepth * 0.8, 1, 0.22), "shirtLight"),
      shape(capsule(vec(0, torsoLength - 0.006), vec(0.004, torsoLength + 0.012), 0.03, 0.025), "shirtShade"),
      // Collar: hides the seam where the articulated neck emerges.
      shape(
        smoothClosedPolygon(
          [
            vec(-0.038, torsoLength - 0.004),
            vec(0.036, torsoLength - 0.004),
            vec(0.03, torsoLength + neckLength * 0.55),
            vec(-0.03, torsoLength + neckLength * 0.55),
          ],
          3,
        ),
        "shirtShade",
      ),
    ],
  };
}
