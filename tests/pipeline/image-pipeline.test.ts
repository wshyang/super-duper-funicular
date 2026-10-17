import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodeImage, cropImage, alphaBounds } from '../../src/pipeline/image-codec.ts';
import { dHash64, hammingDistance, pixelSha256, sha256 } from '../../src/pipeline/hashes.ts';
import { detectGrid, cellRect } from '../../src/pipeline/grid-detect.ts';
import { keyMagentaBackground, countMagentaSpill } from '../../src/pipeline/chroma-key.ts';
import { centroidAlignedIou, footClusters, silhouetteOf } from '../../src/pipeline/silhouette.ts';
import { analyseExtraction } from '../../src/pipeline/analysis.ts';
import { decodeSource, extractFrames } from '../../src/pipeline/extractor.ts';

const ROOT = join(__dirname, '..', '..');
const SOURCE = join(ROOT, 'src/images/source/runner-8frame-6-colorways-source.jpeg');

const synthetic = (
  width: number,
  height: number,
): { width: number; height: number; data: Uint8ClampedArray } => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    data[index * 4] = 255;
    data[index * 4 + 1] = 0;
    data[index * 4 + 2] = 255;
    data[index * 4 + 3] = 255;
  }
  for (let y = 10; y < height - 10; y += 1) {
    for (let x = 10; x < width - 10; x += 1) {
      data[(y * width + x) * 4] = 40;
      data[(y * width + x) * 4 + 1] = 120;
      data[(y * width + x) * 4 + 2] = 60;
    }
  }
  return { width, height, data };
};

describe('image codecs and hashes', () => {
  it('decodes the committed source JPEG deterministically', () => {
    const buffer = readFileSync(SOURCE);
    const image = decodeImage(buffer, 'jpeg');
    expect(image.width).toBe(2528);
    expect(image.height).toBe(1696);
    expect(sha256(buffer)).toHaveLength(64);
    expect(pixelSha256(image)).toBe(pixelSha256(decodeImage(buffer, 'jpeg')));
  });

  it('gives similar images small dHash distances and different images larger ones', () => {
    const base = synthetic(120, 80);
    const hashA = dHash64(base);
    const hashB = dHash64(synthetic(120, 80));
    expect(hammingDistance(hashA, hashB)).toBe(0);
    const different = dHash64({
      ...synthetic(120, 80),
      data: synthetic(120, 80).data.map((value, index) => (index % 4 === 3 ? value : 255 - value)),
    });
    expect(hammingDistance(hashA, different)).toBeGreaterThan(0);
  });

  it('crops and measures alpha bounds', () => {
    const image = synthetic(30, 20);
    const crop = cropImage(image, { x: 5, y: 5, width: 10, height: 10 });
    expect(crop.width).toBe(10);
    const bounds = alphaBounds(crop);
    expect(bounds.minX).toBeGreaterThanOrEqual(0);
  });
});

const syntheticSheet = (
  rows: number,
  columns: number,
): { width: number; height: number; data: Uint8ClampedArray } => {
  const cell = 60;
  const width = columns * cell;
  const height = rows * cell;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    data[index * 4] = 255;
    data[index * 4 + 1] = 0;
    data[index * 4 + 2] = 255;
    data[index * 4 + 3] = 255;
  }
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const heightScale = 0.6 + 0.1 * row + 0.02 * column;
      const bodyHeight = Math.round(cell * heightScale);
      for (let y = row * cell + (cell - bodyHeight); y < (row + 1) * cell - 4; y += 1) {
        for (let x = column * cell + 14; x < (column + 1) * cell - 14; x += 1) {
          data[(y * width + x) * 4] = 40;
          data[(y * width + x) * 4 + 1] = 120;
          data[(y * width + x) * 4 + 2] = 60;
        }
      }
    }
  }
  return { width, height, data };
};

describe('grid detection', () => {
  it('detects rows and columns from a synthetic magenta sheet', () => {
    const grid = detectGrid(syntheticSheet(3, 4));
    expect(grid.rows).toBe(3);
    expect(grid.columns).toBe(4);
    expect(grid.headerPx).toBeGreaterThanOrEqual(0);
    expect(grid.headerPx).toBeLessThan(grid.cellHeight);
  });

  it('detects the committed sheet as six rows of eight columns', () => {
    const set = extractFrames(decodeSource(SOURCE), SOURCE);
    expect(set.grid.rows).toBe(6);
    expect(set.grid.columns).toBe(8);
    expect(set.grid.headerPx).toBeGreaterThan(100);
    expect(set.frames).toHaveLength(48);
    const cell = cellRect(set.grid, 2, 3);
    expect(cell.y).toBe(set.grid.headerPx + 2 * set.grid.cellHeight);
  });
});

describe('chroma key and silhouettes', () => {
  it('keys the magenta border while preserving the interior subject', () => {
    const result = keyMagentaBackground(synthetic(60, 50));
    const corner = result.image.data[0 + 3] ?? 255;
    const center = result.image.data[(25 * 60 + 30) * 4 + 3] ?? 0;
    expect(corner).toBe(0);
    expect(center).toBe(255);
    expect(countMagentaSpill(result.image)).toBe(0);
  });

  it('measures silhouette area, bounds and centroid', () => {
    const keyed = keyMagentaBackground(synthetic(40, 40)).image;
    const silhouette = silhouetteOf(keyed);
    expect(silhouette.area).toBeGreaterThan(0);
    expect(silhouette.bounds.minX).toBe(10);
    expect(silhouette.centroid.x).toBeGreaterThan(19);
    expect(centroidAlignedIou(silhouette, silhouette)).toBeCloseTo(1, 6);
  });

  it('reports two foot clusters for a wide stance', () => {
    const data = new Uint8ClampedArray(100 * 100 * 4);
    for (let y = 40; y < 60; y += 1) {
      for (let x = 5; x < 25; x += 1) data[(y * 100 + x) * 4 + 3] = 255;
      for (let x = 70; x < 90; x += 1) data[(y * 100 + x) * 4 + 3] = 255;
    }
    const clusters = footClusters(silhouetteOf({ width: 100, height: 100, data }));
    expect(clusters.centers).toHaveLength(2);
    expect(clusters.separation).toBeCloseTo(65, 0);
  });
});

describe('real-sheet flaw analysis', () => {
  it('quantifies duplication, lock and jitter from real pixels', () => {
    const set = extractFrames(decodeSource(SOURCE), SOURCE);
    const analysis = analyseExtraction(set);
    expect(analysis.frameCount).toBe(48);
    expect(analysis.duplicatePairs.length).toBeGreaterThanOrEqual(12);
    expect(analysis.meanDuplicateIou).toBeGreaterThan(0.9);
    expect(analysis.leadLegLockRatio).toBeGreaterThan(0.8);
    expect(analysis.scaleJitterPx).toBeGreaterThan(5);
    expect(analysis.minFootSeparationPx).toBeGreaterThan(0);
    expect(analysis.findings).toHaveLength(5);
  });
});
