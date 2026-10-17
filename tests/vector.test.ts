import { describe, expect, it } from "vitest";
import { traceAlpha } from "../src/lib/vector/trace.ts";
import { rasteriseShape, silhouetteIou } from "../src/lib/vector/raster.ts";
import { svgDocument } from "../src/lib/vector/svg.ts";

const blank = (width: number, height: number): Float32Array => new Float32Array(width * height);

const rectangle = (width: number, height: number, x0: number, y0: number, x1: number, y1: number): Float32Array => {
  const alpha = blank(width, height);
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) alpha[y * width + x] = 1;
  }
  return alpha;
};

const disc = (width: number, height: number, cx: number, cy: number, radius: number): Float32Array => {
  const alpha = blank(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= radius) alpha[y * width + x] = 1;
    }
  }
  return alpha;
};

describe("raster to vector tracing", () => {
  it("closes a rectangular matte into a single contour", () => {
    const alpha = rectangle(80, 60, 12, 9, 67, 48);
    const shape = traceAlpha(alpha, 80, 60);
    expect(shape.contours).toBe(1);
    expect(shape.d.trim().startsWith("M")).toBe(true);
    expect(shape.d.trim().endsWith("Z")).toBe(true);
    expect(silhouetteIou(shape, alpha, 80, 60)).toBeGreaterThan(0.99);
  });

  it("keeps a hole as a second contour that even-odd fill leaves empty", () => {
    const alpha = rectangle(80, 60, 10, 10, 69, 49);
    for (let y = 24; y <= 35; y += 1) {
      for (let x = 30; x <= 49; x += 1) alpha[y * 80 + x] = 0;
    }
    const shape = traceAlpha(alpha, 80, 60);
    expect(shape.contours).toBe(2);
    const coverage = rasteriseShape(shape, 80, 60);
    expect(coverage[30 * 80 + 40]).toBeLessThan(0.02);
    expect(coverage[12 * 80 + 40]).toBeGreaterThan(0.98);
    expect(silhouetteIou(shape, alpha, 80, 60)).toBeGreaterThan(0.98);
  });

  it("replaces a one-pixel staircase with a handful of smooth nodes", () => {
    const alpha = disc(90, 90, 45, 45, 32);
    const shape = traceAlpha(alpha, 90, 90);
    expect(shape.contours).toBe(1);
    expect(shape.nodes).toBeLessThan(70);
    expect(shape.loops[0]?.some((command) => command.kind === "curve")).toBe(true);
    expect(silhouetteIou(shape, alpha, 90, 90)).toBeGreaterThan(0.995);
  });

  it("is deterministic, so a rebuild cannot churn the committed sprites", () => {
    const alpha = disc(70, 70, 35, 33, 24);
    const first = traceAlpha(alpha, 70, 70);
    const second = traceAlpha(alpha, 70, 70);
    expect(second.d).toBe(first.d);
    expect(second.nodes).toBe(first.nodes);
  });

  it("tightens onto the matte as the tolerance falls", () => {
    const alpha = disc(90, 90, 45, 45, 32);
    const loose = traceAlpha(alpha, 90, 90, { tolerance: 2.5 });
    const tight = traceAlpha(alpha, 90, 90, { tolerance: 0.4 });
    expect(loose.nodes).toBeLessThan(tight.nodes);
    expect(silhouetteIou(tight, alpha, 90, 90)).toBeGreaterThanOrEqual(silhouetteIou(loose, alpha, 90, 90) - 0.002);
  });
});

describe("vector sprite document", () => {
  it("clips an embedded texture with the traced path", () => {
    const svg = svgDocument("M1 1L9 1L9 9Z", 10, 12, "data:image/png;base64,AAAA");
    expect(svg).toContain('viewBox="0 0 10 12"');
    expect(svg).toContain('<clipPath id="shape"><path d="M1 1L9 1L9 9Z" fill-rule="evenodd"/></clipPath>');
    expect(svg).toContain('href="data:image/png;base64,AAAA"');
    expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
  });
});
