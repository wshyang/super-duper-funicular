import { describe, expect, it } from "vitest";
import { createRaster } from "./raster.ts";
import { findDuplicateGroups, hashRasterPixels } from "./hashing.ts";

describe("hashRasterPixels", () => {
  it("is equal for identical pixels and differs for a single changed byte", () => {
    const first = createRaster(2, 2);
    const second = createRaster(2, 2);
    expect(hashRasterPixels(first)).toBe(hashRasterPixels(second));
    second.data[5] = 1;
    expect(hashRasterPixels(first)).not.toBe(hashRasterPixels(second));
  });

  it("includes dimensions, so a 4x1 and a 1x4 raster with the same bytes differ", () => {
    const wide = createRaster(4, 1);
    const tall = createRaster(1, 4);
    expect(hashRasterPixels(wide)).not.toBe(hashRasterPixels(tall));
  });
});

describe("findDuplicateGroups", () => {
  it("returns only groups with more than one path", () => {
    const groups = findDuplicateGroups([
      { path: "a.png", hash: "h1" },
      { path: "b.png", hash: "h1" },
      { path: "c.png", hash: "h2" },
    ]);
    expect(groups).toEqual([["a.png", "b.png"]]);
  });

  it("returns no groups when every artefact is unique", () => {
    expect(findDuplicateGroups([{ path: "a", hash: "1" }, { path: "b", hash: "2" }])).toEqual([]);
  });
});
