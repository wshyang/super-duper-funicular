import { describe, expect, it } from 'vitest';
import { applyAssetTuningToRigSpec, DEFAULT_RIG_SPEC, PHOTOREAL_ASSET_TUNING_DEFAULTS } from './body-proportions.js';
import { PERSONA_REFERENCE_DIMENSIONS, referencePercent } from './persona-reference.js';
import { solveStandingUprightPose } from './standing-pose.js';

describe('Neutral standing profile calibration', () => {
  it('places each persona upright on the shared ground baseline with no gait lean', () => {
    for (const personaId of Object.keys(PHOTOREAL_ASSET_TUNING_DEFAULTS) as Array<keyof typeof PHOTOREAL_ASSET_TUNING_DEFAULTS>) {
      const tuning = PHOTOREAL_ASSET_TUNING_DEFAULTS[personaId];
      const rig = applyAssetTuningToRigSpec(DEFAULT_RIG_SPEC, tuning);
      const pose = solveStandingUprightPose(rig);
      expect(pose.torsoAngleRad).toBeCloseTo(-Math.PI / 2, 6);
      expect(pose.nearLeg.isGrounded).toBe(true);
      expect(pose.farLeg.isGrounded).toBe(true);
      expect(pose.nearLeg.endEffector.y).toBe(rig.groundY - 8);
      expect(pose.nearLeg.hipOrShoulder.y).toBeLessThan(pose.nearLeg.midJoint.y);
      expect(pose.nearArm.midJoint.y).toBeGreaterThan(pose.nearArm.hipOrShoulder.y);
      expect(pose.nearArm.endEffector.y).toBeGreaterThan(pose.nearArm.midJoint.y);
      expect(tuning.estimatedHeightCm).toBeGreaterThan(145);
      expect(tuning.estimatedHeightCm).toBeLessThan(175);
    }
  });

  it('derives portrait arm segment defaults from the source-profile measurements', () => {
    for (const personaId of Object.keys(PERSONA_REFERENCE_DIMENSIONS) as Array<keyof typeof PERSONA_REFERENCE_DIMENSIONS>) {
      const source = PERSONA_REFERENCE_DIMENSIONS[personaId];
      const tuning = PHOTOREAL_ASSET_TUNING_DEFAULTS[personaId];
      const rig = applyAssetTuningToRigSpec(DEFAULT_RIG_SPEC, tuning);
      const targetUpper = (source.upperArmLengthPx / source.thighLengthPx) * rig.thighLength;
      const targetForearm = (source.forearmLengthPx / source.shinLengthPx) * rig.shinLength;
      expect(rig.upperArmLength).toBeCloseTo(targetUpper, 0);
      expect(rig.forearmLength).toBeCloseTo(targetForearm, 0);
      expect(referencePercent(source.upperArmLengthPx, source)).toBeGreaterThan(14);
      expect(referencePercent(source.upperArmLengthPx, source)).toBeLessThan(18);
    }
  });

  it('creates taller torso proportions for fuller profiles while keeping editable, resettable values', () => {
    const petite = PHOTOREAL_ASSET_TUNING_DEFAULTS['photo-sg-chinese-female-petite'];
    const athletic = PHOTOREAL_ASSET_TUNING_DEFAULTS['photo-sg-chinese-female'];
    const average = PHOTOREAL_ASSET_TUNING_DEFAULTS['photo-sg-chinese-female-average'];
    expect(petite.torsoLengthScale).toBeGreaterThan(1);
    expect(athletic.torsoLengthScale).toBeGreaterThan(1);
    expect(average.torsoLengthScale).toBeGreaterThan(athletic.torsoLengthScale);
    expect(petite.upperArmLengthScale).toBeGreaterThan(1);
    expect(average.upperArmLengthScale).toBeGreaterThan(athletic.upperArmLengthScale);
  });
});
