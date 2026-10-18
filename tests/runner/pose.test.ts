import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  FOOT_SHAPE,
  MOTION_PROFILES,
  STAGE_SIZE,
} from '../../src/shared/constants';
import type { GaitSettings } from '../../src/shared/types';
import { add, distance, normalizePhase, rotate } from '../../src/runner/math';
import { solvePose } from '../../src/runner/pose';

const settingsFor = (motion: GaitSettings['motion']): GaitSettings => ({
  ...DEFAULT_SETTINGS,
  motion,
});

describe('continuous runner pose', () => {
  it('normalizes negative and out-of-range phases', () => {
    expect(normalizePhase(-0.25)).toBeCloseTo(0.75, 8);
    expect(normalizePhase(2.25)).toBeCloseTo(0.25, 8);
  });

  it('is deterministic and joins exactly at phase zero and one', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      persona: 'strider' as const,
      palette: 'purple' as const,
    };
    expect(solvePose(settings, 0.37)).toEqual(solvePose(settings, 0.37));
    expect(solvePose(settings, 0)).toEqual(solvePose(settings, 1));
  });

  it('preserves both leg segment lengths across all motion profiles and sampled phases', () => {
    for (const profile of MOTION_PROFILES) {
      const settings = settingsFor(profile.id);
      for (let sample = 0; sample < 32; sample += 1) {
        const pose = solvePose(settings, sample / 32);
        for (const leg of [pose.nearLeg, pose.farLeg]) {
          expect(distance(leg.hip, leg.knee)).toBeCloseTo(92, 4);
          expect(distance(leg.knee, leg.foot.ankle)).toBeCloseTo(84, 4);
        }
      }
    }
  });

  it('keeps stance soles on the ground and exposes flight only for running', () => {
    for (const profile of MOTION_PROFILES) {
      const settings = settingsFor(profile.id);
      let sawFlight = false;
      let sawDoubleSupport = false;
      for (let sample = 0; sample < 32; sample += 1) {
        const pose = solvePose(settings, sample / 32);
        sawFlight ||= pose.flight;
        sawDoubleSupport ||= pose.nearLeg.foot.stance && pose.farLeg.foot.stance;
        for (const leg of [pose.nearLeg, pose.farLeg]) {
          const expectedHeel = add(
            leg.foot.ankle,
            rotate({ x: FOOT_SHAPE.heelX, y: FOOT_SHAPE.soleY }, leg.foot.pitch),
          );
          const expectedToe = add(
            leg.foot.ankle,
            rotate({ x: FOOT_SHAPE.toeX, y: FOOT_SHAPE.soleY }, leg.foot.pitch),
          );
          expect(distance(leg.foot.heel, expectedHeel)).toBeCloseTo(0, 4);
          expect(distance(leg.foot.toe, expectedToe)).toBeCloseTo(0, 4);
          const soleY = Math.max(leg.foot.heel.y, leg.foot.toe.y);
          expect(soleY).toBeLessThanOrEqual(STAGE_SIZE.groundY + 0.001);
          if (leg.foot.stance) expect(soleY).toBeCloseTo(STAGE_SIZE.groundY, 4);
        }
        if (profile.id !== 'run') expect(pose.flight).toBe(false);
      }
      if (profile.id === 'run') {
        expect(sawFlight).toBe(true);
        expect(sawDoubleSupport).toBe(false);
      } else {
        expect(sawDoubleSupport).toBe(true);
      }
    }
  });
});
