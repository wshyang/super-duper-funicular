import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { detectAccent } from "../src/lib/pipeline/accent.ts";
import { labelComponents } from "../src/lib/pipeline/components.ts";
import { readImage } from "../src/lib/pipeline/decode.ts";
import { isKeyBlend, magentaScore } from "../src/lib/pipeline/keying.ts";
import { detectSheet } from "../src/lib/pipeline/sheet.ts";
import { cutCell, estimateCoverage, magentaLeak, poseSignatureVector, registerSprites, signatureDistance } from "../src/lib/pipeline/sprite-cut.ts";

const SOURCE = resolve("src/images/source/runner-sheet__8frame-alternating-gait__6-colorways__source.jpeg");

// These tests read the real artwork. No mocks: a mocked sheet would hide
// exactly the failures (grid drift, magenta fringes) this pipeline exists to fix.
const image = await readImage(SOURCE);
const layout = detectSheet(image);
const sprites = layout.cells.map((cell) => cutCell(image, cell, layout.labels));

describe("source sheet", () => {
  it("is the 2528x1696 artwork", () => {
    expect(image.width).toBe(2528);
    expect(image.height).toBe(1696);
  });

  it("is recovered as 6 colourways of 8 frames", () => {
    expect(layout.rows).toBe(6);
    expect(layout.columns).toBe(8);
    expect(layout.cells).toHaveLength(48);
  });

  it("finds one figure per cell, none merged and none split", () => {
    for (const cell of layout.cells) {
      expect(cell.componentIds).toHaveLength(1);
    }
  });

  it("places every figure in a distinct row and column", () => {
    const keys = layout.cells.map((cell) => `${cell.row}:${cell.column}`);
    expect(new Set(keys).size).toBe(48);
  });
});

describe("colour keying", () => {
  it("scores the background magenta as background", () => {
    expect(magentaScore(253, 74, 253)).toBe(1);
  });

  it("scores the artwork colours as foreground", () => {
    expect(magentaScore(0xd2, 0x84, 0x5a)).toBe(0);
    expect(magentaScore(0x30, 0x3c, 0x54)).toBe(0);
    expect(magentaScore(0x24, 0x2b, 0x42)).toBe(0);
    expect(magentaScore(0x48, 0x24, 0x06)).toBe(0);
  });

  it("leaves no magenta-like opaque pixel in any cut-out", () => {
    const leaks = sprites.map((sprite) => magentaLeak(sprite.rgba));
    expect(leaks.every((leak) => leak === 0)).toBe(true);
  });

  it("flags the purple kit as artwork, not as a key blend", () => {
    expect(isKeyBlend(0x80, 0x30, 0x9c)).toBe(false);
    expect(isKeyBlend(0xc8, 0x28, 0x2c)).toBe(false);
    expect(isKeyBlend(210, 132, 90)).toBe(false);
  });

  it("flags both bright magenta and the dark ringing JPEG leaves on edges", () => {
    expect(isKeyBlend(253, 74, 253)).toBe(true);
    expect(isKeyBlend(53, 0, 56)).toBe(true);
    expect(isKeyBlend(150, 30, 148)).toBe(true);
  });

  it("recovers the ink coverage of a blended edge pixel by projection", () => {
    const art = { r: 0xd2, g: 0x84, b: 0x5a };
    const key = { r: 253, g: 74, b: 253 };
    const blended = {
      r: Math.round(art.r * 0.5 + key.r * 0.5),
      g: Math.round(art.g * 0.5 + key.g * 0.5),
      b: Math.round(art.b * 0.5 + key.b * 0.5),
    };
    expect(estimateCoverage(blended, art)).toBeCloseTo(0.5, 1);
  });

  it("leaves almost no magenta on the anti-aliased edge of the real cut-outs", () => {
    let edgePixels = 0;
    let magentaEdges = 0;
    for (const sprite of sprites) {
      for (let index = 0; index < sprite.width * sprite.height; index += 1) {
        const alpha = sprite.rgba[index * 4 + 3] ?? 0;
        if (alpha < 16 || alpha > 240) continue;
        edgePixels += 1;
        if (isKeyBlend(sprite.rgba[index * 4] ?? 0, sprite.rgba[index * 4 + 1] ?? 0, sprite.rgba[index * 4 + 2] ?? 0)) {
          magentaEdges += 1;
        }
      }
    }
    expect(edgePixels).toBeGreaterThan(10_000);
    expect(magentaEdges / edgePixels).toBeLessThan(0.005);
  });
});

describe("sprite crops", () => {
  it("keeps every cut-out inside its own cell", () => {
    for (const sprite of sprites) {
      expect(sprite.width).toBeGreaterThan(100);
      expect(sprite.height).toBeGreaterThan(150);
      expect(sprite.width).toBeLessThan(240);
      expect(sprite.height).toBeLessThan(260);
    }
  });

  it("detects the accent colour of each row from the artwork", () => {
    const accents = [0, 1, 2, 3, 4, 5].map((row) => {
      const cells = layout.cells.filter((cell) => cell.row === row);
      const first = cells[0] as (typeof layout.cells)[number];
      const sprite = cutCell(image, first, layout.labels);
      return detectAccent({ width: sprite.width, height: sprite.height, data: sprite.rgba });
    });
    expect(accents.map((accent) => accent.name)).toEqual(["red", "blue", "green", "yellow", "purple", "orange"]);
  });

  it("registers all 48 sprites on one shared canvas", () => {
    const registration = registerSprites(sprites);
    expect(registration.frames).toHaveLength(48);
    expect(registration.width).toBeGreaterThan(200);
    for (const frame of registration.frames) {
      expect(frame.rgba.length).toBe(registration.width * registration.height * 4);
    }
  });

  it("aligns every registered pelvis to the same column", () => {
    const registration = registerSprites(sprites);
    const columns = sprites.map((sprite, index) => sprite.metrics.pelvisX + (registration.frames[index]?.offsetX ?? 0));
    expect(Math.max(...columns) - Math.min(...columns)).toBeLessThanOrEqual(1);
  });
});

describe("pose signatures", () => {
  it("reports frames 1 and 5 as the same pose and frames 1 and 2 as different", () => {
    const signatures = sprites.slice(0, 8).map((sprite) => poseSignatureVector(sprite.rgba, sprite.width, sprite.height));
    expect(signatureDistance(signatures[0] as number[], signatures[4] as number[])).toBeLessThan(0.05);
    expect(signatureDistance(signatures[0] as number[], signatures[1] as number[])).toBeGreaterThan(0.15);
  });

  it("is translated with the sprite, not tied to absolute pixels", () => {
    const sprite = sprites[0];
    if (sprite === undefined) throw new Error("missing sprite");
    const padded = new Uint8ClampedArray((sprite.width + 20) * (sprite.height + 20) * 4);
    for (let y = 0; y < sprite.height; y += 1) {
      const from = y * sprite.width * 4;
      const to = ((y + 10) * (sprite.width + 20) + 10) * 4;
      padded.set(sprite.rgba.subarray(from, from + sprite.width * 4), to);
    }
    const a = poseSignatureVector(sprite.rgba, sprite.width, sprite.height);
    const b = poseSignatureVector(padded, sprite.width + 20, sprite.height + 20);
    expect(signatureDistance(a, b)).toBe(0);
  });
});

describe("connected components", () => {
  it("separates two disjoint blobs and ignores specks below the minimum area", () => {
    const width = 20;
    const height = 10;
    const isOn = (x: number, y: number) => (x < 4 && y < 4) || (x > 14 && y > 5) || (x === 10 && y === 2);
    const result = labelComponents(isOn, width, height, 4);
    expect(result.components).toHaveLength(2);
    expect(result.components.map((component) => component.area).sort()).toEqual([16, 20]);
  });

  it("joins diagonal neighbours, because sprite outlines are anti-aliased", () => {
    const isOn = (x: number, y: number) => x === y;
    const result = labelComponents(isOn, 8, 8, 1);
    expect(result.components).toHaveLength(1);
  });
});
