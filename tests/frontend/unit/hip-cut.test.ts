import { describe, it, expect } from "vitest";
import {
  defaultHipCut,
  hipMaskAlpha,
  PHOTO_LAYER_ORDER,
} from "../../../src/motion/photo/hip-cut";
describe("rounded photographic hip socket", () => {
  it("retains the waist but removes the static shorts tail", () => {
    expect(hipMaskAlpha({ x: 0, y: -4 }, defaultHipCut)).toBe(1);
    expect(hipMaskAlpha({ x: 0, y: 14 }, defaultHipCut)).toBe(0);
  });
  it("makes a rounded symmetric boundary with a feathered edge", () => {
    const cut = {
      ...defaultHipCut,
      offsetY: 0,
      radiusX: 7,
      radiusY: 5,
      feather: 1,
    };
    expect(hipMaskAlpha({ x: 0, y: 5 }, cut)).toBeCloseTo(0.5);
    expect(hipMaskAlpha({ x: 6, y: 4 }, cut)).toBe(0);
    expect(hipMaskAlpha({ x: 3, y: 4.5 }, cut)).toBe(
      hipMaskAlpha({ x: -3, y: 4.5 }, cut),
    );
  });
  it("moves the mask rather than moving the bone pivot when calibrated", () => {
    const point = { x: 0, y: 6 };
    expect(hipMaskAlpha(point, { ...defaultHipCut, offsetY: 3 })).toBe(1);
    expect(hipMaskAlpha(point, { ...defaultHipCut, offsetY: -3 })).toBe(0);
  });
  it("composites the near thigh above the pelvis and the far thigh behind it", () => {
    expect(PHOTO_LAYER_ORDER.indexOf("far-leg")).toBeLessThan(
      PHOTO_LAYER_ORDER.indexOf("pelvis"),
    );
    expect(PHOTO_LAYER_ORDER.indexOf("near-leg")).toBeGreaterThan(
      PHOTO_LAYER_ORDER.indexOf("pelvis"),
    );
    expect(PHOTO_LAYER_ORDER.indexOf("torso")).toBeGreaterThan(
      PHOTO_LAYER_ORDER.indexOf("near-leg"),
    );
  });
});
