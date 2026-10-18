import { describe, expect, it } from 'vitest';
import { DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC } from '../runner/body-proportions.js';
import { solveArticulatedPose } from '../runner/gait.js';
import { readPixel } from './raster.js';
import {
  GUIDE_V2_COLORS,
  computeGuideV2Transform,
  renderPoseGuideRaster,
  renderPoseGuideRasterV2,
} from './pose-guide-renderer.js';

describe('renderPoseGuideRaster', () => {
  it('renders a high-resolution pose guide with distinct near/far limb colors', () => {
    const pose = solveArticulatedPose(0.25, DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC);
    const raster = renderPoseGuideRaster(pose, DEFAULT_RIG_SPEC, { width: 420, height: 240 });
    const colors = new Set<string>();
    for (let index = 0; index < raster.data.length; index += 4) {
      colors.add(`${raster.data[index]},${raster.data[index + 1]},${raster.data[index + 2]}`);
    }
    expect(raster.width).toBe(420);
    expect(raster.height).toBe(240);
    expect(colors.has('0,143,224')).toBe(true);
    expect(colors.has('239,119,36')).toBe(true);
    expect(colors.has('239,242,247')).toBe(true);
  });
});

describe('renderPoseGuideRasterV2', () => {
  it('fills the frame with the figure instead of a small centered stick', () => {
    const pose = solveArticulatedPose(0.25, DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC);
    const raster = renderPoseGuideRasterV2(pose, DEFAULT_RIG_SPEC, { width: 420, height: 240 });
    const bg = '239,242,247';
    let top = raster.height;
    let bottom = -1;
    // Scan the central band only (legend + phase dots live in the margins).
    for (let y = 0; y < raster.height; y++) {
      for (let x = Math.floor(raster.width * 0.25); x < raster.width * 0.75; x++) {
        const px = readPixel(raster, x, y);
        if (`${px.r},${px.g},${px.b}` !== bg) {
          if (y < top) top = y;
          if (y > bottom) bottom = y;
        }
      }
    }
    expect(top).toBeLessThan(raster.height * 0.2);
    expect(bottom).toBeGreaterThan(raster.height * 0.75);
    expect(bottom - top).toBeGreaterThan(raster.height * 0.6);
  });

  it('marks grounded feet with filled contact glyphs and flight feet with rings', () => {
    const contact = solveArticulatedPose(0, DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC);
    expect(contact.nearLeg.isGrounded).toBe(true);
    const raster = renderPoseGuideRasterV2(contact, DEFAULT_RIG_SPEC, { width: 420, height: 240 });
    const { map } = computeGuideV2Transform(contact, DEFAULT_RIG_SPEC, 420, 240);
    const ball = map(contact.nearLeg.ballPoint);
    const glyph = readPixel(raster, Math.round(ball.x), Math.round(ball.y));
    expect([glyph.r, glyph.g, glyph.b]).toEqual([
      GUIDE_V2_COLORS.contactGlyph.r,
      GUIDE_V2_COLORS.contactGlyph.g,
      GUIDE_V2_COLORS.contactGlyph.b,
    ]);

    const flight = solveArticulatedPose(0.375, DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC);
    expect(flight.nearLeg.isGrounded).toBe(false);
    const flightRaster = renderPoseGuideRasterV2(flight, DEFAULT_RIG_SPEC, { width: 420, height: 240 });
    const flightMap = computeGuideV2Transform(flight, DEFAULT_RIG_SPEC, 420, 240).map;
    // The ring center (toe) stays capsule-colored, not the contact green.
    const toe = flightMap(flight.nearLeg.tipPoint);
    const toePx = readPixel(flightRaster, Math.round(toe.x), Math.round(toe.y));
    expect([toePx.r, toePx.g, toePx.b]).not.toEqual([
      GUIDE_V2_COLORS.contactGlyph.r,
      GUIDE_V2_COLORS.contactGlyph.g,
      GUIDE_V2_COLORS.contactGlyph.b,
    ]);
    // And the contact-glyph green is absent from a full flight frame.
    let greenCount = 0;
    for (let i = 0; i < flightRaster.data.length; i += 4) {
      if (
        flightRaster.data[i] === GUIDE_V2_COLORS.contactGlyph.r &&
        flightRaster.data[i + 1] === GUIDE_V2_COLORS.contactGlyph.g &&
        flightRaster.data[i + 2] === GUIDE_V2_COLORS.contactGlyph.b
      ) {
        greenCount++;
      }
    }
    expect(greenCount).toBe(0);
  });

  it('keeps near/far/torso identity colors and the active phase dot', () => {
    const pose = solveArticulatedPose(0.25, DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC);
    const raster = renderPoseGuideRasterV2(pose, DEFAULT_RIG_SPEC, { width: 420, height: 240 });
    const colors = new Set<string>();
    for (let index = 0; index < raster.data.length; index += 4) {
      colors.add(`${raster.data[index]},${raster.data[index + 1]},${raster.data[index + 2]}`);
    }
    expect(colors.has('0,143,224')).toBe(true);
    expect(colors.has('239,119,36')).toBe(true);
    expect(colors.has('34,47,67')).toBe(true);
    // Active phase dot for H03 (index 2) is filled dark.
    const dotX = Math.round(420 * 0.03) + 2 * Math.max(16, Math.round(420 * 0.016));
    const dot = readPixel(raster, dotX, Math.round(240 * 0.93));
    expect([dot.r, dot.g, dot.b]).toEqual([34, 47, 67]);
  });
});

describe('renderPoseGuideRasterV2 without foot glyphs (V3)', () => {
  it('omits contact-glyph green while keeping capsules and phase dots', () => {
    const pose = solveArticulatedPose(0, DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC);
    const raster = renderPoseGuideRasterV2(pose, DEFAULT_RIG_SPEC, { width: 420, height: 240, footGlyphs: false });
    let greenCount = 0;
    const colors = new Set<string>();
    for (let i = 0; i < raster.data.length; i += 4) {
      colors.add(`${raster.data[i]},${raster.data[i + 1]},${raster.data[i + 2]}`);
      if (
        raster.data[i] === GUIDE_V2_COLORS.contactGlyph.r &&
        raster.data[i + 1] === GUIDE_V2_COLORS.contactGlyph.g &&
        raster.data[i + 2] === GUIDE_V2_COLORS.contactGlyph.b
      ) {
        greenCount++;
      }
    }
    expect(greenCount).toBe(0);
    expect(colors.has('0,143,224')).toBe(true);
    expect(colors.has('239,119,36')).toBe(true);
  });
});
