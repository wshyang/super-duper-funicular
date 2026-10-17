import { describe, expect, it } from 'vitest';
import { DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC } from '../../runner/body-proportions.js';
import { solveArticulatedPose } from '../../runner/gait.js';
import {
  BACKDROP_OPTIONS,
  buildArticulatedPartReadouts,
  buildFilmstripCards,
  buildFormattedPoseSummary,
  PERSONA_OPTIONS,
  sampleFootOrbitTrail,
  VARIANT_OPTIONS,
} from './studio-view-model.js';

describe('Studio View-Model Builders', () => {
  it('builds 8 filmstrip cards with persona-specific algorithmic URLs', () => {
    const maleCards = buildFilmstripCards('blue', 2, 'sg-chinese-male');
    const femaleCards = buildFilmstripCards('blue', 2, 'sg-chinese-female');

    expect(maleCards).toHaveLength(8);
    expect(femaleCards).toHaveLength(8);
    expect(maleCards[2]?.isActiveFrame).toBe(true);
    expect(maleCards[0]?.algorithmicUrl).toBe(
      '/sprites/algorithmic/sg-chinese-male/blue/frame-01.png',
    );
    expect(femaleCards[0]?.algorithmicUrl).toBe(
      '/sprites/algorithmic/sg-chinese-female/blue/frame-01.png',
    );
    expect(maleCards[4]?.isDuplicateFrame).toBe(true);
  });

  it('formats live pose summary with neck articulation, forward-fall lead, and foot roll', () => {
    const pose = solveArticulatedPose(0.25, DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC);
    const summary = buildFormattedPoseSummary(pose);

    expect(summary.frameBadge).toBe('Frame 3 / 8');
    expect(summary.phaseFormatted).toContain('25%');
    expect(summary.neckAngleDeg).toContain('cervical tilt');
    expect(summary.fallForwardLeadPx).toContain('ahead of hip');
    expect(summary.footRollStatus).toContain('heel-off-roll');
  });

  it('builds 17 articulated part readouts for both Singapore Chinese Male and Female personas', () => {
    const pose = solveArticulatedPose(0.5, DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC);
    const maleReadouts = buildArticulatedPartReadouts(pose, 'sg-chinese-male');
    const femaleReadouts = buildArticulatedPartReadouts(pose, 'sg-chinese-female');

    expect(maleReadouts).toHaveLength(17);
    expect(femaleReadouts).toHaveLength(17);
    const neckPart = maleReadouts.find((r) => r.part.partId === 'neck');
    expect(neckPart?.cutoutUrl).toBe(
      '/sprites/algorithmic/parts/sg-chinese-male/neck.png',
    );
    const femaleHairPart = femaleReadouts.find((r) => r.part.partId === 'hairAccessory');
    expect(femaleHairPart?.cutoutUrl).toBe(
      '/sprites/algorithmic/parts/sg-chinese-female/hairAccessory.png',
    );
  });

  it('samples a closed 32-point ball-of-foot orbit trail and exposes both personas', () => {
    const orbit = sampleFootOrbitTrail(DEFAULT_GAIT_CONFIG);
    expect(orbit).toHaveLength(32);
    expect(VARIANT_OPTIONS).toHaveLength(6);
    expect(BACKDROP_OPTIONS).toHaveLength(5);
    expect(PERSONA_OPTIONS.map((p) => p.id)).toEqual([
      'sg-chinese-male',
      'sg-chinese-female',
      'photo-sg-chinese-female',
    ]);
    const photoReadouts = buildArticulatedPartReadouts(
      solveArticulatedPose(0.25, DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC),
      'photo-sg-chinese-female',
    );
    expect(photoReadouts[0]?.cutoutUrl).toBe(
      '/sprites/algorithmic/parts/photo-sg-chinese-female/farUpperArm.png',
    );
  });
});
