import { expect, it } from "vitest";
import { auditCells, AUDIT_HEIGHT, AUDIT_WIDTH } from "../src/lib/analysis/audit-layout.ts";
it("covers sixteen unique phases with three bounded diagnostic panels each", () => {
  const cells = auditCells();
  expect(cells).toHaveLength(48);
  expect(new Set(cells.map((cell) => cell.phase)).size).toBe(16);
  expect(cells.filter((cell) => cell.panel === "joints")).toHaveLength(16);
  expect(Math.max(...cells.map((cell) => cell.phase))).toBe(15 / 16);
  for (const cell of cells) {
    expect(cell.x).toBeGreaterThanOrEqual(0);
    expect(cell.y).toBeGreaterThanOrEqual(0);
    expect(cell.x + cell.width).toBeLessThanOrEqual(AUDIT_WIDTH);
    expect(cell.y + cell.height).toBeLessThanOrEqual(AUDIT_HEIGHT);
  }
  expect(new Set(cells.map((cell) => `${cell.x},${cell.y}`)).size).toBe(48);
});
