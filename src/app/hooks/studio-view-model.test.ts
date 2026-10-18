import { describe, expect, it } from 'vitest';
import {
  createInitialLocomotionConfigMap,
  DEFAULT_GAIT_CONFIG,
  DEFAULT_RIG_SPEC,
  LOCOMOTION_MODE_DEFAULTS,
  resetActiveLocomotionProfile,
} from '../../runner/body-proportions.js';
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
import {
  buildPhotorealPartAssetUrl,
  isPhotorealExportBlocked,
} from './usePhotorealRigAssets.js';

describe('Studio View-Model Builders', () => {
  it('cache-busts photoreal cutouts whenever the asset bank is reloaded', () => {
    expect(buildPhotorealPartAssetUrl('sg-chinese-female', 'torso', 'rev-next')).toBe(
      '/sprites/photoreal/sg-chinese-female/parts/torso.png?v=rev-next',
    );
    expect(
      buildPhotorealPartAssetUrl('sg-chinese-female', 'torso', 'rev-next'),
    ).not.toBe(
      buildPhotorealPartAssetUrl('sg-chinese-female', 'torso', 'rev-before'),
    );
  });
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

  it('samples a closed 32-point ball-of-foot orbit trail and exposes all 5 personas across the body-positivity spectrum', () => {
    const orbit = sampleFootOrbitTrail(DEFAULT_GAIT_CONFIG);
    expect(orbit).toHaveLength(32);
    expect(VARIANT_OPTIONS).toHaveLength(6);
    expect(BACKDROP_OPTIONS).toHaveLength(5);
    expect(PERSONA_OPTIONS.map((p) => p.id)).toEqual([
      'sg-chinese-male',
      'sg-chinese-female',
      'photo-sg-chinese-female',
      'photo-sg-chinese-female-average',
      'photo-sg-chinese-female-petite',
    ]);
    const photoReadouts = buildArticulatedPartReadouts(
      solveArticulatedPose(0.25, DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC),
      'photo-sg-chinese-female',
    );
    expect(photoReadouts[0]?.cutoutUrl).toBe(
      '/sprites/algorithmic/parts/photo-sg-chinese-female/farUpperArm.png',
    );
    const petiteReadouts = buildArticulatedPartReadouts(
      solveArticulatedPose(0.25, DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC),
      'photo-sg-chinese-female-petite',
    );
    expect(petiteReadouts[0]?.cutoutUrl).toBe(
      '/sprites/algorithmic/parts/photo-sg-chinese-female-petite/farUpperArm.png',
    );
    const avgReadouts = buildArticulatedPartReadouts(
      solveArticulatedPose(0.25, DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC),
      'photo-sg-chinese-female-average',
    );
    expect(avgReadouts[0]?.cutoutUrl).toBe(
      '/sprites/algorithmic/parts/photo-sg-chinese-female-average/farUpperArm.png',
    );
  });

  it('maintains independent per-locomotion-mode session presets and resets only the active profile (CROSS-14 & CROSS-15)', () => {
    const initialMap = createInitialLocomotionConfigMap();
    expect(initialMap.run.cadenceHz).toBe(LOCOMOTION_MODE_DEFAULTS.run.cadenceHz);
    expect(initialMap.walk.cadenceHz).toBe(LOCOMOTION_MODE_DEFAULTS.walk.cadenceHz);
    expect(initialMap['brisk-walk'].cadenceHz).toBe(
      LOCOMOTION_MODE_DEFAULTS['brisk-walk'].cadenceHz,
    );

    const modifiedMap = {
      ...initialMap,
      walk: { ...initialMap.walk, cadenceHz: 2.1, forwardLeanDeg: 18 },
      run: { ...initialMap.run, cadenceHz: 2.4 },
    };
    const afterWalkReset = resetActiveLocomotionProfile(modifiedMap, 'walk');
    expect(afterWalkReset.walk.cadenceHz).toBe(LOCOMOTION_MODE_DEFAULTS.walk.cadenceHz);
    expect(afterWalkReset.run.cadenceHz).toBe(2.4);

    expect(isPhotorealExportBlocked('photo-sg-chinese-female', 'idle')).toBe(true);
    expect(isPhotorealExportBlocked('photo-sg-chinese-female', 'error')).toBe(true);
    expect(isPhotorealExportBlocked('photo-sg-chinese-female', 'loaded')).toBe(false);
    expect(isPhotorealExportBlocked('sg-chinese-female', 'error')).toBe(false);
  });
});
