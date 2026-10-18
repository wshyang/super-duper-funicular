import { describe, expect, it } from 'vitest';
import { DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC } from '../runner/body-proportions.js';
import { solveArticulatedPose } from '../runner/gait.js';
import { renderPoseGuideRaster } from './pose-guide-renderer.js';

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
