import { copyFileSync, readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { SOURCE_PATH, SOURCE_SHA256 } from '../../src/shared/constants';
import type { PixelImage } from '../../src/shared/types';
import { keyMagentaBackground } from '../../src/pipeline/chroma-key';
import { analyseExtraction } from '../../src/pipeline/analysis';
import { decodeJpeg, sha256 } from '../../src/pipeline/image-codec';
import { detectGrid } from '../../src/pipeline/grid-detect';
import { extractSpriteSheet } from '../../src/pipeline/extractor';
import { runPipeline } from '../../src/pipeline/run-pipeline';

const sourcePath = resolve(process.cwd(), SOURCE_PATH);
let sourceBytes: Buffer;
let source: PixelImage;
let extraction: ReturnType<typeof extractSpriteSheet>;

beforeAll(() => {
  sourceBytes = readFileSync(sourcePath);
  source = decodeJpeg(sourceBytes);
  extraction = extractSpriteSheet(source, sourceBytes);
});

describe('reference-sheet decoding and detection', () => {
  it('preserves the source and records its pinned dimensions and hash', () => {
    expect(sha256(sourceBytes)).toBe(SOURCE_SHA256);
    expect(source.width).toBe(2528);
    expect(source.height).toBe(1696);
  });

  it('detects the six-by-eight grid from the actual JPEG pixels', () => {
    const grid = detectGrid(source);
    expect(grid.rows).toBe(6);
    expect(grid.columns).toBe(8);
    expect(grid.headerPx).toBeGreaterThan(80);
    expect(grid.headerPx).toBeLessThan(170);
    expect(grid.cellWidth).toBe(316);
    expect(grid.cellHeight).toBeGreaterThan(250);
    expect(grid.cellHeight).toBeLessThanOrEqual(262);
  });
});

describe('magenta key and extraction', () => {
  it('removes connected magenta while retaining a purple foreground', () => {
    const width = 32;
    const height = 24;
    const data = new Uint8Array(width * height * 4);
    for (let pixel = 0; pixel < width * height; pixel += 1) {
      data[pixel * 4] = 255;
      data[pixel * 4 + 1] = 0;
      data[pixel * 4 + 2] = 255;
      data[pixel * 4 + 3] = 255;
    }
    for (let y = 4; y < 20; y += 1) {
      for (let x = 7; x < 25; x += 1) {
        if (x !== 7 && x !== 24 && y !== 4 && y !== 19) continue;
        const offset = (y * width + x) * 4;
        data[offset] = 145;
        data[offset + 1] = 81;
        data[offset + 2] = 145;
      }
    }
    for (let y = 5; y < 19; y += 1) {
      for (let x = 8; x < 24; x += 1) {
        if (x !== 8 && x !== 23 && y !== 5 && y !== 18) continue;
        const offset = (y * width + x) * 4;
        data[offset] = 25;
        data[offset + 1] = 18;
        data[offset + 2] = 25;
      }
    }
    for (let y = 6; y < 18; y += 1) {
      for (let x = 9; x < 23; x += 1) {
        const offset = (y * width + x) * 4;
        data[offset] = 126;
        data[offset + 1] = 42;
        data[offset + 2] = 169;
      }
    }
    const keyed = keyMagentaBackground({ width, height, data });
    expect(keyed.image.data[3]).toBe(0);
    expect(keyed.image.data[(10 * width + 7) * 4 + 3]).toBe(0);
    expect(keyed.image.data[(10 * width + 8) * 4 + 3]).toBe(255);
    expect(keyed.image.data[(12 * width + 16) * 4 + 3]).toBe(255);
    expect(keyed.magentaSpill).toBe(0);
  });

  it('emits all registered source cells and preserves violet pixels', () => {
    expect(extraction.frames).toHaveLength(48);
    expect(extraction.manifest.frames).toHaveLength(48);
    expect(extraction.manifest.source.sha256).toBe(SOURCE_SHA256);
    expect(extraction.manifest.grid.rows).toBe(6);
    expect(extraction.manifest.grid.columns).toBe(8);
    expect(extraction.frames.every((frame) => frame.image.data[3] === 0)).toBe(true);
    expect(extraction.frames.reduce((sum, frame) => sum + frame.record.magentaSpill, 0)).toBe(0);
    const violetFrames = extraction.frames.filter((frame) => frame.record.palette === 'purple');
    const retainedVioletPixels = violetFrames.flatMap(({ image }) => {
      const pixels: number[] = [];
      for (let index = 0; index < image.width * image.height; index += 1) {
        const offset = index * 4;
        const red = image.data[offset] ?? 0;
        const green = image.data[offset + 1] ?? 0;
        const blue = image.data[offset + 2] ?? 0;
        if (
          (image.data[offset + 3] ?? 0) > 127 &&
          red > 75 &&
          red < 190 &&
          green < 120 &&
          blue > 100
        ) {
          pixels.push(index);
        }
      }
      return pixels;
    });
    expect(retainedVioletPixels.length).toBeGreaterThan(500);
  });

  it('reports source-sheet measurements without deleting near-duplicate cells', () => {
    const analysis = analyseExtraction(extraction);
    expect(analysis.frameCount).toBe(48);
    expect(analysis.paletteCount).toBe(6);
    expect(analysis.rows).toHaveLength(6);
    expect(analysis.frames).toHaveLength(48);
    expect(analysis.rows.some((row) => row.nearDuplicatePairs.length > 0)).toBe(true);
    expect(extraction.frames).toHaveLength(48);
  });
});

describe('reproducible pipeline output', () => {
  it('writes byte-identical PNGs and manifests on repeat runs against the real JPEG', () => {
    const root = mkdtempSync(join(tmpdir(), 'funicular-pipeline-'));
    const relativeSource = join(root, SOURCE_PATH);
    try {
      copyFileSync(sourcePath, relativeSource);
      runPipeline(root);
      const output = join(root, 'public', 'sprites');
      const firstManifest = readFileSync(join(output, 'manifest.json'));
      const firstAnalysis = readFileSync(join(output, 'analysis.json'));
      const firstFiles = listFiles(output);
      runPipeline(root);
      expect(readFileSync(join(output, 'manifest.json'))).toEqual(firstManifest);
      expect(readFileSync(join(output, 'analysis.json'))).toEqual(firstAnalysis);
      expect(listFiles(output)).toEqual(firstFiles);
      expect(firstFiles.filter((path) => path.endsWith('.png'))).toHaveLength(48);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 15_000);
});

const listFiles = (root: string, prefix = ''): string[] =>
  readdirSync(root, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(root, entry.name);
      if (entry.isDirectory()) return listFiles(path, join(prefix, entry.name));
      return [join(prefix, entry.name)].sort();
    })
    .sort();
