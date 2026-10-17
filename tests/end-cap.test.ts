import { describe, expect, it } from "vitest";
import {
  applyEndCuts,
  boneLength,
  boneLocal,
  capAlpha,
  endCutAlpha,
  type Bone,
  type PartEndCuts,
} from "../src/lib/photo/end-cap.ts";
import type { CutPart } from "../src/lib/photo/cut.ts";

/** A straight limb: the pivot at the plate origin, the bone running 100 px down. */
const BONE: Bone = { from: [300, 400], to: [300, 500] };

const cuts = (overrides: Partial<PartEndCuts> = {}): PartEndCuts => ({
  start: { enabled: true, radius: 20, blend: 10 },
  end: { enabled: true, radius: 16, blend: 10 },
  feather: 4,
  ...overrides,
});

describe("bone-local end caps", () => {
  it("measures the bone along the joint axis", () => {
    expect(boneLength(BONE)).toBe(100);
    expect(boneLocal(BONE, [310, 440])).toEqual([10, 40]);
    expect(boneLocal(BONE, [290, 400])).toEqual([-10, 0]);
  });

  it("reads the same bone on an oblique axis", () => {
    const oblique: Bone = { from: [0, 0], to: [3, 4] };
    expect(boneLength(oblique)).toBeCloseTo(5);
    // One unit along the 3-4-5 axis: transverse offset 0, along-bone 1.
    expect(boneLocal(oblique, [0.6, 0.8])).toEqual([expect.closeTo(0), expect.closeTo(1)]);
  });

  it("keeps the shaft untouched beyond the blend band", () => {
    expect(capAlpha([30, 60], cuts().start, cuts().feather)).toBe(1);
  });

  it("rounds the tip into a semicircle beyond the joint plane", () => {
    const { start, feather } = cuts();
    expect(capAlpha([0, -10], start, feather)).toBe(1);
    expect(capAlpha([0, -26], start, feather)).toBe(0);
  });

  it("removes the corner immediately inside the joint plane, which a half-plane cap misses", () => {
    const { start, feather } = cuts();
    // 25 px off-axis, 2 px inside the plane: outside the limb's own width, so
    // it is a protruding corner and must go.
    expect(capAlpha([25, 2], start, feather)).toBeLessThan(0.25);
    // Same depth, on the axis: the shaft itself, untouched.
    expect(capAlpha([0, 2], start, feather)).toBe(1);
  });

  it("restores the full shaft once the blend band is past", () => {
    const { start, feather } = cuts();
    expect(capAlpha([25, 12], start, feather)).toBe(1);
  });

  it("is symmetric across the bone axis", () => {
    const { start, feather } = cuts();
    const side = capAlpha([21, 4], start, feather);
    expect(side).toBeGreaterThan(0);
    expect(side).toBeLessThan(1);
    expect(side).toBeCloseTo(capAlpha([-21, 4], start, feather));
  });

  it("feathers when asked and cuts hard when not", () => {
    const { start } = cuts();
    const soft = capAlpha([0, -20.5], start, 4);
    expect(soft).toBeGreaterThan(0);
    expect(soft).toBeLessThan(1);
    expect(capAlpha([0, -20.5], start, 0)).toBe(0);
  });

  it("leaves the silhouette alone when an end is disabled", () => {
    expect(capAlpha([40, -40], { enabled: false, radius: 4, blend: 2 }, 4)).toBe(1);
  });

  it("caps both ends of one segment by multiplication", () => {
    const spec = cuts();
    const middle = endCutAlpha([0, 50], 100, spec);
    const bothTips = endCutAlpha([0, -26], 100, spec);
    const distalTip = endCutAlpha([0, 126], 100, spec);
    expect(middle).toBe(1);
    expect(bothTips).toBe(0);
    expect(distalTip).toBe(0);
  });

  it("gives every point on one arc about the pivot the same alpha", () => {
    const spec = cuts();
    const length = boneLength(BONE);
    // (0,-20), (12,-16) and (16,-12) all sit 20 px from the pivot, beyond the
    // joint plane. A cap that reads the same at all three is a true circle
    // about the axis, so rotating the part maps its rounded end onto itself.
    const onArc = [
      endCutAlpha([0, -20], length, spec),
      endCutAlpha([12, -16], length, spec),
      endCutAlpha([16, -12], length, spec),
    ];
    expect(onArc[0]).toBeGreaterThan(0);
    expect(onArc[0]).toBeLessThan(1);
    expect(onArc[1]).toBeCloseTo(onArc[0] ?? 0);
    expect(onArc[2]).toBeCloseTo(onArc[0] ?? 0);
  });
});

describe("applying end caps to a cut part", () => {
  /** A 50 x 120 opaque rectangle with the pivot on its top edge, 25 px in. */
  const rectangle = (): CutPart => {
    const width = 50;
    const height = 120;
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let index = 0; index < width * height; index += 1) {
      pixels[index * 4] = 200;
      pixels[index * 4 + 1] = 160;
      pixels[index * 4 + 2] = 140;
      pixels[index * 4 + 3] = 255;
    }
    return { id: "shin", x: 275, y: 400, width, height, pixels };
  };

  const bone: Bone = { from: [300, 400], to: [300, 500] };

  it("only ever removes alpha, and keeps the pivot covered", () => {
    const part = rectangle();
    const capped = applyEndCuts(part, bone, cuts());
    for (let index = 0; index < part.width * part.height; index += 1) {
      expect(capped.pixels[index * 4 + 3]).toBeLessThanOrEqual(part.pixels[index * 4 + 3] ?? 0);
    }
    expect(capped.pixels[25 * 4 + 3]).toBe(255); // the pivot pixel: crop (25, 0)
  });

  it("keeps the registered crop box and the colour data", () => {
    const part = rectangle();
    const capped = applyEndCuts(part, bone, cuts());
    expect([capped.x, capped.y, capped.width, capped.height]).toEqual([275, 400, 50, 120]);
    expect(capped.pixels[0]).toBe(200);
    expect(capped.id).toBe("shin");
  });

  it("rounds the corners the pivot swings through", () => {
    const capped = applyEndCuts(rectangle(), bone, cuts());
    const corner = capped.pixels[3]; // crop (0, 0): 25 px off the axis
    const axis = capped.pixels[(2 * 50 + 25) * 4 + 3]; // on the axis, 2 px in
    expect(corner).toBeLessThan(128);
    expect(axis).toBe(255);
  });

  it("leaves the part untouched when both ends are disabled", () => {
    const part = rectangle();
    const capped = applyEndCuts(part, bone, cuts({
      start: { enabled: false, radius: 20, blend: 10 },
      end: { enabled: false, radius: 16, blend: 10 },
    }));
    expect(capped.pixels).toEqual(part.pixels);
  });
});
