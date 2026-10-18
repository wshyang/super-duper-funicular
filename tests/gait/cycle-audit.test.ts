import { describe, expect, it } from 'vitest';
import { MOTION_IDS, MOTION_PROFILES } from '../../src/lib/rig/body.ts';
import { auditCycle } from '../../src/lib/analysis/cycle-audit.ts';

describe('generated cycle behavioural acceptance', () => {
  it('run: legs cross twice and a flight phase exists', () => {
    const metrics = auditCycle(MOTION_PROFILES.run);
    expect(metrics.crossovers).toBeGreaterThanOrEqual(2);
    expect(metrics.leadSwaps).toBeGreaterThanOrEqual(2);
    expect(metrics.flightPhases).toBeGreaterThan(0);
    expect(metrics.doubleSupportPhases).toBe(0);
    expect(metrics.minFootSeparationPx).toBeLessThan(20);
  });

  it('walk families: double support, no flight', () => {
    for (const id of ['walk', 'brisk-walk'] as const) {
      const metrics = auditCycle(MOTION_PROFILES[id]);
      expect(metrics.doubleSupportPhases).toBeGreaterThan(0);
      expect(metrics.flightPhases).toBe(0);
    }
  });

  it('brisk walk is faster and swings harder than walking', () => {
    expect(MOTION_PROFILES['brisk-walk'].cadenceStepsPerMin).toBeGreaterThan(MOTION_PROFILES.walk.cadenceStepsPerMin);
    expect(MOTION_PROFILES['brisk-walk'].armSwingRad).toBeGreaterThan(MOTION_PROFILES.walk.armSwingRad);
    expect(MOTION_PROFILES['brisk-walk'].doubleSupportDuty).toBeLessThan(MOTION_PROFILES.walk.doubleSupportDuty);
  });

  it('bone lengths stay invariant over every profile and phase', () => {
    for (const id of MOTION_IDS) {
      expect(auditCycle(MOTION_PROFILES[id]).maxBoneLengthError).toBeLessThan(0.001);
    }
  });

  it('swinging soles clear the ground line', () => {
    for (const id of MOTION_IDS) {
      expect(auditCycle(MOTION_PROFILES[id]).soleClearanceMinPx).toBeGreaterThan(-0.5);
    }
  });
});
