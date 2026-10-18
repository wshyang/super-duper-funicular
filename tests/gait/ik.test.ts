import { describe, expect, it } from 'vitest';
import { solveTwoBone } from '../../src/lib/gait/ik.ts';
import { distance, vec } from '../../src/lib/geometry/vec.ts';

describe('two-bone IK', () => {
  it('preserves both bone lengths for reachable targets', () => {
    const root = vec(0, -60);
    const target = vec(6, 0);
    const { mid, reached } = solveTwoBone(root, target, 34, 32, 1);
    expect(reached).toBe(true);
    expect(distance(root, mid)).toBeCloseTo(34, 6);
    expect(distance(mid, target)).toBeCloseTo(32, 6);
  });

  it('bends the knee forward (+x) with bend = 1', () => {
    const root = vec(0, -60);
    const { mid } = solveTwoBone(root, vec(0, -2), 34, 32, 1);
    expect(mid.x).toBeGreaterThan(0);
  });

  it('clamps unreachable targets while preserving lengths', () => {
    const root = vec(0, -60);
    const { mid, reached } = solveTwoBone(root, vec(200, 0), 34, 32, 1);
    expect(reached).toBe(false);
    expect(distance(root, mid)).toBeCloseTo(34, 2);
  });

  it('rejects a zero-distance target without NaN', () => {
    const { mid } = solveTwoBone(vec(5, 5), vec(5, 5), 34, 32, 1);
    expect(Number.isFinite(mid.x)).toBe(true);
    expect(Number.isFinite(mid.y)).toBe(true);
  });
});
