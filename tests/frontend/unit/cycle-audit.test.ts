import { describe, expect, it } from "vitest";
import { auditSamples } from "../../../src/motion/audit-layout";
describe("full-cycle audit sampling", () => {
  it("includes the eight intermediate phases without duplicating the loop endpoint", () => {
    expect(auditSamples).toHaveLength(16);
    expect(auditSamples.map((sample) => sample.phase)).toEqual(
      Array.from({ length: 16 }, (_, i) => i / 16),
    );
    expect(new Set(auditSamples.map((sample) => sample.phase)).size).toBe(16);
  });
  it("fits sixteen non-overlapping three-panel cells into the sheet", () => {
    expect(new Set(auditSamples.map(({ x, y }) => `${x}:${y}`)).size).toBe(16);
    for (const sample of auditSamples) {
      expect(sample.x).toBeGreaterThanOrEqual(0);
      expect(sample.x + 480).toBeLessThanOrEqual(1920);
      expect(sample.y + 180).toBeLessThanOrEqual(720);
    }
  });
});
