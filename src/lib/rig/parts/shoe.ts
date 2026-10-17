import { capsule, chamferedBox, circlePolygon, smoothClosedPolygon } from "../../geometry/poly.ts";
import { vec } from "../../geometry/vec.ts";
import type { BodyMetrics } from "../body.ts";
import { shape, type PartGeometry } from "./types.ts";

/**
 * The shoe is split at the ball of the foot, the way a real foot is: the
 * hindfoot carries the ankle and heel, the forefoot carries the toes, and the
 * ball joint between them is what lets the heel peel off the ground while the
 * toes stay planted. A single rigid shoe cannot roll.
 */
export function buildShoe(body: BodyMetrics): PartGeometry {
  const { footHeel: heel, footBall: ball, footSole: sole, footTop: top } = body;
  const upper = smoothClosedPolygon(
    [
      vec(heel - 0.004, sole + 0.012),
      vec(heel - 0.006, sole + 0.04),
      vec(heel + 0.002, sole + 0.064),
      vec(heel + 0.016, top + 0.012),
      vec(heel + 0.032, top + 0.02),
      vec(ball - 0.02, sole + 0.058),
      vec(ball + 0.006, sole + 0.036),
      vec(ball + 0.009, sole + 0.012),
    ],
    4,
  );
  const solePlate = smoothClosedPolygon(
    [
      vec(heel - 0.003, sole + 0.014),
      vec(heel + 0.004, sole),
      vec(ball + 0.009, sole + 0.001),
      vec(ball + 0.01, sole + 0.013),
      vec(heel + 0.006, sole + 0.022),
    ],
    3,
  );
  return {
    id: "shoe",
    label: "Shoe, heel to ball",
    length: ball - heel,
    origin: vec(0, 0),
    tip: vec(ball, sole),
    shapes: [
      shape(upper, "shoe"),
      shape(solePlate, "sole"),
      shape(
        smoothClosedPolygon(
          [
            vec(heel - 0.003, sole + 0.014),
            vec(heel - 0.004, sole + 0.038),
            vec(heel + 0.004, sole + 0.062),
            vec(heel + 0.014, top + 0.008),
            vec(heel + 0.016, sole + 0.04),
            vec(heel + 0.01, sole + 0.016),
          ],
          3,
        ),
        "shoeShade",
      ),
      shape(capsule(vec(heel + 0.024, top + 0.016), vec(ball - 0.012, sole + 0.05), 0.006, 0.007), "shoeShade"),
      shape(capsule(vec(heel + 0.028, top + 0.022), vec(ball - 0.01, sole + 0.058), 0.003, 0.004), "shoeLight"),
      shape(circlePolygon(vec(heel + 0.01, sole + 0.028), 0.008, 0.008, 12), "shoeLight"),
      shape(chamferedBox(vec(heel + 0.014, sole + 0.008), 0.012, 0.003, 0.001), "shoeShade"),
    ],
  };
}

/** Forefoot: the part that pivots at the ball during toe-off. */
export function buildShoeToe(body: BodyMetrics): PartGeometry {
  const { footBall: ball, footToe: toe, footSole: sole, footTop: top } = body;
  const length = toe - ball;
  const soleY = 0;
  const upper = smoothClosedPolygon(
    [
      vec(-0.012, soleY + 0.03),
      vec(0.0, soleY + 0.038),
      vec(length * 0.55, soleY + 0.03),
      vec(length, soleY + 0.02),
      vec(length + 0.004, soleY + 0.008),
      vec(length - 0.004, soleY + 0.001),
      vec(length * 0.4, soleY),
      vec(-0.006, soleY + 0.002),
      vec(-0.014, soleY + 0.014),
    ],
    4,
  );
  return {
    id: "shoeToe",
    label: "Shoe, forefoot",
    length,
    origin: vec(0, 0),
    tip: vec(length, soleY),
    shapes: [
      // The ball joint boss: the forefoot is drawn after the hindfoot, so this
      // circle covers the notch that opens when the heel peels.
      shape(circlePolygon(vec(0.002, 0.009), 0.012, 0.011, 16), "shoe"),
      shape(upper, "shoe"),
      shape(
        smoothClosedPolygon(
          [
            vec(length - 0.002, soleY + 0.002),
            vec(length * 0.38, soleY),
            vec(-0.004, soleY + 0.001),
            vec(-0.008, soleY + 0.011),
            vec(length * 0.5, soleY + 0.009),
            vec(length, soleY + 0.012),
          ],
          3,
        ),
        "sole",
      ),
      shape(
        smoothClosedPolygon(
          [
            vec(length - 0.004, soleY + 0.008),
            vec(length * 0.62, soleY + 0.012),
            vec(length * 0.3, soleY + 0.016),
            vec(length * 0.26, soleY + 0.03),
            vec(length * 0.7, soleY + 0.026),
            vec(length, soleY + 0.017),
          ],
          3,
        ),
        "shoeLight",
      ),
      ...[0, 1, 2].map((index) =>
        shape(chamferedBox(vec(length * 0.3 + index * 0.013, soleY + 0.032 - index * 0.002), 0.008, 0.0026, 0.001), "shoeLight"),
      ),
      shape(capsule(vec(-0.004, soleY + 0.034), vec(length * 0.5, soleY + 0.03), 0.004, 0.005), "shoeShade"),
    ],
  };
}
