import { describe, it, expect } from "vitest";
import {
  getPartTransform,
  applyTransform,
} from "../../../src/motion/photo/transform";
import manifest from "../../../public/photo-runner/manifest.json";
describe("photographic articulation", () => {
  it("maps each source bone to both target joints without mirroring", () => {
    for (const part of Object.values(manifest.parts)) {
      const target = { start: { x: 8, y: 12 }, end: { x: -15, y: 40 } };
      const matrix = getPartTransform({ part, target, width: 0.85 });
      expect(applyTransform(matrix, part.start).x).toBeCloseTo(
        target.start.x,
        8,
      );
      expect(applyTransform(matrix, part.start).y).toBeCloseTo(
        target.start.y,
        8,
      );
      expect(applyTransform(matrix, part.end).x).toBeCloseTo(target.end.x, 8);
      expect(applyTransform(matrix, part.end).y).toBeCloseTo(target.end.y, 8);
      expect(matrix[0] * matrix[3] - matrix[1] * matrix[2]).toBeGreaterThan(0);
    }
  });
  it("uses independent inside/outside sources, including shoes and hands", () => {
    for (const suffix of [
      "upper-arm",
      "forearm",
      "hand",
      "thigh",
      "shin",
      "shoe",
    ]) {
      const parts = manifest.parts as Record<
        string,
        { source: string; sha256: string }
      >;
      expect(parts[`near-${suffix}`].source).not.toBe(
        parts[`far-${suffix}`].source,
      );
      expect(parts[`near-${suffix}`].sha256).not.toBe(
        parts[`far-${suffix}`].sha256,
      );
    }
  });
});
