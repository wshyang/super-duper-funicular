import type { Vec2 } from "../geometry/vec.ts";
import type { PhotoDraw } from "../photo/scene.ts";
import type { PhotoRig } from "../photo/rig.ts";
import { worldToScreen, type View } from "./paint.ts";

/** The canvas surface a photographic rig needs: transforms plus one bitmap draw. */
export interface BitmapImage {
  readonly width: number;
  readonly height: number;
}

export interface PhotoContext {
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  drawImage(image: BitmapImage, dx: number, dy: number, dw: number, dh: number): void;
}

/** Bitmap lookup by manifest path, filled by the loader. */
export interface PhotoAssets {
  get(file: string): BitmapImage | undefined;
}

/**
 * Draws one posed frame. Each cut-out is positioned by the world joint it
 * turns about and rotated by the pose delta; the plate scale converts plate
 * pixels to screen pixels, so the same rig renders at any canvas size.
 */
export function paintPhotoRunner(
  context: PhotoContext,
  draws: readonly PhotoDraw[],
  rig: PhotoRig,
  assets: PhotoAssets,
  view: View,
): number {
  const scale = view.scale / rig.pixelsPerBody;
  let painted = 0;
  for (const draw of draws) {
    const image = assets.get(draw.file);
    if (image === undefined) continue;
    const pivot = worldToScreen(draw.pivot, view) as Vec2;
    context.save();
    context.translate(pivot.x, pivot.y);
    context.rotate(draw.angle);
    context.drawImage(image, -draw.pivotX * scale, -draw.pivotY * scale, draw.width * scale, draw.height * scale);
    context.restore();
    painted += 1;
  }
  return painted;
}

export const missingAssets = (draws: readonly PhotoDraw[], assets: PhotoAssets): readonly string[] =>
  [...new Set(draws.map((draw) => draw.file))].filter((file) => assets.get(file) === undefined);
