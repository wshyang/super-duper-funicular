import { describe, expect, it } from "vitest";
import { dhash64, sha256 } from "../../src/lib/pipeline/hashing.ts";
import { isMagenta, keyMagenta, meanIoU } from "../../src/lib/pipeline/chroma.ts";

describe("pipeline primitives", () => {
  it("keys magenta without eating purple-like jersey when green is high enough", () => {
    expect(isMagenta(240, 20, 240)).toBe(true);
    expect(isMagenta(120, 40, 180)).toBe(false);
  });

  it("computes IoU of identical mattes as 1", () => {
    const data = new Uint8Array([10, 10, 10, 255, 240, 10, 240, 255]);
    const keyed = keyMagenta({ width: 2, height: 1, data });
    expect(keyed.data[7]).toBe(0);
    expect(meanIoU(keyed, keyed)).toBe(1);
  });

  it("hashes bytes stably", () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    expect(sha256(bytes)).toHaveLength(64);
    expect(dhash64(2, 2, new Uint8Array(16))).toHaveLength(16);
  });
});
