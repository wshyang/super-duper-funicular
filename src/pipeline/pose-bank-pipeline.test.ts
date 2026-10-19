import { describe, expect, it } from 'vitest';
import {
  POSE_BANK_FRAME_SPECS,
  assertJigPoseVariant,
  buildPosePrompt,
  createPoseBankScaffold,
  selectBestHarvestFrame,
  selectManifestHarvestFrame,
} from './pose-bank-pipeline.js';

const profile = {
  characterId: 'athletic-pilot',
  masterImagePath: 'src/images/master.png',
  identityLock: 'same adult runner with consistent face and natural proportions',
  wardrobeLock: 'red singlet, dark shorts, blue wristbands and white running shoes',
};

describe('pose-bank pipeline', () => {
  it('scaffolds H00 plus the eight canonical phases with source-linked prompt paths', () => {
    const scaffold = createPoseBankScaffold(profile, 'master-hash', 'guides', 'prompts');
    expect(scaffold.manifest.frames.map((frame) => frame.key)).toEqual(POSE_BANK_FRAME_SPECS.map((frame) => frame.key));
    expect(scaffold.manifest.frames[0]?.status).toBe('accepted');
    expect(scaffold.manifest.frames[1]?.poseGuidePath).toBe('guides/H01-pose-guide.png');
    expect(scaffold.manifest.frames[1]?.status).toBe('planned');
    expect(scaffold.prompts.H03).toContain('forefoot/toes on the ground');
    expect(scaffold.prompts.H04).toContain('Both shoes are clearly airborne');
  });

  it('builds a phase prompt that keeps identity and pose-guide roles explicit', () => {
    const prompt = buildPosePrompt(profile, POSE_BANK_FRAME_SPECS[3]!);
    expect(prompt).toContain('Image 1 is the sole source for identity');
    expect(prompt).toContain('Image 2 is only a pose guide');
    expect(prompt).toContain(profile.identityLock);
    expect(prompt).toContain('strict 90-degree orthographic right-facing lateral profile');
  });

  it('selects only accepted frames that meet the minimum visibility score', () => {
    expect(selectBestHarvestFrame({ H01: 3, H04: 3, H08: 2 }, ['H01', 'H04', 'H08'])).toBe('H01');
    expect(selectBestHarvestFrame({ H01: 3, H04: 3 }, ['H04'])).toBe('H04');
    expect(selectBestHarvestFrame({ H03: 3 }, ['H03'])).toBe('H03');
    expect(selectBestHarvestFrame({ H03: 3 }, ['H03'], 3)).toBe('H03');
    expect(selectBestHarvestFrame({ H03: 1 }, ['H03'])).toBeNull();
    expect(selectBestHarvestFrame({ H01: 3 }, ['H03'])).toBeNull();
  });

  it('never selects a conditional or rejected frame from the manifest', () => {
    const base = createPoseBankScaffold(profile, 'master-hash', 'guides', 'prompts').manifest;
    const manifest = {
      ...base,
      frames: base.frames.map((frame) => {
        if (frame.key === 'H01') return { ...frame, status: 'conditional' as const, visibility: { torso: 3 as const } };
        if (frame.key === 'H02') return { ...frame, status: 'accepted' as const, visibility: { torso: 2 as const } };
        return frame;
      }),
    };
    expect(selectManifestHarvestFrame(manifest, 'torso')).toBe('H02');
  });

  it('requires pose variants to retain immutable source and alignment metadata', () => {
    const base = {
      variantId: 'nearFoot-toeoff-v1',
      canonicalPartId: 'nearFoot',
      sourceFrameKey: 'H03' as const,
      sourceCandidatePath: 'candidates/H03.png',
      sourceCandidateSha256: 'abc123',
      reason: 'genuine toe-off shoe silhouette change',
      pivot: { x: 74, y: 116 },
      scale: 1,
      paletteId: 'runner-red-v1',
    };
    expect(() => assertJigPoseVariant(base)).not.toThrow();
    expect(() => assertJigPoseVariant({ ...base, sourceCandidateSha256: '' })).toThrow(/immutable source/);
    expect(() => assertJigPoseVariant({ ...base, reason: '' })).toThrow(/reason/);
  });
});
