import type { Point } from "../gait";
export interface EndCap {
  enabled: boolean;
  radius: number;
  blend: number;
}
export interface PartEndCut {
  start: EndCap;
  end: EndCap;
  feather: number;
}
export const limbKinds = [
  "thigh",
  "shin",
  "upper-arm",
  "forearm",
  "hand",
] as const;
export type RoundablePart = `${"near" | "far"}-${(typeof limbKinds)[number]}`;
export type EndCuts = Record<RoundablePart, PartEndCut>;
export const limbGeometry = {
  thigh: { length: 32, width: 0.85, start: 5.2, end: 3.8 },
  shin: { length: 32, width: 0.95, start: 3.8, end: 2.6 },
  "upper-arm": { length: 22, width: 0.72, start: 3.8, end: 2.5 },
  forearm: { length: 19, width: 0.88, start: 2.5, end: 1.9 },
  hand: { length: 5.32, width: 1.1, start: 1.9, end: 2.2 },
};
export const roundableParts: RoundablePart[] = ["near", "far"].flatMap((side) =>
  limbKinds.map((kind) => `${side}-${kind}` as RoundablePart),
);
export function getLimbGeometry(name: RoundablePart) {
  return limbGeometry[
    name.slice(name.indexOf("-") + 1) as (typeof limbKinds)[number]
  ];
}
export const defaultEndCuts = Object.fromEntries(
  roundableParts.map((name) => {
    const geometry = getLimbGeometry(name);
    return [
      name,
      {
        start: { enabled: true, radius: geometry.start, blend: 3 },
        end: {
          enabled: !name.endsWith("hand"),
          radius: geometry.end,
          blend: 3,
        },
        feather: 0.35,
      },
    ];
  }),
) as EndCuts;
function capAlpha(point: Point, cap: EndCap, feather: number) {
  if (!cap.enabled) return 1;
  const distance =
    point.y < 0 ? Math.hypot(point.x, point.y) : Math.abs(point.x);
  const t =
    feather === 0
      ? distance <= cap.radius
        ? 1
        : 0
      : Math.max(0, Math.min(1, (cap.radius - distance) / feather + 0.5));
  const edge = t * t * (3 - 2 * t);
  const transition =
    cap.blend === 0
      ? point.y > 0
        ? 1
        : 0
      : Math.max(0, Math.min(1, point.y / cap.blend));
  const blend = transition * transition * (3 - 2 * transition);
  return edge + (1 - edge) * blend;
}
// Bone-local x is transverse; y runs from start pivot (0) to end pivot (length).
// The shoulder of the cap blends into the shaft INSIDE the segment, removing
// corners adjacent to the pivot which a beyond-pivot-only semicircle misses.
export function endCutAlpha(point: Point, length: number, cut: PartEndCut) {
  return (
    capAlpha(point, cut.start, cut.feather) *
    capAlpha({ x: point.x, y: length - point.y }, cut.end, cut.feather)
  );
}
