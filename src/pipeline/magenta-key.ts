import { type Rect, type Raster, pixelOffset } from "./raster.ts";

/**
 * Chroma key for the sheet background. The field is magenta (red and blue high,
 * green low). Red and blue must be within 45 of each other so that warm skin tones and
 * saturated red shirts are never keyed.
 */
export function isMagentaKey(red: number, green: number, blue: number): boolean {
  return red > 185 && blue > 185 && green < 115 && Math.abs(red - blue) < 45;
}

/**
 * Returns a per-pixel foreground mask (1 = sprite, 0 = magenta background) for the
 * given rectangle. Every magenta pixel is keyed, including enclosed pockets between
 * limbs and torso, not only pixels connected to the border.
 */
export function keyOutBackground(raster: Raster, rect: Rect): Uint8Array {
  const mask = new Uint8Array(rect.width * rect.height);
  for (let y = 0; y < rect.height; y += 1) {
    for (let x = 0; x < rect.width; x += 1) {
      const offset = pixelOffset(raster, rect.x + x, rect.y + y);
      const isBackground = isMagentaKey(raster.data[offset]!, raster.data[offset + 1]!, raster.data[offset + 2]!);
      mask[y * rect.width + x] = isBackground ? 0 : 1;
    }
  }
  return mask;
}
