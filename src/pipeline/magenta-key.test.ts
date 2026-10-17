import { describe, expect, it } from "vitest";
import { isMagentaKey, keyOutBackground } from "./magenta-key.ts";
import { createRaster, type Raster } from "./raster.ts";
import { loadRaster } from "./image-io.ts";
import { RUNNER_SHEET_PATH } from "./sheet-fixture.ts";

function rasterFromPixels(width: number, height: number, pixel: (x: number, y: number) => [number, number, number]): Raster {
  const raster = createRaster(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = pixel(x, y);
      const offset = (y * width + x) * 4;
      raster.data.set([r, g, b, 255], offset);
    }
  }
  return raster;
}

describe("isMagentaKey", () => {
  it("keys pure and lightly noisy magenta", () => {
    expect(isMagentaKey(255, 0, 255)).toBe(true);
    expect(isMagentaKey(248, 72, 248)).toBe(true);
  });

  it("keeps skin, shirts and dark outlines", () => {
    expect(isMagentaKey(200, 128, 96)).toBe(false);
    expect(isMagentaKey(200, 30, 30)).toBe(false);
    expect(isMagentaKey(8, 0, 16)).toBe(false);
    expect(isMagentaKey(130, 60, 180)).toBe(false);
  });
});

describe("keyOutBackground", () => {
  it("marks an enclosed magenta pocket as background, not just the border-connected field", () => {
    // 5x5 field of magenta with a sprite-coloured ring; the centre pixel is an enclosed magenta pocket.
    const raster = rasterFromPixels(5, 5, (x, y) => {
      const isRing = x >= 1 && x <= 3 && y >= 1 && y <= 3 && !(x === 2 && y === 2);
      return isRing ? [200, 30, 30] : [255, 0, 255];
    });
    const mask = keyOutBackground(raster, { x: 0, y: 0, width: 5, height: 5 });
    expect(mask[2 * 5 + 2]).toBe(0);
    expect(mask[0]).toBe(0);
    expect(mask[2 * 5 + 1]).toBe(1);
  });

  it("leaves no magenta-keyed pixel in the foreground of the real reference sheet", async () => {
    const sheet = await loadRaster(RUNNER_SHEET_PATH);
    const mask = keyOutBackground(sheet, { x: 0, y: 0, width: sheet.width, height: sheet.height });
    let leakedMagenta = 0;
    for (let index = 0; index < mask.length; index += 1) {
      if (mask[index] === 0) continue;
      const offset = index * 4;
      if (isMagentaKey(sheet.data[offset]!, sheet.data[offset + 1]!, sheet.data[offset + 2]!)) leakedMagenta += 1;
    }
    expect(leakedMagenta).toBe(0);
  }, 60_000);
});
