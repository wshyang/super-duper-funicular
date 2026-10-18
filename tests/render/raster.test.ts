import { describe, expect, it } from 'vitest';
import { createRaster, fillCapsule, fillCircle, fillPolygon, parseHex, countOpaque, shade } from '../../src/lib/render/raster.ts';

const RED = parseHex('#ff0000');

describe('pure-TS raster', () => {
  it('fills a circle with ≈πr² pixels', () => {
    const raster = createRaster(60, 60);
    fillCircle(raster, { x: 30, y: 30 }, 10, RED);
    const area = countOpaque(raster);
    expect(area).toBeGreaterThan(Math.PI * 100 * 0.95);
    expect(area).toBeLessThan(Math.PI * 100 * 1.05);
  });

  it('fills a capsule including both end discs', () => {
    const raster = createRaster(80, 40);
    fillCapsule(raster, { x: 20, y: 20 }, { x: 60, y: 20 }, 5, RED);
    expect(countOpaque(raster)).toBeGreaterThan(40 * 10);
    expect((raster.data[(20 * 80 + 20) * 4 + 3] ?? 0)).toBeGreaterThan(0);
  });

  it('fills a concave-free polygon with even-odd scanlines', () => {
    const raster = createRaster(40, 40);
    fillPolygon(raster, [{ x: 5, y: 5 }, { x: 35, y: 5 }, { x: 35, y: 35 }, { x: 5, y: 35 }], RED);
    expect((raster.data[(20 * 40 + 20) * 4 + 3] ?? 0)).toBe(255);
    expect((raster.data[(2 * 40 + 2) * 4 + 3] ?? 0)).toBe(0);
  });

  it('shades a hex colour toward black deterministically', () => {
    expect(shade('#808080', 0.5)).toBe('#404040');
  });

  it('clips draws outside the buffer without throwing', () => {
    const raster = createRaster(10, 10);
    fillCircle(raster, { x: 0, y: 0 }, 8, RED);
    expect(countOpaque(raster)).toBeGreaterThan(0);
  });
});
