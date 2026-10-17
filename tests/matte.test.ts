import { describe, expect, it } from "vitest";
import type { KeyedImage } from "../src/lib/photo/chroma.ts";
import { fabricOnly, matteRejects, purgeMatte, refillMatted } from "../src/lib/photo/matte.ts";

const plate = (rgb: readonly [number, number, number]): KeyedImage => {
  const data = new Uint8ClampedArray(4);
  data[0] = rgb[0];
  data[1] = rgb[1];
  data[2] = rgb[2];
  data[3] = 255;
  return { width: 1, height: 1, data, alpha: new Float32Array(1).fill(1) };
};

describe("colour mattes", () => {
  it("classifies skin and fabric against each matte", () => {
    const skin = plate([210, 160, 120]);
    const red = plate([200, 40, 50]);
    const navy = plate([35, 45, 75]);
    expect(matteRejects(skin.data, 0, "fabric")).toBe(true);
    expect(matteRejects(skin.data, 0, "skin")).toBe(false);
    expect(matteRejects(red.data, 0, "fabric")).toBe(false);
    expect(matteRejects(navy.data, 0, "fabric")).toBe(false);
    expect(matteRejects(red.data, 0, "skin")).toBe(true);
  });

  it("keeps only fabric when a patch plate is matted", () => {
    const image: KeyedImage = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([210, 160, 120, 255, 200, 40, 50, 255]),
      alpha: new Float32Array([1, 1]),
    };
    const only = fabricOnly(image);
    expect(only.alpha[0]).toBe(0);
    expect(only.alpha[1]).toBe(1);
    // Source untouched: the operation is pure.
    expect(image.alpha[0]).toBe(1);
  });

  it("purges pixels a region's matte rejects", () => {
    const image: KeyedImage = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([210, 160, 120, 255, 200, 40, 50, 255]),
      alpha: new Float32Array([1, 1]),
    };
    const regions = [new Uint8Array([1, 1])];
    purgeMatte(image, regions, ["fabric"]);
    expect(regions[0]).toEqual(new Uint8Array([0, 1]));
  });

  it("refills purged pixels into the matte-compatible neighbour", () => {
    // [skin][skin][red]: the fabric region wrongly owns the middle until the
    // purge drops it; the refill must hand the orphan to the skin region only.
    const image: KeyedImage = {
      width: 3,
      height: 1,
      data: new Uint8ClampedArray([210, 160, 120, 255, 210, 160, 120, 255, 200, 40, 50, 255]),
      alpha: new Float32Array([1, 1, 1]),
    };
    const regions = [new Uint8Array([0, 1, 1]), new Uint8Array([1, 0, 0])];
    purgeMatte(image, regions, ["fabric", "skin"]);
    refillMatted(image, regions, { mattes: ["fabric", "skin"] });
    expect(regions[0]).toEqual(new Uint8Array([0, 0, 1]));
    expect(regions[1]).toEqual(new Uint8Array([1, 1, 0]));
  });
});
