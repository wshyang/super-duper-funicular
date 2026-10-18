import { describe, expect, it } from 'vitest';
import type { RasterImage } from '../shared/types.js';
import { createRaster, fillRaster, writePixel } from './raster.js';
import {
  estimateBackgroundColor,
  evaluateKeyGate,
  findLowestFigureEdge,
  measureBackgroundUniformity,
  measureFloorShadow,
  measureSoleEdgeContrast,
} from './pose-key-metrics.js';

const MAGENTA = { r: 255, g: 0, b: 255, a: 255 };
const SHADOW = { r: 110, g: 5, b: 105, a: 255 };
const SHOE = { r: 245, g: 245, b: 245, a: 255 };

function flatRaster(width = 200, height = 120): RasterImage {
  const raster = createRaster(width, height);
  fillRaster(raster, MAGENTA);
  return raster;
}

describe('pose-key-metrics', () => {
  it('estimates the backdrop color from corners and reports a flat field', () => {
    const raster = flatRaster();
    expect(estimateBackgroundColor(raster)).toMatchObject({ r: 255, g: 0, b: 255 });
    const uniformity = measureBackgroundUniformity(raster);
    expect(uniformity.sampleCount).toBeGreaterThan(0);
    expect(uniformity.stdDev).toBe(0);
  });

  it('detects gradient/noise in the margin field', () => {
    const raster = flatRaster();
    for (let y = 0; y < raster.height; y++) {
      for (let x = 0; x < 16; x++) {
        writePixel(raster, { x, y }, { r: 255, g: Math.min(255, y * 2), b: 255, a: 255 });
      }
    }
    expect(measureBackgroundUniformity(raster).stdDev).toBeGreaterThan(12);
  });

  it('finds floor shadow only inside the bottom band', () => {
    const raster = flatRaster();
    for (let y = 104; y < 114; y++) {
      for (let x = 90; x < 110; x++) writePixel(raster, { x, y }, SHADOW);
    }
    // A dark figure pixel near the top must not count as floor shadow.
    writePixel(raster, { x: 100, y: 10 }, { r: 10, g: 10, b: 10, a: 255 });
    const shadow = measureFloorShadow(raster);
    expect(shadow.pixelCount).toBe(200);
    expect(shadow.boundingBox).toMatchObject({ minX: 90, maxX: 109, minY: 104, maxY: 113 });
    expect(measureFloorShadow(flatRaster()).pixelCount).toBe(0);
  });

  it('measures the sole-edge luminance step at the annotated location', () => {
    const raster = flatRaster();
    for (let y = 60; y < 80; y++) {
      for (let x = 90; x < 110; x++) writePixel(raster, { x, y }, SHOE);
    }
    const edge = measureSoleEdgeContrast(raster, 100, 9, 50, 100);
    expect(edge.contrast).toBeGreaterThan(40);
    expect(edge.edgeY).not.toBeNull();
    expect(measureSoleEdgeContrast(flatRaster(), 100, 9, 50, 100).contrast).toBe(0);
  });

  it('applies detached-shadow flight gates and sole-edge contact gates', () => {
    const flat = measureBackgroundUniformity(flatRaster());
    const noShadow = measureFloorShadow(flatRaster());
    expect(evaluateKeyGate(flat, noShadow, 'flight').pass).toBe(true);
    // Detached soft shadow: keyable, flight passes.
    const detached = flatRaster();
    for (let y = 104; y < 114; y++) {
      for (let x = 90; x < 110; x++) writePixel(detached, { x, y }, SHADOW);
    }
    const soft = measureFloorShadow(detached);
    expect(soft.contactPixelCount).toBe(0);
    expect(evaluateKeyGate(flat, soft, 'flight').pass).toBe(true);
    // Shadow touching the figure fails flight.
    const touching = flatRaster();
    for (let y = 104; y < 114; y++) {
      for (let x = 90; x < 110; x++) writePixel(touching, { x, y }, SHADOW);
    }
    for (let y = 90; y < 105; y++) {
      for (let x = 95; x < 105; x++) writePixel(touching, { x, y }, SHOE);
    }
    expect(measureFloorShadow(touching).contactPixelCount).toBeGreaterThan(0);
    expect(evaluateKeyGate(flat, measureFloorShadow(touching), 'flight').pass).toBe(false);
    // Contact frames gate on the sole edge, not the patch size.
    const edge = { contrast: 120, edgeY: 100 };
    expect(evaluateKeyGate(flat, soft, 'contact', edge).pass).toBe(true);
    expect(evaluateKeyGate(flat, soft, 'contact').pass).toBe(false);
    expect(evaluateKeyGate(flat, soft, 'contact', { contrast: 10, edgeY: 100 }).pass).toBe(false);
  });

  it('finds the lowest figure edge for automatic sole location', () => {
    const raster = flatRaster();
    for (let y = 60; y < 80; y++) {
      for (let x = 90; x < 110; x++) writePixel(raster, { x, y }, SHOE);
    }
    expect(findLowestFigureEdge(raster)).toMatchObject({ soleBottomY: 79 });
    expect(findLowestFigureEdge(flatRaster())).toBeNull();
  });
});
