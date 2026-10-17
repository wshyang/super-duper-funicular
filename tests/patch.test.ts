import { describe, expect, it } from "vitest";
import { capArc, type RegionImage } from "../src/lib/photo/arc-cap.ts";
import { compositeKeyed, fitSimilarity, sourceAt, warpKeyed } from "../src/lib/photo/patch.ts";
import type { KeyedImage } from "../src/lib/photo/chroma.ts";

const blank = (width: number, height: number): KeyedImage => ({
  width,
  height,
  data: new Uint8ClampedArray(width * height * 4),
  alpha: new Float32Array(width * height),
});

describe("patch registration", () => {
  it("maps both anchor pairs exactly", () => {
    const sim = fitSimilarity(
      [
        [328, 162],
        [261, 1015],
      ],
      [
        [346, 269],
        [310, 779],
      ],
    );
    for (const [from, to] of [
      [
        [328, 162],
        [346, 269],
      ],
      [
        [261, 1015],
        [310, 779],
      ],
    ] as const) {
      const x = sim.cos * sim.scale * from[0] - sim.sin * sim.scale * from[1] + sim.tx;
      const y = sim.sin * sim.scale * from[0] + sim.cos * sim.scale * from[1] + sim.ty;
      expect(x).toBeCloseTo(to[0], 6);
      expect(y).toBeCloseTo(to[1], 6);
    }
  });

  it("round-trips a point through the inverse map", () => {
    const sim = fitSimilarity(
      [
        [10, 20],
        [110, 220],
      ],
      [
        [30, 40],
        [230, 440],
      ],
    );
    const [sx, sy] = sourceAt(sim, 123, 456);
    const x = sim.cos * sim.scale * sx - sim.sin * sim.scale * sy + sim.tx;
    const y = sim.sin * sim.scale * sx + sim.cos * sim.scale * sy + sim.ty;
    expect(x).toBeCloseTo(123, 6);
    expect(y).toBeCloseTo(456, 6);
  });

  it("warps a source square to the scaled destination", () => {
    // Source: a 2x2 red square at (0,0)-(1,1). Destination doubles it.
    const patch = blank(4, 4);
    for (const [x, y] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ] as const) {
      const index = y * 4 + x;
      patch.alpha[index] = 1;
      const offset = index * 4;
      patch.data[offset] = 255;
    }
    const sim = fitSimilarity(
      [
        [0, 0],
        [0, 1],
      ],
      [
        [0, 0],
        [0, 2],
      ],
    );
    const warped = warpKeyed(patch, sim, 8, 8);
    const at = (x: number, y: number): number => warped.alpha[y * 8 + x] ?? 0;
    expect(at(0, 0)).toBeCloseTo(1, 1);
    expect(at(2, 2)).toBeCloseTo(1, 1); // maps to source (1,1): a filled corner
    expect(at(3, 3)).toBeGreaterThan(0.1); // source (1.5,1.5): the interpolated rim
    expect(at(4, 4)).toBe(0); // source (2,2): empty
    expect(at(5, 5)).toBe(0);
  });

  it("composites the patch inside the clip and keeps the base in its holes", () => {
    const base = blank(6, 6);
    base.alpha[2 * 6 + 2] = 1;
    base.data[(2 * 6 + 2) * 4 + 1] = 255;
    const patch = blank(6, 6);
    patch.alpha[1 * 6 + 1] = 1;
    patch.data[(1 * 6 + 1) * 4] = 255;
    const clip: readonly (readonly [number, number])[] = [
      [0, 0],
      [5, 0],
      [5, 5],
      [0, 5],
    ];
    const merged = compositeKeyed(base, patch, clip);
    // Patch-covered pixel becomes red.
    expect(merged.data[(1 * 6 + 1) * 4]).toBe(255);
    // The patch's transparent hole keeps the base pixel (the neck case).
    expect(merged.data[(2 * 6 + 2) * 4 + 1]).toBe(255);
    expect(merged.alpha[2 * 6 + 2]).toBe(1);
    // Outside the clip nothing changes even where the patch is opaque.
    const trimmed = compositeKeyed(base, patch, [
      [0, 0],
      [0, 0],
      [0, 0],
    ]);
    expect(trimmed.alpha[1 * 6 + 1]).toBe(0);
  });
});

describe("pivot arc caps", () => {
  const region = (width: number, height: number, points: readonly (readonly [number, number])[]): RegionImage => {
    const data = new Uint8Array(width * height);
    for (const [x, y] of points) data[y * width + x] = 1;
    return { width, height, region: data };
  };

  it("rounds the cut side to the ellipse and leaves the far side alone", () => {
    // Pivot at (10, 10), radii (6, 4), cut below.
    const image = region(21, 21, [
      [10, 6],
      [10, 10],
      [10, 14],
      [10, 16],
      [16, 14],
    ]);
    const capped = capArc(image, { pivot: [10, 10], radiusX: 6, radiusY: 4, side: "below" });
    const at = (x: number, y: number): number => capped.region[y * 21 + x] ?? 0;
    expect(at(10, 6)).toBe(1); // above the pivot: untouched
    expect(at(10, 10)).toBe(1); // the pivot itself
    expect(at(10, 14)).toBe(1); // on the ellipse's bottom
    expect(at(10, 16)).toBe(0); // beyond the ellipse: erased
    expect(at(16, 14)).toBe(0); // beyond the ellipse sideways
  });

  it("keeps a chin-like point inside a wide jaw ellipse", () => {
    // The female head's chin sits ~66 px forward and 5 px below headBase.
    const image = region(160, 120, [
      [66, 5],
      [73, 47],
      [0, 0],
    ]);
    const capped = capArc(image, { pivot: [0, 0], radiusX: 70, radiusY: 48, side: "below" });
    expect(capped.region[5 * 160 + 66]).toBe(1); // chin survives
    expect(capped.region[47 * 160 + 73]).toBe(0); // the oblique cut's far corner rounds off
  });

  it("is invariant under rotation about the pivot", () => {
    // A ragged end at various angles, capped each time: every capped pixel
    // must stay within the ellipse, which is the rotation-invariant part.
    const cap = { pivot: [20, 20] as const, radiusX: 9, radiusY: 7, side: "below" as const };
    for (const angle of [0, 0.35, -0.35, 1.2]) {
      const points: [number, number][] = [];
      for (let x = 0; x < 40; x += 1) {
        for (let y = 21; y < 40; y += 1) {
          const dx = x - 20;
          const dy = y - 20;
          const rx = dx * Math.cos(angle) - dy * Math.sin(angle);
          const ry = dx * Math.sin(angle) + dy * Math.cos(angle);
          points.push([20 + Math.round(rx), 20 + Math.round(ry)]);
        }
      }
      const capped = capArc(region(40, 40, points), cap);
      for (let x = 0; x < 40; x += 1) {
        for (let y = 21; y < 40; y += 1) {
          if ((capped.region[y * 40 + x] ?? 0) === 0) continue;
          const dist = Math.hypot((x - 20) / 9, (y - 20) / 7);
          expect(dist).toBeLessThanOrEqual(1.001);
        }
      }
    }
  });
});
