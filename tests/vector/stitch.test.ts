import { describe, expect, it } from 'vitest';
import { MOTION_PROFILES, PERSONAS, BODY, PART_IDS } from '../../src/lib/rig/body.ts';
import { solvePose } from '../../src/lib/gait/pose.ts';
import { stitchSvgFrame } from '../../src/lib/vector/stitch.ts';

function matrices(svg: string): Map<string, number[]> {
  const out = new Map<string, number[]>();
  const pattern = /data-part="([^"]+)" transform="matrix\(([^)]+)\)"/g;
  for (let match = pattern.exec(svg); match; match = pattern.exec(svg)) {
    out.set(match[1] as string, (match[2] as string).split(/\s+/).map(Number));
  }
  return out;
}

function apply(m: number[], x: number, y: number): { x: number; y: number } {
  const [a = 0, b = 0, c = 0, d = 0, e = 0, f = 0] = m;
  return { x: a * x + c * y + (e as number), y: b * x + d * y + (f as number) };
}

describe('SVG stitcher', () => {
  const pose = solvePose(0.3, MOTION_PROFILES.run);
  const svg = stitchSvgFrame(pose, PERSONAS['wei-ming'], 200, 200, 170);

  it('stitches all 17 parts back-to-front', () => {
    const parts = [...matrices(svg).keys()];
    expect(parts).toEqual([...PART_IDS]);
  });

  it('maps the near thigh rest shape onto the posed femur exactly', () => {
    const m = matrices(svg).get('near-thigh')!;
    const distal = apply(m, 0, BODY.femur);
    expect(distal.x).toBeCloseTo(pose.joints.knee.near.x, 1);
    expect(distal.y).toBeCloseTo(pose.joints.knee.near.y, 1);
  });

  it('maps the far shin rest shape onto the posed tibia', () => {
    const m = matrices(svg).get('far-shin')!;
    const distal = apply(m, 0, BODY.tibia);
    expect(distal.x).toBeCloseTo(pose.joints.ankle.far.x, 1);
    expect(distal.y).toBeCloseTo(pose.joints.ankle.far.y, 1);
  });

  it('keeps matrices orthonormal (rotation + translation only)', () => {
    for (const m of matrices(svg).values()) {
      const [a = 0, b = 0, c = 0, d = 0] = m;
      expect(a * a + b * b).toBeCloseTo(1, 2);
      expect(c * c + d * d).toBeCloseTo(1, 2);
      expect(a * c + b * d).toBeCloseTo(0, 2);
    }
  });

  it('is valid standalone SVG markup', () => {
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.trim().endsWith('</svg>')).toBe(true);
    expect(svg).toContain('stroke-linecap="round"');
  });
});
