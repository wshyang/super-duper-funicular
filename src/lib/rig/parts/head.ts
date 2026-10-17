import { chamferedBox, circlePolygon, smoothClosedPolygon } from "../../geometry/poly.ts";
import { vec } from "../../geometry/vec.ts";
import type { BodyMetrics } from "../body.ts";
import { shape, type HairStyle, type PartGeometry } from "./types.ts";

/**
 * Head profile in normalised units (x forward, y up, 1 = half head height).
 * The silhouette carries the brow, nose, lips, chin and jaw so the face reads
 * at small sizes without painted detail. Origin is the top of the neck, so the
 * head rotates about the atlas joint rather than about the middle of the skull.
 */
const HEAD_PROFILE: readonly (readonly [number, number])[] = [
  [0.04, 1.0], [0.34, 0.97], [0.56, 0.86], [0.68, 0.66], [0.72, 0.44],
  [0.66, 0.22], [0.68, 0.16], [0.9, 0.03], [0.98, -0.07], [0.78, -0.09],
  [0.72, -0.15], [0.78, -0.22], [0.76, -0.3], [0.66, -0.36], [0.6, -0.5],
  [0.44, -0.66], [0.2, -0.76], [-0.06, -0.82], [-0.32, -0.72], [-0.52, -0.52],
  [-0.62, -0.3], [-0.7, -0.04], [-0.7, 0.24], [-0.56, 0.6], [-0.3, 0.88],
];

export function buildHead(body: BodyMetrics, hair: HairStyle = "short"): PartGeometry {
  const { headCenterOffset, headRadiusX, headRadiusY } = body;
  const centerY = headCenterOffset;
  const p = (x: number, y: number) => vec(headRadiusX * x, centerY + headRadiusY * y);
  const skull = smoothClosedPolygon(HEAD_PROFILE.map(([x, y]) => p(x, y)), 3);
  const nape = hair === "ponytail" ? ponytailShapes(headRadiusX, headRadiusY, centerY) : [];
  return {
    id: "head",
    label: "Head",
    length: headCenterOffset + headRadiusY,
    origin: vec(0, 0),
    tip: vec(0, headCenterOffset + headRadiusY),
    shapes: [
      // Ponytail sits behind the skull, so it is drawn before it.
      ...nape,
      shape(skull, "skin"),
      shape(
        smoothClosedPolygon(
          [
            p(0.2, 0.9), p(0.52, 0.78), p(0.64, 0.5), p(0.62, 0.22),
            p(0.62, -0.12), p(0.62, -0.42), p(0.4, -0.62), p(0.16, -0.66),
            p(0.1, -0.3), p(0.12, 0.2),
          ],
          3,
        ),
        "skinLight",
      ),
      shape(
        smoothClosedPolygon(
          [p(-0.66, 0.16), p(-0.52, 0.56), p(-0.26, 0.84), p(-0.14, 0.4), p(-0.18, -0.2), p(-0.34, -0.6), p(-0.56, -0.44)],
          3,
        ),
        "skinShade",
      ),
      shape(circlePolygon(p(-0.46, -0.02), 0.013, 0.018, 16), "skin"),
      shape(circlePolygon(p(-0.46, -0.02), 0.006, 0.009, 12), "skinShade"),
      shape(
        smoothClosedPolygon(
          [
            p(-0.72, 0.2), p(-0.6, 0.6), p(-0.3, 0.9), p(0.02, 1.02), p(0.36, 0.98),
            p(0.6, 0.86), p(0.72, 0.66), p(0.58, 0.6), p(0.42, 0.66), p(0.3, 0.54),
            p(0.16, 0.62), p(0.02, 0.5), p(-0.16, 0.58), p(-0.3, 0.44), p(-0.52, 0.4),
          ],
          4,
        ),
        "hair",
      ),
      shape(smoothClosedPolygon([p(-0.68, 0.18), p(-0.6, -0.18), p(-0.48, -0.16), p(-0.5, 0.3)], 3), "hairShade"),
      shape(smoothClosedPolygon([p(-0.24, 0.9), p(0.06, 0.98), p(0.44, 0.9), p(0.2, 0.84), p(-0.06, 0.84)], 3), "hairLight"),
      shape(smoothClosedPolygon([p(-0.3, 0.44), p(-0.36, 0.2), p(-0.46, 0.16), p(-0.48, 0.36)], 3), "hair"),
      shape(chamferedBox(p(0.42, 0.24), 0.014, 0.0032, 0.002), "hairShade"),
      shape(chamferedBox(p(0.44, 0.12), 0.015, 0.008, 0.003), "white"),
      shape(chamferedBox(p(0.5, 0.12), 0.006, 0.007, 0.0025), "eye"),
      shape(circlePolygon(p(0.3, -0.3), 0.013, 0.009, 12), "skinShade"),
      shape(chamferedBox(p(0.48, -0.42), 0.011, 0.0028, 0.001), "mouth"),
      shape(chamferedBox(p(0.52, -0.58), 0.007, 0.0032, 0.001), "skinShade"),
      ...(hair === "ponytail" ? ponytailFront(headRadiusX, headRadiusY, centerY) : []),
    ],
  };
}

/** Long hair: a gathered tail falling behind the shoulder line. */
function ponytailShapes(rx: number, ry: number, cy: number) {
  return [
    shape(
      smoothClosedPolygon(
        [
          vec(-rx * 0.72, cy + ry * 0.62),
          vec(-rx * 0.95, cy + ry * 0.3),
          vec(-rx * 1.0, cy + ry * 0.02),
          vec(-rx * 0.72, cy + ry * 0.14),
          vec(-rx * 0.6, cy + ry * 0.42),
        ],
        3,
      ),
      "hair",
    ),
    shape(
      smoothClosedPolygon(
        [
          vec(-rx * 0.86, cy + ry * 0.3),
          vec(-rx * 1.12, cy - ry * 0.1),
          vec(-rx * 1.2, cy - ry * 0.52),
          vec(-rx * 1.02, cy - ry * 0.78),
          vec(-rx * 0.84, cy - ry * 0.62),
          vec(-rx * 0.9, cy - ry * 0.2),
        ],
        4,
      ),
      "hair",
    ),
    shape(
      smoothClosedPolygon(
        [
          vec(-rx * 1.04, cy - ry * 0.24),
          vec(-rx * 1.16, cy - ry * 0.56),
          vec(-rx * 1.06, cy - ry * 0.72),
          vec(-rx * 0.94, cy - ry * 0.5),
          vec(-rx * 0.96, cy - ry * 0.2),
        ],
        3,
      ),
      "hairLight",
    ),
    shape(circlePolygon(vec(-rx * 0.72, cy + ry * 0.24), rx * 0.2, ry * 0.16, 14), "hairShade"),
  ];
}

/** Fringe swept to the side, heavier than the short style. */
function ponytailFront(rx: number, ry: number, cy: number) {
  return [
    shape(
      smoothClosedPolygon(
        [
          vec(-rx * 0.5, cy + ry * 0.78),
          vec(0.0, cy + ry * 1.06),
          vec(rx * 0.5, cy + ry * 0.96),
          vec(rx * 0.7, cy + ry * 0.66),
          vec(rx * 0.86, cy + ry * 0.4),
          vec(rx * 0.62, cy + ry * 0.34),
          vec(rx * 0.42, cy + ry * 0.62),
          vec(rx * 0.1, cy + ry * 0.56),
          vec(-rx * 0.2, cy + ry * 0.66),
        ],
        3,
      ),
      "hair",
    ),
  ];
}
