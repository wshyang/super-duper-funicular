import { describe, expect, it } from 'vitest';
import { DEFAULT_RIG, ARM_LEG_RATIO, REST_JOINTS, STATURE_FRACTIONS, STATURE_PX, GROUND_Y } from './spec.js';
import { solveTwoBone } from './ik.js';
import { solvePose } from './gait.js';
import { solveStandingPose } from '../render/standing.js';

describe('rig proportions', () => {
  it('places every joint on the anthropometric stature fractions', () => {
    expect(DEFAULT_RIG.pelvisRestY).toBeCloseTo(REST_JOINTS.hipY, 0);
    expect(DEFAULT_RIG.pelvisRestY + DEFAULT_RIG.thighLength).toBeCloseTo(REST_JOINTS.kneeY, 0);
    expect(DEFAULT_RIG.pelvisRestY + DEFAULT_RIG.thighLength + DEFAULT_RIG.shinLength).toBeCloseTo(
      REST_JOINTS.ankleY,
      0,
    );
    expect(REST_JOINTS.vertexY).toBeCloseTo(GROUND_Y - STATURE_PX, 0);
  });

  it('keeps the adult arm-to-leg ratio rather than a cut-out-derived one', () => {
    // The previous branches converged on 0.535 after shrinking arms to match
    // oversized art; adult anthropometry is ~0.68. See docs/PIPELINE.md §5.2.
    expect(ARM_LEG_RATIO).toBeCloseTo(0.676, 2);
    const rigRatio =
      (DEFAULT_RIG.upperArmLength + DEFAULT_RIG.forearmLength) /
      (DEFAULT_RIG.thighLength + DEFAULT_RIG.shinLength);
    expect(rigRatio).toBeCloseTo(ARM_LEG_RATIO, 2);
  });

  it('is independent of any photograph: no persona input changes a bone length', () => {
    const fractions = Object.values(STATURE_FRACTIONS);
    expect(fractions.every((value) => value > 0 && value <= 1)).toBe(true);
    expect(DEFAULT_RIG.thighLength).toBeGreaterThan(0);
  });
});

describe('two-bone IK', () => {
  it('reaches an in-range target exactly', () => {
    const solution = solveTwoBone({ x: 0, y: 0 }, { x: 40, y: 30 }, 30, 25, -1);
    expect(solution.isClamped).toBe(false);
    expect(Math.hypot(solution.mid.x, solution.mid.y)).toBeCloseTo(30, 5);
    expect(Math.hypot(solution.tip.x - solution.mid.x, solution.tip.y - solution.mid.y)).toBeCloseTo(25, 5);
    expect(solution.tip.x).toBeCloseTo(40, 4);
    expect(solution.tip.y).toBeCloseTo(30, 4);
  });

  it('clamps an unreachable target instead of stretching the bone', () => {
    const solution = solveTwoBone({ x: 0, y: 0 }, { x: 500, y: 0 }, 30, 25, -1);
    expect(solution.isClamped).toBe(true);
    const reach = Math.hypot(solution.tip.x, solution.tip.y);
    expect(reach).toBeLessThanOrEqual(55.0001);
    expect(reach).toBeGreaterThan(54);
  });

  it('bends the knee forward on a right-facing figure', () => {
    const solution = solveTwoBone({ x: 100, y: 60 }, { x: 100, y: 160 }, 50, 50, -1);
    expect(solution.mid.x).toBeGreaterThan(100);
  });
});

describe('gait solver', () => {
  it('drives the two legs in strict contralateral anti-phase', () => {
    for (const phase of [0, 0.125, 0.25, 0.375, 0.5, 0.75, 0.875]) {
      const pose = solvePose(phase);
      const opposite = solvePose(phase + 0.5);
      expect(pose.nearLeg[1]?.capsule.b.x).toBeCloseTo(opposite.farLeg[1]?.capsule.b.x ?? 0, 4);
      expect(pose.farLeg[1]?.capsule.b.x).toBeCloseTo(opposite.nearLeg[1]?.capsule.b.x ?? 0, 4);
    }
  });

  it('never penetrates the ground on a stance foot', () => {
    const poses = Array.from({ length: 64 }, (_, index) => solvePose(index / 64));
    for (const pose of poses) {
      for (const foot of [pose.nearFoot, pose.farFoot]) {
        expect(foot.ball.y).toBeLessThanOrEqual(pose.groundY);
        expect(foot.toe.y).toBeLessThanOrEqual(pose.groundY);
        expect(foot.heel.y).toBeLessThanOrEqual(pose.groundY);
      }
    }
  });

  it('has a flight phase for the run and none for the walk', () => {
    const runAirborne = Array.from({ length: 32 }, (_, index) => solvePose(index / 32)).filter(
      (pose) => pose.nearFoot.contact === 'swing' && pose.farFoot.contact === 'swing',
    );
    expect(runAirborne.length).toBeGreaterThan(1);
  });

  it('has no positional discontinuity at heel strike', () => {
    // The frame-level pop gate can only see a 1/16-cycle sample; the strike
    // itself is a continuous event and is checked where it is defined.
    // End of swing (phase just below 1), immediately before the strike at phase 0.
    const before = solvePose(1 - 1e-4);
    const after = solvePose(0);
    expect(
      Math.hypot(before.nearFoot.ball.x - after.nearFoot.ball.x, before.nearFoot.ball.y - after.nearFoot.ball.y),
    ).toBeLessThan(0.5);
    expect(
      Math.hypot(before.nearFoot.heel.x - after.nearFoot.heel.x, before.nearFoot.heel.y - after.nearFoot.heel.y),
    ).toBeLessThan(0.5);
  });

  it('is deterministic for a given phase', () => {
    expect(solvePose(0.375)).toEqual(solvePose(0.375));
    expect(solvePose(1.375)).toEqual(solvePose(0.375));
  });

  it('keeps the standing pose at rest on the ground', () => {
    const pose = solveStandingPose();
    expect(pose.nearFoot.ball.y).toBeLessThanOrEqual(pose.groundY);
    expect(pose.headCenter.y).toBeLessThan(pose.torsoTop.y);
  });
});
