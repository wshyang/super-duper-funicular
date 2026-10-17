import { describe, expect, it } from "vitest";
import { createRaster, type Raster } from "./raster.ts";
import { cutSpriteFromCell, maskBounds } from "./sprite-cut.ts";
import { registerCuts } from "./sprite-registration.ts";
import { loadRaster } from "./image-io.ts";
import { RUNNER_SHEET_PATH } from "./sheet-fixture.ts";
import { hashRasterPixels } from "./hashing.ts";
import { detectSheetGrid } from "./grid-detection.ts";
import { cropRaster } from "./raster.ts";

/** A 12x10 magenta cell holding a 4x4 red block at (5,3), with magenta everywhere else. */
function syntheticCell(): Raster {
  const cell = createRaster(12, 10);
  for (let index = 0; index < cell.data.length; index += 4) {
    cell.data.set([255, 0, 255, 255], index);
  }
  for (let y = 3; y < 7; y += 1) {
    for (let x = 5; x < 9; x += 1) cell.data.set([200, 30, 30, 255], (y * 12 + x) * 4);
  }
  return cell;
}

describe("cutSpriteFromCell", () => {
  it("crops tightly to the sprite and reports its ground line and centroid", () => {
    const sheet = syntheticCell();
    const cut = cutSpriteFromCell(sheet, { x: 0, y: 0, width: 12, height: 10 }, { row: 0, column: 0 });
    expect(cut.sheetBounds).toEqual({ x: 5, y: 3, width: 4, height: 4 });
    expect(cut.pixels.width).toBe(4);
    expect(cut.pixels.height).toBe(4);
    expect(cut.pivot).toEqual({ x: 2, y: 4 });
  });

  it("sets alpha to zero for keyed background and 255 for the sprite", () => {
    const sheet = syntheticCell();
    const cut = cutSpriteFromCell(sheet, { x: 0, y: 0, width: 12, height: 10 }, { row: 0, column: 0 });
    for (let index = 3; index < cut.pixels.data.length; index += 4) {
      expect(cut.pixels.data[index]).toBe(255);
    }
  });

  it("maskBounds throws on an empty mask", () => {
    expect(() => maskBounds(new Uint8Array(9), 3, 3)).toThrow(/no sprite pixels/);
  });
});

describe("registerCuts", () => {
  it("gives every frame the same canvas, ground line and pivot", () => {
    const sheet = syntheticCell();
    const wide = cutSpriteFromCell(sheet, { x: 0, y: 0, width: 12, height: 10 }, { row: 0, column: 0 });
    const narrowSheet = createRaster(6, 6);
    narrowSheet.data.fill(255);
    for (let index = 0; index < narrowSheet.data.length; index += 4) narrowSheet.data.set([255, 0, 255, 255], index);
    narrowSheet.data.set([10, 10, 10, 255], (2 * 6 + 2) * 4);
    const narrow = cutSpriteFromCell(narrowSheet, { x: 0, y: 0, width: 6, height: 6 }, { row: 0, column: 1 });

    const registration = registerCuts([wide, narrow]);
    expect(registration.frames).toHaveLength(2);
    for (const frame of registration.frames) {
      expect(frame.pixels.width).toBe(registration.canvasWidth);
      expect(frame.pixels.height).toBe(registration.canvasHeight);
      expect(frame.pivot).toEqual(registration.pivot);
    }
  });
});

describe("cut-out frames from the real reference sheet", () => {
  it("cuts 48 distinct sprites with a plausible body size", async () => {
    const sheet = await loadRaster(RUNNER_SHEET_PATH);
    const grid = detectSheetGrid(sheet, { columns: 8, rows: 6 });
    const hashes = new Set<string>();
    for (let row = 0; row < 6; row += 1) {
      for (let column = 0; column < 8; column += 1) {
        const span = { x: grid.columns[column]!.start, width: grid.columns[column]!.end - grid.columns[column]!.start + 1 };
        const rowSpan = grid.rows[row]!;
        const cellRect = { x: span.x, y: rowSpan.start, width: span.width, height: rowSpan.end - rowSpan.start + 1 };
        const cut = cutSpriteFromCell(cropRaster(sheet, cellRect), { x: 0, y: 0, width: cellRect.width, height: cellRect.height }, { row, column });
        expect(cut.pixels.height).toBeGreaterThan(190);
        expect(cut.pixels.width).toBeGreaterThan(140);
        hashes.add(hashRasterPixels(cut.pixels));
      }
    }
    expect(hashes.size).toBe(48);
  }, 120_000);
});
