import { describe, expect, it } from "vitest";
import { loadRaster } from "./image-io.ts";
import { detectSheetGrid } from "./grid-detection.ts";
import { RUNNER_SHEET_PATH } from "./sheet-fixture.ts";

// Gutter-to-gutter boundaries measured on the reference sheet (2528 x 1696).
const EXPECTED_ROW_STARTS = [132, 399, 663, 925, 1186, 1444];
const EXPECTED_COLUMN_STARTS = [2, 319, 636, 954, 1270, 1586, 1904, 2221];
const TOLERANCE_PIXELS = 3;

describe("detectSheetGrid on the reference running sheet", () => {
  it("finds 8 columns and 6 rows whose edges match the measured gutters", async () => {
    const sheet = await loadRaster(RUNNER_SHEET_PATH);
    const grid = detectSheetGrid(sheet, { columns: 8, rows: 6 });

    expect(grid.columns).toHaveLength(8);
    expect(grid.rows).toHaveLength(6);
    grid.columns.forEach((span, index) => {
      expect(Math.abs(span.start - EXPECTED_COLUMN_STARTS[index]!)).toBeLessThanOrEqual(TOLERANCE_PIXELS);
    });
    grid.rows.forEach((span, index) => {
      expect(Math.abs(span.start - EXPECTED_ROW_STARTS[index]!)).toBeLessThanOrEqual(TOLERANCE_PIXELS);
    });
  }, 60_000);

  it("throws when the expected grid does not match the artwork", async () => {
    const sheet = await loadRaster(RUNNER_SHEET_PATH);
    expect(() => detectSheetGrid(sheet, { columns: 5, rows: 6 })).toThrow(/expected 5 columns/);
  }, 60_000);
});
