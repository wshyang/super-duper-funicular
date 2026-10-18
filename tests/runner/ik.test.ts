import { describe, expect, it } from 'vitest';
import { solveTwoBone } from '../../src/runner/ik.ts';
import { distance, vec } from '../../src/runner/vec.ts';

describe('two-bone IK', () => {
  it('keeps the chain lengths when the target is reachable', () => {
    const solution = solveTwoBone({
      root: vec(100, 100),
      target: vec(140, 180),
      upperLength: 60,
      lowerLength: 55,
      bendSign: 1,
    });
    expect(distance(vec(100, 100), solution.joint)).toBeCloseTo(60, 6);
    expect(distance(solution.joint, solution.end)).toBeCloseTo(55, 6);
    expect(solution.clamped).toBe(false);
  });

  it('clamps an unreachable target to the maximum reach', () => {
    const solution = solveTwoBone({
      root: vec(0, 0),
      target: vec(500, 0),
      upperLength: 50,
      lowerLength: 40,
      bendSign: 1,
    });
    expect(solution.clamped).toBe(true);
    expect(distance(vec(0, 0), solution.end)).toBeCloseTo(89.25, 6);
  });

  it('clamps a too-close target to the minimum reach', () => {
    const solution = solveTwoBone({
      root: vec(0, 0),
      target: vec(2, 0),
      upperLength: 50,
      lowerLength: 40,
      bendSign: -1,
    });
    expect(solution.clamped).toBe(true);
    expect(distance(solution.joint, solution.end)).toBeCloseTo(40, 6);
  });

  it('bends the joint to the requested side of the root-target axis', () => {
    const forward = solveTwoBone({
      root: vec(0, 0),
      target: vec(0, 80),
      upperLength: 50,
      lowerLength: 50,
      bendSign: 1,
    });
    const backward = solveTwoBone({
      root: vec(0, 0),
      target: vec(0, 80),
      upperLength: 50,
      lowerLength: 50,
      bendSign: -1,
    });
    expect(Math.sign(forward.joint.x)).toBe(1);
    expect(Math.sign(backward.joint.x)).toBe(-1);
  });
});
