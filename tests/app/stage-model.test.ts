import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  advancePhase,
  phaseLabel,
  poseFor,
  resetSettings,
  stepPhase,
  supportLabel,
  togglePlaying,
  viewTransform,
  withMotion,
  withPersona,
  withPhase,
} from '../../src/app/model/stage-model.ts';
import { filmstripPanels, auditPanels } from '../../src/app/model/exporters.ts';
import { MOTION_PROFILES, PERSONAS } from '../../src/lib/rig/body.ts';

describe('stage view model (pure)', () => {
  it('advances phase by the profile cadence and speed', () => {
    const next = advancePhase(DEFAULT_SETTINGS, 1);
    expect(next.phase).toBeCloseTo((MOTION_PROFILES.run.cadenceStepsPerMin / 120) % 1, 6);
  });

  it('holds phase while paused', () => {
    expect(advancePhase(togglePlaying(DEFAULT_SETTINGS), 1).phase).toBe(0);
  });

  it('steps in eighths and wraps', () => {
    const stepped = stepPhase(withPhase(DEFAULT_SETTINGS, 0.9), 1);
    expect(stepped.phase).toBeCloseTo(0.025, 9);
  });

  it('reset keeps the persona but restores motion and overlays', () => {
    const edited = withMotion(withPersona({ ...DEFAULT_SETTINGS, skeleton: true }, 'mei-lin'), 'walk');
    const reset = resetSettings(edited);
    expect(reset.persona).toBe('mei-lin');
    expect(reset.motion).toBe('run');
    expect(reset.skeleton).toBe(false);
  });

  it('labels support and phase for the UI', () => {
    const pose = poseFor(DEFAULT_SETTINGS);
    expect(['Near foot supported', 'Far foot supported', 'Double support', 'Flight (airborne)']).toContain(supportLabel(pose));
    expect(phaseLabel(pose)).toMatch(/^φ 0\.\d{3} · run$/);
  });

  it('maps rig space into pixel space through one transform', () => {
    const t = viewTransform(640, 480);
    expect(t.offsetX).toBe(320);
    expect(t.scale).toBeGreaterThan(2);
  });

  it('builds 8 filmstrip panels and 48 audit panels', () => {
    expect(filmstripPanels(MOTION_PROFILES.run, PERSONAS['wei-ming'], 140).length).toBe(8);
    expect(auditPanels(MOTION_PROFILES.walk, PERSONAS['mei-lin'], 160).length).toBe(48);
  });
});
