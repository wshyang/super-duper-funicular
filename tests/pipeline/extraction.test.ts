import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { decodeJpeg, encodePng } from '../../src/lib/pipeline/image-io.ts';
import { sha256Hex } from '../../src/lib/pipeline/hashing.ts';
import { extractSheet } from '../../src/lib/pipeline/extract.ts';
import { detectSheetGeometry } from '../../src/lib/pipeline/sheet-spec.ts';
import { countOpaque } from '../../src/lib/render/raster.ts';

const SOURCE = 'src/images/source/runner-six-palette-eight-frame-flawed-sheet.jpeg';

function sheet() {
  const bytes = new Uint8Array(readFileSync(SOURCE));
  return { bytes, raster: decodeJpeg(bytes) };
}

describe('sheet forensics and registered extraction (real JPEG)', () => {
  it('detects the advertised 6×8 grid and a title band, nothing hardcoded', () => {
    const { bytes, raster } = sheet();
    const geometry = detectSheetGeometry(raster, sha256Hex(bytes));
    expect(geometry.rows).toBe(6);
    expect(geometry.columns).toBe(8);
    expect(geometry.headerHeight).toBeGreaterThan(40);
    expect(geometry.headerHeight).toBeLessThan(200);
    expect(geometry.rowTops[1]).toBeGreaterThan(geometry.rowTops[0] ?? 0);
  });

  it('extracts 48 registered cutouts with zero magenta residue', () => {
    const { bytes, raster } = sheet();
    const result = extractSheet(raster, sha256Hex(bytes));
    expect(result.frames.size).toBe(48);
    for (const stats of result.rawStats) {
      expect(stats.keyedResidue).toBe(0);
      expect(stats.naiveResidue).toBeGreaterThan(0);
    }
  });

  it('registers centroid column and ground line across the crimson row', () => {
    const { bytes, raster } = sheet();
    const result = extractSheet(raster, sha256Hex(bytes));
    const crimson = result.rawStats.filter((s) => s.palette === 'crimson');
    const frames = crimson.map((s) => result.frames.get(s.palette + '-' + String(s.frame).padStart(2, '0')));
    const grounds = frames.map((f) => groundLine(f!));
    expect(Math.max(...grounds) - Math.min(...grounds)).toBe(0);
  });

  it('is byte-reproducible across two runs', () => {
    const { bytes, raster } = sheet();
    const first = extractSheet(raster, sha256Hex(bytes));
    const second = extractSheet(decodeJpeg(bytes), sha256Hex(bytes));
    const id = 'crimson-01';
    const a = sha256Hex(encodePng(first.frames.get(id)!));
    const b = sha256Hex(encodePng(second.frames.get(id)!));
    expect(a).toBe(b);
  });

  it('keeps every cutout non-empty and inside the shared canvas', () => {
    const { bytes, raster } = sheet();
    const result = extractSheet(raster, sha256Hex(bytes));
    for (const frame of result.frames.values()) {
      expect(countOpaque(frame)).toBeGreaterThan(500);
      expect(frame.width).toBe(result.manifest.canvas.width);
    }
  });
});

function groundLine(raster: { width: number; height: number; data: Uint8ClampedArray }): number {
  let ground = -1;
  for (let y = raster.height - 1; y >= 0; y -= 1) {
    let hit = false;
    for (let x = 0; x < raster.width; x += 1) {
      if ((raster.data[(y * raster.width + x) * 4 + 3] ?? 0) > 0) {
        hit = true;
        break;
      }
    }
    if (hit) {
      ground = y;
      break;
    }
  }
  return ground;
}
