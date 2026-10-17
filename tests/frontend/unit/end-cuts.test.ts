import { describe, it, expect } from "vitest";
import {
  endCutAlpha,
  defaultEndCuts,
} from "../../../src/motion/photo/end-cuts";
describe("rounded articulated ends", () => {
  const cut = defaultEndCuts["near-thigh"];
  it("clips corners on both sides of the joint plane, not only beyond the pivot", () => {
    expect(endCutAlpha({ x: 7, y: -1 }, 32, cut)).toBe(0);
    expect(endCutAlpha({ x: 7, y: 0 }, 32, cut)).toBe(0);
    expect(endCutAlpha({ x: 0, y: 0 }, 32, cut)).toBe(1);
  });
  it("retains the shaft and rounds the distal end independently", () => {
    expect(endCutAlpha({ x: 6, y: 16 }, 32, cut)).toBe(1);
    expect(endCutAlpha({ x: 7, y: 33 }, 32, cut)).toBe(0);
    expect(endCutAlpha({ x: 0, y: 32 }, 32, cut)).toBe(1);
  });
  it("is symmetric, feathered, and can disable either cap", () => {
    const radius = cut.start.radius;
    expect(endCutAlpha({ x: radius, y: 0 }, 32, cut)).toBeCloseTo(0.5);
    expect(endCutAlpha({ x: 2, y: -2 }, 32, cut)).toBe(
      endCutAlpha({ x: -2, y: -2 }, 32, cut),
    );
    expect(
      endCutAlpha({ x: 20, y: -3 }, 32, {
        ...cut,
        start: { ...cut.start, enabled: false },
      }),
    ).toBe(1);
  });
});
