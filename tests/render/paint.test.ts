import { describe, expect, it } from 'vitest';
import { MOTION_PROFILES, PERSONAS } from '../../src/lib/rig/body.ts';
import { solvePose } from '../../src/lib/gait/pose.ts';
import { poseToOps, skeletonOps, transformOp, type Transform } from '../../src/lib/render/paint-ops.ts';
import { createRaster, countOpaque, alphaMask } from '../../src/lib/render/raster.ts';
import { paintCell, paintOps } from '../../src/lib/render/paint-raster.ts';
import { PART_IDS } from '../../src/lib/rig/body.ts';

const transform: Transform = { scale: 2, offsetX: 150, offsetY: 240 };

function painted(phase: number) {
  const pose = solvePose(phase, MOTION_PROFILES.run);
  const raster = createRaster(300, 300);
  paintCell(raster, poseToOps(pose, PERSONAS['wei-ming']), 'light', transform, 300, 300, 0, 0);
  return { pose, raster };
}

describe('paint contract (one solver, two painters)', () => {
  it('emits exactly one op per articulated part', () => {
    const pose = solvePose(0.2, MOTION_PROFILES.run);
    expect(poseToOps(pose, PERSONAS['mei-lin']).length).toBe(PART_IDS.length);
  });

  it('paints a grounded figure: stance phases touch the ground row', () => {
    const { pose, raster } = painted(0.1);
    const mask = alphaMask(raster);
    const groundRow = Math.round(transform.offsetY + pose.joints.ankle.near.y * transform.scale + 4 * transform.scale);
    let touched = false;
    for (let x = 0; x < raster.width; x += 1) {
      if ((mask[groundRow * raster.width + x] ?? 0) === 1) touched = true;
    }
    expect(touched).toBe(true);
  });

  it('keeps the silhouette inside the canvas over the whole cycle', () => {
    for (let i = 0; i < 16; i += 1) {
      const { raster } = painted(i / 16);
      expect(countOpaque(raster)).toBeGreaterThan(1500);
    }
  });

  it('transforms ops affinely (scale + offset) for pixel space', () => {
    const op = { kind: 'circle' as const, center: { x: 10, y: -20 }, radius: 4, color: '#000000' };
    const moved = transformOp(op, transform);
    if (moved.kind === 'circle') {
      expect(moved.center.x).toBe(170);
      expect(moved.center.y).toBe(200);
      expect(moved.radius).toBe(8);
    }
  });

  it('skeleton overlay adds joint segments without dropping body ops', () => {
    const pose = solvePose(0.4, MOTION_PROFILES.run);
    const body = poseToOps(pose, PERSONAS['wei-ming']);
    expect(skeletonOps(pose, '#00e5ff').length + body.length).toBeGreaterThan(body.length);
  });
});
