import { describe, expect, it } from 'vitest';
import { MOTION_PROFILES } from '../../src/lib/rig/body.ts';
import { solvePose } from '../../src/lib/gait/pose.ts';
import { samplePoses } from '../../src/lib/analysis/cycle-audit.ts';

const RUN = MOTION_PROFILES.run;
const WALK = MOTION_PROFILES.walk;

describe('pose solver', () => {
  it('alternates lead legs across the half cycle', () => {
    const a = solvePose(0.05, RUN);
    const b = solvePose(0.55, RUN);
    const leadA = Math.sign(a.joints.toe.near.x - a.joints.toe.far.x);
    const leadB = Math.sign(b.joints.toe.near.x - b.joints.toe.far.x);
    expect(leadA).not.toBe(0);
    expect(leadB).toBe(-leadA);
  });

  it('keeps stance ankles on the ground line', () => {
    for (const phase of [0.02, 0.1, 0.2]) {
      const pose = solvePose(phase, RUN);
      const stanceSide = pose.support === 'near-stance' ? 'near' : 'far';
      expect(pose.joints.ankle[stanceSide].y + 6).toBeCloseTo(0, 6);
    }
  });

  it('reports flight phases for running and double support for walking', () => {
    const runSupports = samplePoses(RUN, 32).map((p) => p.support);
    const walkSupports = samplePoses(WALK, 32).map((p) => p.support);
    expect(runSupports).toContain('flight');
    expect(runSupports).not.toContain('double-support');
    expect(walkSupports).toContain('double-support');
    expect(walkSupports).not.toContain('flight');
  });

  it('opposes the arms to the same-side legs', () => {
    const pose = solvePose(0.1, RUN);
    const nearArmBack = pose.joints.elbow.near.x < pose.joints.shoulder.x;
    const nearLegForward = pose.joints.ankle.near.x > pose.joints.hip.x;
    expect(nearArmBack).toBe(nearLegForward);
  });

  it('articulates the neck independently of the torso lean', () => {
    const pose = solvePose(0.3, RUN);
    expect(pose.neckPitchRad).not.toBeCloseTo(pose.torsoLeanRad, 3);
    expect(pose.headPitchRad).not.toBe(0);
  });

  it('wraps phase into [0,1)', () => {
    expect(solvePose(1.25, RUN).phase).toBeCloseTo(0.25, 9);
    expect(solvePose(-0.25, RUN).phase).toBeCloseTo(0.75, 9);
  });
});
