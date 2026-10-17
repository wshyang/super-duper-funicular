import type { Rgb } from "./palette.ts";
import type { Shape } from "./shapes.ts";

/** One filled shape in a layer. Ops are painted in array order, so later ops cover earlier ones. */
export interface PaintOp {
  readonly shape: Shape;
  readonly color: Rgb;
}

export function paintOp(shape: Shape, color: Rgb): PaintOp {
  return { shape, color };
}
