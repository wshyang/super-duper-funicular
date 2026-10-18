import { describe, expect, it } from 'vitest';
import { DEFAULT_GAIT, CANVAS } from '../../src/shared/constants.ts';
import type { GaitSettings, MotionId } from '../../src/shared/types.ts';
import {
  canonicalFrameIndex,
  isDoubleSupportPhase,
  isFlightPhase,
  resolveGait,
} from '../../src/runner/gait.ts';
import { rigFor, solvePose } from '../../src/runner/pose.ts';
import { solveFoot } from '../../src/runner/gait.ts';
import { vec } from '../../src/runner/vec.ts';

const settingsFor = (motion: MotionId, patch: Partial<GaitSettings> = {}): GaitSettings => ({
  ...DEFAULT_GAIT,
  motion,
  ...patch,
});

const phases = Array.from({ length: 64 }, (_, index) => index / 64);

describe('gait profiles', () => {
  it('runs with a flight phase and walks with double support', () => {
    const run = resolveGait(settingsFor('run'), rigFor(settingsFor('run')));
    const walk = resolveGait(settingsFor('walk'), rigFor(settingsFor('walk')));
    expect(phases.some((phase) => isFlightPhase(phase, run))).toBe(true);
    expect(phases.some((phase) => isDoubleSupportPhase(phase, run))).toBe(false);
    expect(phases.some((phase) => isDoubleSupportPhase(phase, walk))).toBe(true);
    expect(phases.some((phase) => isFlightPhase(phase, walk))).toBe(false);
  });

  it('keeps exactly one foot in stance for the running duty cycle', () => {
    const run = resolveGait(settingsFor('run'), rigFor(settingsFor('run')));
    const stance = phases.filter(
      (phase) => !isFlightPhase(phase, run) && !isDoubleSupportPhase(phase, run),
    );
    expect(stance.length).toBeGreaterThan(0);
    expect(run.duty).toBeCloseTo(0.38, 6);
  });

  it('never lets the stance sole sink below the ground line', () => {
    const settings = settingsFor('run');
    const rig = rigFor(settings);
    const gait = resolveGait(settings, rig);
    const hip = vec(gait.hipX, gait.hipY);
    for (const phase of phases) {
      const foot = solveFoot({ legPhase: phase, gait, hip });
      const lowest = Math.max(foot.heel.y, foot.ball.y, foot.toe.y);
      expect(lowest).toBeLessThanOrEqual(CANVAS.groundY + 0.6);
      if (foot.isStance) expect(lowest).toBeCloseTo(CANVAS.groundY, 6);
      else expect(lowest).toBeGreaterThan(CANVAS.groundY - gait.liftPx - 4);
    }
  });

  it('advances the stance ankle backwards and lifts the swing ankle', () => {
    const settings = settingsFor('walk');
    const gait = resolveGait(settings, rigFor(settings));
    const hip = vec(gait.hipX, gait.hipY);
    const early = solveFoot({ legPhase: 0.1, gait, hip });
    const late = solveFoot({ legPhase: 0.45, gait, hip });
    const swing = solveFoot({ legPhase: 0.8, gait, hip });
    expect(early.ankle.x).toBeGreaterThan(late.ankle.x);
    expect(swing.ankle.y).toBeLessThan(late.ankle.y);
  });

  it('maps phases to a stable canonical frame index', () => {
    expect(canonicalFrameIndex(0)).toBe(0);
    expect(canonicalFrameIndex(0.26)).toBe(2);
    expect(canonicalFrameIndex(1)).toBe(0);
  });
});

describe('pose solver', () => {
  it('solves both legs at contralateral phases', () => {
    const settings = settingsFor('run');
    const frame = solvePose(settings, 0.2);
    const other = solvePose(settings, 0.7);
    const nearOffset = frame.pose.nearLeg.foot.ankle.x - frame.pose.nearLeg.hip.x;
    const farOffset = other.pose.farLeg.foot.ankle.x - other.pose.farLeg.hip.x;
    expect(nearOffset).toBeCloseTo(farOffset, 6);
  });

  it('keeps every limb chain within its joint lengths', () => {
    const settings = settingsFor('run');
    const rig = rigFor(settings);
    for (const phase of phases) {
      const { pose } = solvePose(settings, phase);
      for (const leg of [pose.nearLeg, pose.farLeg]) {
        expect(Math.hypot(leg.knee.x - leg.hip.x, leg.knee.y - leg.hip.y)).toBeCloseTo(
          rig.thigh,
          6,
        );
        expect(Math.hypot(leg.ankle.x - leg.knee.x, leg.ankle.y - leg.knee.y)).toBeCloseTo(
          rig.shin,
          6,
        );
      }
      for (const arm of [pose.nearArm, pose.farArm]) {
        expect(
          Math.hypot(arm.elbow.x - arm.shoulder.x, arm.elbow.y - arm.shoulder.y),
        ).toBeLessThanOrEqual(rig.upperArm + 1e-6);
      }
    }
  });

  it('is deterministic for the same phase', () => {
    const settings = settingsFor('brisk-walk');
    expect(solvePose(settings, 0.3123)).toEqual(solvePose(settings, 0.3123));
  });

  it('counter-pitches the neck against the torso lean', () => {
    const settings = settingsFor('run', { lean: 1.5 });
    const { pose } = solvePose(settings, 0.3);
    expect(Math.abs(pose.torsoAngleRad)).toBeGreaterThan(0.3);
    expect(Math.abs(pose.headAngleRad)).toBeLessThan(Math.abs(pose.torsoAngleRad));
  });
});

describe('joint calibration', () => {
  const settings = settingsFor('run');
  const calibration = {
    hip: { x: 6, y: -4 },
    shoulder: { x: 3, y: 2 },
    head: { x: -2, y: 3 },
  };

  it('moves the pelvis, shoulder and head by the requested offsets', () => {
    const base = solvePose(settings, 0.3);
    const moved = solvePose(settings, 0.3, { calibration });
    expect(moved.pose.hip.x - base.pose.hip.x).toBeCloseTo(6, 6);
    expect(moved.pose.hip.y - base.pose.hip.y).toBeCloseTo(-4, 6);
    expect(moved.pose.shoulder.x - base.pose.shoulder.x).toBeCloseTo(9, 6);
    expect(moved.pose.shoulder.y - base.pose.shoulder.y).toBeCloseTo(-2, 6);
    expect(moved.pose.headCenter.x - base.pose.headCenter.x).toBeCloseTo(4, 6);
    expect(moved.pose.headCenter.y - base.pose.headCenter.y).toBeCloseTo(-1, 6);
  });

  it('keeps leg roots and feet planted while the pelvis moves', () => {
    const base = solvePose(settings, 0.3);
    const moved = solvePose(settings, 0.3, { calibration });
    for (const leg of ['nearLeg', 'farLeg'] as const) {
      expect(moved.pose[leg].hip).toEqual(base.pose[leg].hip);
      expect(moved.pose[leg].knee).toEqual(base.pose[leg].knee);
      expect(moved.pose[leg].ankle).toEqual(base.pose[leg].ankle);
    }
  });

  it('is a no-op at the default offsets', () => {
    const base = solvePose(settings, 0.42);
    const same = solvePose(settings, 0.42, {
      calibration: { hip: { x: 0, y: 0 }, shoulder: { x: 0, y: 0 }, head: { x: 0, y: 0 } },
    });
    expect(same).toEqual(base);
  });
});
