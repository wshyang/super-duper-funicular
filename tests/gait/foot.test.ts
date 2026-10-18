import { describe, expect, it } from 'vitest';
import { MOTION_PROFILES } from '../../src/lib/rig/body.ts';
import { footState } from '../../src/lib/gait/foot.ts';
import { BODY } from '../../src/lib/rig/body.ts';

const RUN = MOTION_PROFILES.run;
const WALK = MOTION_PROFILES.walk;

describe('foot trajectory and roll', () => {
  it('holds the sole on the ground through stance (ankle one foot-height up)', () => {
    for (const p of [0, 0.1, 0.2]) {
      expect(footState(p, RUN).ankle.y).toBeCloseTo(-6, 6);
    }
  });

  it('rolls the heel off late stance about a planted toe', () => {
    const late = footState(0.34, RUN);
    expect(late.plantedToeX).not.toBeNull();
    expect(late.pitch).toBeGreaterThan(0);
    expect(late.ankle.y).toBeLessThan(0);
  });

  it('lifts the foot clear of the ground in swing', () => {
    const mid = footState(0.68, RUN);
    expect(mid.inStance).toBe(false);
    expect(mid.ankle.y).toBeLessThan(-RUN.footLiftPx * 0.8);
  });

  it('matches stance velocity direction at swing endpoints (no teleport)', () => {
    const justAfter = footState(RUN.stanceDuty + 0.001, RUN);
    const justBefore = footState(RUN.stanceDuty - 0.001, RUN);
    expect(Math.abs(justAfter.ankle.x - justBefore.ankle.x)).toBeLessThan(0.5);
    expect(Math.abs(justAfter.ankle.y - justBefore.ankle.y)).toBeLessThan(0.5);
  });

  it('walks heel-first: −15° preparation at late swing, settle in early stance', () => {
    expect(footState(0.99, WALK).pitch).toBeLessThan(0);
    expect(footState(0.05, WALK).pitch).toBeLessThan(0);
    expect(Math.abs(footState(0.3, WALK).pitch)).toBeLessThan(0.3);
  });

  it('keeps walking feet near the ground (low clearance profile)', () => {
    const mid = footState(0.8, WALK);
    expect(mid.ankle.y).toBeGreaterThan(-(WALK.footLiftPx + BODY.footHeight + 3));
  });
});
