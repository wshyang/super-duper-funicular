import { describe, expect, it } from 'vitest';
import {
  add,
  distance,
  normalizePhase,
  rotate,
  smoothstep,
  vec,
  clamp,
} from '../../src/runner/vec.ts';

describe('vec', () => {
  it('adds and measures distance', () => {
    expect(add(vec(1, 2), vec(-3, 4))).toEqual({ x: -2, y: 6 });
    expect(distance(vec(0, 0), vec(3, 4))).toBeCloseTo(5, 6);
  });

  it('rotates around the origin by 90 degrees', () => {
    const rotated = rotate(vec(1, 0), Math.PI / 2);
    expect(rotated.x).toBeCloseTo(0, 9);
    expect(rotated.y).toBeCloseTo(1, 9);
  });

  it('normalizes phases into [0, 1) for negative and out-of-range input', () => {
    expect(normalizePhase(-0.25)).toBeCloseTo(0.75, 9);
    expect(normalizePhase(3.5)).toBeCloseTo(0.5, 9);
    expect(normalizePhase(Number.NaN)).toBe(0);
  });

  it('clamps and smooths into the unit interval', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(smoothstep(-1)).toBe(0);
    expect(smoothstep(0.5)).toBeCloseTo(0.5, 9);
  });
});
