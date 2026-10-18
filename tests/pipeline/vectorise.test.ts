import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodeImage, type DecodedImage } from '../../src/pipeline/image-codec.ts';
import { quantiseImage } from '../../src/pipeline/quantise.ts';
import { contoursOfMask, polygonArea } from '../../src/pipeline/trace.ts';
import { vectoriseImage } from '../../src/pipeline/vectorise.ts';
import { measureFidelity, rasteriseVector } from '../../src/pipeline/vector-eval.ts';

const ROOT = join(__dirname, '..', '..');

const blank = (width: number, height: number): DecodedImage => ({
  width,
  height,
  data: new Uint8ClampedArray(width * height * 4),
});

const paint = (
  image: DecodedImage,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
): void => {
  const offset = (y * image.width + x) * 4;
  image.data[offset] = r;
  image.data[offset + 1] = g;
  image.data[offset + 2] = b;
  image.data[offset + 3] = 255;
};

const circleImage = (): DecodedImage => {
  const image = blank(64, 64);
  for (let y = 0; y < 64; y += 1) {
    for (let x = 0; x < 64; x += 1) {
      if (Math.hypot(x - 32, y - 32) <= 20) paint(image, x, y, 200, 40, 30);
    }
  }
  return image;
};

const stripeImage = (): DecodedImage => {
  const image = blank(30, 10);
  for (let y = 0; y < 10; y += 1) {
    for (let x = 0; x < 30; x += 1) {
      if (x < 10) paint(image, x, y, 220, 30, 30);
      else if (x < 20) paint(image, x, y, 30, 120, 220);
      else paint(image, x, y, 30, 180, 60);
    }
  }
  return image;
};

describe('colour quantisation', () => {
  it('recovers the three flat colours of a synthetic sheet', () => {
    const quantised = quantiseImage(stripeImage(), 6);
    expect(quantised.palette.length).toBe(3);
    expect(quantised.counts.reduce((sum, count) => sum + count, 0)).toBe(300);
    expect(quantised.labels[0]).toBeGreaterThanOrEqual(0);
    expect(new Set(quantised.labels).size).toBe(3);
  });
});

describe('marching-squares contours', () => {
  it('traces a filled square as one closed loop of the right area', () => {
    const mask = new Uint8Array(20 * 20);
    for (let y = 5; y < 15; y += 1) for (let x = 5; x < 15; x += 1) mask[y * 20 + x] = 1;
    const loops = contoursOfMask(mask, 20, 20, { tolerance: 0.1, minArea: 0 });
    expect(loops.length).toBe(1);
    expect(polygonArea(loops[0] as { x: number; y: number }[])).toBeCloseTo(99.5, 1);
    expect((loops[0] as unknown[]).length).toBeLessThanOrEqual(12);
  });

  it('returns no loops for an empty mask', () => {
    expect(contoursOfMask(new Uint8Array(64), 8, 8)).toEqual([]);
  });
});

describe('pure-SVG vector output', () => {
  it('emits a self-contained SVG for a synthetic circle', () => {
    const vector = vectoriseImage(circleImage(), { maxColors: 4, tolerance: 0.3 });
    expect(vector.svg.startsWith('<?xml')).toBe(true);
    expect(vector.svg).toContain('viewBox="0 0 64 64"');
    expect(vector.svg).toContain('fill-rule="evenodd"');
    expect(vector.svg).not.toContain('data:image');
    expect(vector.bands.length).toBe(1);
  });

  it('re-rasterises to at least 93% mask overlap on the synthetic circle', () => {
    const image = circleImage();
    const vector = vectoriseImage(image, { maxColors: 4, tolerance: 0.3 });
    const fidelity = measureFidelity(quantiseImage(image, 4), rasteriseVector(vector));
    expect(fidelity.maskIou).toBeGreaterThan(0.93);
    expect(fidelity.colourAgreement).toBeGreaterThan(0.95);
  });

  it('is deterministic for identical input', () => {
    const image = circleImage();
    expect(vectoriseImage(image).svg).toBe(vectoriseImage(image).svg);
  });

  it('traces a real extracted frame above 0.9 IoU', () => {
    const path = join(ROOT, 'public/sprites/reference/red/frame-01.png');
    const image = decodeImage(readFileSync(path), 'png');
    const vector = vectoriseImage(image, { maxColors: 14, tolerance: 0.3, minArea: 2 });
    const fidelity = measureFidelity(quantiseImage(image, 14), rasteriseVector(vector));
    expect(vector.bands.length).toBeGreaterThanOrEqual(8);
    expect(vector.pointCount).toBeGreaterThan(500);
    expect(fidelity.maskIou).toBeGreaterThan(0.9);
    expect(fidelity.colourAgreement).toBeGreaterThan(0.85);
  });
});
