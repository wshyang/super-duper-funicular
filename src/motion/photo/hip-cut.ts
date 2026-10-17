import type { Point } from "../gait";
export interface HipCut {
  radiusX: number;
  radiusY: number;
  offsetY: number;
  feather: number;
}
export const defaultHipCut: HipCut = {
  radiusX: 7,
  radiusY: 4.5,
  offsetY: 0,
  feather: 0.6,
};
export const PHOTO_LAYER_ORDER = [
  "far-arm",
  "far-leg",
  "pelvis",
  "near-leg",
  "neck",
  "torso",
  "head",
  "near-arm",
] as const;
export const ORIGINAL_LAYER_ORDER = [
  "far-arm",
  "far-leg",
  "near-leg",
  "pelvis",
  "neck",
  "torso",
  "head",
  "near-arm",
] as const;
export type PhotoLayer = (typeof PHOTO_LAYER_ORDER)[number];
// Keep the waist above a lower half-ellipse; remove the old hanging shorts hem.
// Coordinates are rig pixels relative to the hip pivot, not source-image pixels.
export function hipMaskAlpha(point: Point, cut: HipCut): number {
  const fraction = point.x / cut.radiusX;
  const boundary =
    cut.offsetY + cut.radiusY * Math.sqrt(Math.max(0, 1 - fraction * fraction));
  if (cut.feather === 0) return point.y <= boundary ? 1 : 0;
  const t = Math.max(0, Math.min(1, (boundary - point.y) / cut.feather + 0.5));
  return t * t * (3 - 2 * t);
}
