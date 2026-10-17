import { describe, expect, it } from "vitest";
import { RUNNER_VARIANTS, findVariant } from "./palette.ts";
import { defaultRequest, renderRunnerFrame, renderRunnerWithSkeleton, RUNNER_SCREEN } from "./render-frame.ts";
import { containsPoint, circle, capsule, polygon } from "./shapes.ts";
import { paintLayer } from "./rasterize.ts";
import { paintOp } from "./paint-op.ts";
import { vec } from "./vector.ts";

function countPixelsWithColor(raster: { data: Uint8Array }, color: readonly [number, number, number]): number {
  let count = 0;
  for (let index = 0; index < raster.data.length; index += 4) {
    if (raster.data[index] === color[0] && raster.data[index + 1] === color[1] && raster.data[index + 2] === color[2] && raster.data[index + 3] === 255) {
      count += 1;
    }
  }
  return count;
}

function opaqueCount(raster: { data: Uint8Array }): number {
  let count = 0;
  for (let index = 3; index < raster.data.length; index += 4) if (raster.data[index] !== 0) count += 1;
  return count;
}

describe("shapes", () => {
  it("tests circles, capsules and polygons", () => {
    expect(containsPoint(circle(vec(0, 0), 1), vec(0.5, 0.5))).toBe(true);
    expect(containsPoint(circle(vec(0, 0), 1), vec(1, 1))).toBe(false);
    expect(containsPoint(capsule(vec(0, 0), vec(10, 0), 1, 1), vec(5, 0.9))).toBe(true);
    expect(containsPoint(capsule(vec(0, 0), vec(10, 0), 1, 1), vec(5, 1.5))).toBe(false);
    const square = polygon([vec(0, 0), vec(4, 0), vec(4, 4), vec(0, 4)]);
    expect(containsPoint(square, vec(2, 2))).toBe(true);
    expect(containsPoint(square, vec(5, 2))).toBe(false);
  });
});

describe("paintLayer", () => {
  it("paints later ops over earlier ones", () => {
    const frame = { width: 8, height: 8, scale: 1, originX: 4, groundRow: 8 };
    const raster = paintLayer(frame, [
      paintOp(circle(vec(0, 2), 3), [10, 10, 10]),
      paintOp(circle(vec(0, 2), 1), [200, 0, 0]),
    ]);
    const centre = (8 - 2 - 1) * 8 * 4 + 4 * 4;
    expect(raster.data[centre]).toBe(200);
  });
});

describe("renderRunnerFrame", () => {
  const variant = findVariant("red");

  it("produces a frame of the configured screen size", () => {
    const raster = renderRunnerFrame(defaultRequest(0.1, variant));
    expect(raster.width).toBe(RUNNER_SCREEN.width);
    expect(raster.height).toBe(RUNNER_SCREEN.height);
  });

  it("paints a substantial figure, not an empty or nearly empty frame", () => {
    const raster = renderRunnerFrame(defaultRequest(0.1, variant));
    expect(opaqueCount(raster)).toBeGreaterThan(1800);
  });

  it("uses the variant's accent colour for the shirt and socks", () => {
    const raster = renderRunnerFrame(defaultRequest(0.1, variant));
    expect(countPixelsWithColor(raster, variant.accent)).toBeGreaterThan(150);
  });

  it("gives every variant a distinct accent colour, so variants are palette swaps of one rig", () => {
    const accents = new Set(RUNNER_VARIANTS.map((candidate) => candidate.accent.join(",")));
    expect(accents.size).toBe(RUNNER_VARIANTS.length);
  });

  it("produces different pixels at different phases", () => {
    const first = renderRunnerFrame(defaultRequest(0.05, variant));
    const second = renderRunnerFrame(defaultRequest(0.3, variant));
    expect(Buffer.compare(Buffer.from(first.data), Buffer.from(second.data))).not.toBe(0);
  });

  it("repeats its pixels after one full cycle", () => {
    const first = renderRunnerFrame(defaultRequest(0.3, variant));
    const again = renderRunnerFrame(defaultRequest(1.3, variant));
    expect(Buffer.compare(Buffer.from(first.data), Buffer.from(again.data))).toBe(0);
  });

  it("draws the skeleton overlay on top without losing the figure", () => {
    const body = renderRunnerFrame(defaultRequest(0.2, variant));
    const withRig = renderRunnerWithSkeleton(defaultRequest(0.2, variant));
    expect(opaqueCount(withRig)).toBeGreaterThanOrEqual(opaqueCount(body));
  });
});
