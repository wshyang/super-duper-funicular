import { describe, expect, it } from 'vitest';
import type { Point2D } from '../shared/types.js';
import {
  applyAssetTuningToRigSpec,
  ARM_SWING_PRESETS,
  ARTICULATED_BODY_PARTS,
  DEFAULT_GAIT_CONFIG,
  DEFAULT_RIG_SPEC,
  PHOTOREAL_ASSET_TUNING_DEFAULTS,
} from './body-proportions.js';
import { solveArticulatedPose } from './gait.js';
import { RUNNER_PALETTES } from './palette.js';
import {
  renderIsolatedBodyPartToRaster,
  renderRunnerPoseToRaster,
} from './rasterizer.js';
import {
  attachSkinPartHook,
  registerCustomSkin,
  resolveRunnerSkin,
  SG_CHINESE_FEMALE_SKIN,
} from './skin-registry.js';
import { solveTwoBoneIk } from './two-bone-ik.js';

function dist2D(a: Point2D, b: Point2D): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

describe('Analytical 2-Bone IK Solver', () => {
  it('preserves exact upper and lower bone lengths for reachable targets', () => {
    const root = { x: 100, y: 120 };
    const target = { x: 125, y: 195 };
    const solved = solveTwoBoneIk(root, target, {
      upperLength: 45,
      lowerLength: 45,
      bendDirection: 'knee-forward',
    });

    const dUpper = dist2D(root, solved.midJoint);
    const dLower = dist2D(solved.midJoint, solved.endEffector);
    expect(dUpper).toBeCloseTo(45, 3);
    expect(dLower).toBeCloseTo(45, 3);
    expect(dist2D(solved.endEffector, target)).toBeLessThan(0.5);
  });

  it('clamps unreachable distant targets without NaN or bone stretching', () => {
    const root = { x: 100, y: 100 };
    const farTarget = { x: 300, y: 300 };
    const solved = solveTwoBoneIk(root, farTarget, {
      upperLength: 30,
      lowerLength: 27,
      bendDirection: 'elbow-back',
    });

    expect(Number.isFinite(solved.midJoint.x)).toBe(true);
    expect(Number.isFinite(solved.endEffector.y)).toBe(true);
    const totalReach = dist2D(root, solved.endEffector);
    expect(totalReach).toBeLessThanOrEqual(57.01);
  });
});

describe('Biomechanical Gait Solver: Neck Articulation, Foot Roll & Forward Fall', () => {
  const canonicalPoses = Array.from({ length: 8 }, (_, idx) =>
    solveArticulatedPose(idx / 8, DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC),
  );

  it('produces 8 distinct canonical poses with positive/negative ankle crossover', () => {
    expect(canonicalPoses).toHaveLength(8);
    const deltas = canonicalPoses.map((p) => p.footCrossoverDeltaX);
    expect(Math.max(...deltas)).toBeGreaterThan(25);
    expect(Math.min(...deltas)).toBeLessThan(-25);

    for (let i = 0; i < 4; i++) {
      const firstHalf = canonicalPoses[i]!;
      const secondHalf = canonicalPoses[i + 4]!;
      expect(Math.sign(firstHalf.footCrossoverDeltaX)).toBe(
        -Math.sign(secondHalf.footCrossoverDeltaX),
      );
    }
  });

  it('articulates the cervical neck independently between the torso collar and head', () => {
    const neckRelativeAngles = canonicalPoses.map((p) => p.neckAngleRad - p.torsoAngleRad);
    const minRel = Math.min(...neckRelativeAngles);
    const maxRel = Math.max(...neckRelativeAngles);

    expect(maxRel - minRel).toBeGreaterThan(0.18);
    for (const pose of canonicalPoses) {
      const neckBoneLen = dist2D(pose.collar, pose.neck);
      expect(neckBoneLen).toBeCloseTo(DEFAULT_RIG_SPEC.neckLength, 2);
      expect(pose.headCenter.y).toBeLessThan(pose.neck.y);
      expect(pose.neck.y).toBeLessThan(pose.collar.y);
    }
  });

  it('models midfoot strike rolling forward onto the ball and toes (heel-off -> toe-off)', () => {
    const poseStrike = solveArticulatedPose(0.0, DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC);
    const poseSoleRoll = solveArticulatedPose(0.125, DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC);
    const poseHeelOff = solveArticulatedPose(0.25, DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC);
    const poseToeOff = solveArticulatedPose(0.375, DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC);

    expect(poseStrike.nearLeg.contactPhase).toBe('midfoot-strike');
    expect(poseStrike.nearLeg.toeAngleRad).toBeLessThan(-0.15);

    expect(poseSoleRoll.nearLeg.contactPhase).toBe('sole-roll');
    expect(poseSoleRoll.nearLeg.isGrounded).toBe(true);

    expect(poseHeelOff.nearLeg.contactPhase).toBe('heel-off-roll');
    expect(poseHeelOff.nearLeg.isGrounded).toBe(true);
    expect(poseHeelOff.nearLeg.heelLiftPx).toBeGreaterThan(8);
    expect(poseHeelOff.nearLeg.heelPoint.y).toBeLessThan(poseHeelOff.nearLeg.ballPoint.y - 8);

    expect(poseToeOff.nearLeg.contactPhase).toBe('toe-off');
    expect(poseToeOff.nearLeg.toeAngleRad).toBeGreaterThan(0.6);
  });

  it('maintains a continuous forward-falling center-of-mass posture across all phases', () => {
    for (const pose of canonicalPoses) {
      expect(pose.fallForwardComLeadPx).toBeGreaterThan(10);
      expect(pose.collar.x).toBeGreaterThan(pose.pelvis.x + 12);
    }
  });

  it('supports walk and brisk-walk locomotion profiles with zero flight phase and double support', () => {
    for (const mode of ['walk', 'brisk-walk'] as const) {
      const modeConfig = { ...DEFAULT_GAIT_CONFIG, locomotionMode: mode };
      const poses = Array.from({ length: 16 }, (_, i) =>
        solveArticulatedPose(i / 16, modeConfig, DEFAULT_RIG_SPEC),
      );
      expect(poses.every((p) => !p.isFlightPhase)).toBe(true);
      expect(
        poses.some((p) => p.nearLeg.isGrounded && p.farLeg.isGrounded),
      ).toBe(true);
    }
  });
});

describe('Skinnable Sprite Hooks & Dual Singapore Chinese Male/Female Personas', () => {
  it('renders distinct sprites for sg-chinese-male and sg-chinese-female personas', () => {
    const pose = solveArticulatedPose(0.125, DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC);
    const maleRaster = renderRunnerPoseToRaster({
      pose,
      palette: RUNNER_PALETTES.red,
      pixelScale: 1,
      personaId: 'sg-chinese-male',
    });
    const femaleRaster = renderRunnerPoseToRaster({
      pose,
      palette: RUNNER_PALETTES.red,
      pixelScale: 1,
      personaId: 'sg-chinese-female',
    });

    expect(maleRaster.width).toBe(220);
    expect(femaleRaster.width).toBe(220);
    let diffPixels = 0;
    for (let i = 0; i < maleRaster.data.length; i += 4) {
      if (
        maleRaster.data[i] !== femaleRaster.data[i] ||
        maleRaster.data[i + 3] !== femaleRaster.data[i + 3]
      ) {
        diffPixels++;
      }
    }
    expect(diffPixels).toBeGreaterThan(80);
  });

  it('supports custom skin registration and per-part render hooks', () => {
    let hookInvoked = false;
    const hookedSkin = attachSkinPartHook(SG_CHINESE_FEMALE_SKIN, 'neck', () => {
      hookInvoked = true;
    });
    registerCustomSkin(hookedSkin);
    const resolved = resolveRunnerSkin('sg-chinese-female');
    expect(resolved.id).toBe('sg-chinese-female');

    const pose = solveArticulatedPose(0.25, DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC);
    renderRunnerPoseToRaster({
      pose,
      palette: RUNNER_PALETTES.blue,
      pixelScale: 1,
      personaId: 'sg-chinese-female',
      customSkin: hookedSkin,
    });
    expect(hookInvoked).toBe(true);
    registerCustomSkin(SG_CHINESE_FEMALE_SKIN);
  });

  it('renders all 17 articulated body parts including neck and hairAccessory for both personas', () => {
    expect(ARTICULATED_BODY_PARTS).toHaveLength(17);
    for (const part of ARTICULATED_BODY_PARTS) {
      const maleCutout = renderIsolatedBodyPartToRaster(
        part.partId,
        RUNNER_PALETTES.red,
        'sg-chinese-male',
      );
      const femaleCutout = renderIsolatedBodyPartToRaster(
        part.partId,
        RUNNER_PALETTES.red,
        'sg-chinese-female',
      );
      expect(maleCutout.width).toBe(96);
      expect(femaleCutout.height).toBe(96);
    }
  });

  it('calibrates upper-limb proportions to natural female anthropometric ratios (no T-rex arms and elbow at waist above hips)', () => {
    expect(DEFAULT_RIG_SPEC.upperArmLength).toBeGreaterThanOrEqual(23);
    expect(DEFAULT_RIG_SPEC.upperArmLength).toBeLessThanOrEqual(26);
    expect(DEFAULT_RIG_SPEC.forearmLength).toBeGreaterThanOrEqual(20);
    expect(DEFAULT_RIG_SPEC.forearmLength).toBeLessThanOrEqual(23);
    for (let i = 0; i < 8; i++) {
      const pose = solveArticulatedPose(i / 8, DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC);
      expect(pose.nearArm.midJoint.y).toBeLessThan(pose.pelvis.y - 10);
    }
  });

  it('supports tuneable arm-swing carry parameters (hands close to chest vs. large power swing) and optional/flowing hair dynamics', () => {
    expect(ARM_SWING_PRESETS).toHaveLength(4);
    const sprintPose = solveArticulatedPose(
      0.0,
      { ...DEFAULT_GAIT_CONFIG, armCarryFlexDeg: 72, armChestBiasDeg: 0 },
      DEFAULT_RIG_SPEC,
    );
    const chestCarryPose = solveArticulatedPose(
      0.0,
      { ...DEFAULT_GAIT_CONFIG, armCarryFlexDeg: 112, armChestBiasDeg: 18 },
      DEFAULT_RIG_SPEC,
    );
    expect(chestCarryPose.nearArm.endEffector.y).toBeLessThan(
      sprintPose.nearArm.endEffector.y - 4,
    );

    const flowingPose = solveArticulatedPose(
      0.25,
      { ...DEFAULT_GAIT_CONFIG, hairStyleMode: 'long-flowing', hairSwingScale: 1.2 },
      DEFAULT_RIG_SPEC,
    );
    const noHairPose = solveArticulatedPose(
      0.25,
      { ...DEFAULT_GAIT_CONFIG, hairStyleMode: 'none' },
      DEFAULT_RIG_SPEC,
    );
    expect(flowingPose.hairStyleMode).toBe('long-flowing');
    expect(noHairPose.hairStyleMode).toBe('none');
    expect(flowingPose.hairTip.y).toBeGreaterThan(flowingPose.hairAnchor.y + 8);

    const avgTuning = PHOTOREAL_ASSET_TUNING_DEFAULTS['photo-sg-chinese-female-average'];
    const athleticTuning = PHOTOREAL_ASSET_TUNING_DEFAULTS['photo-sg-chinese-female'];
    expect(avgTuning.torsoWidthPx).toBeGreaterThan(athleticTuning.torsoWidthPx);
    expect(avgTuning.pelvisWidthPx).toBeGreaterThan(athleticTuning.pelvisWidthPx);
    expect(avgTuning.thighWidthPx).toBeGreaterThan(athleticTuning.thighWidthPx);
    const armTotal = DEFAULT_RIG_SPEC.upperArmLength + DEFAULT_RIG_SPEC.forearmLength;
    const legTotal = DEFAULT_RIG_SPEC.thighLength + DEFAULT_RIG_SPEC.shinLength;
    expect(armTotal / legTotal).toBeGreaterThanOrEqual(0.51);
    expect(armTotal / legTotal).toBeLessThanOrEqual(0.57);
    const tunedRig = applyAssetTuningToRigSpec(DEFAULT_RIG_SPEC, avgTuning);
    expect(tunedRig.upperArmLength).toBeCloseTo(
      DEFAULT_RIG_SPEC.upperArmLength * avgTuning.upperArmLengthScale,
      1,
    );
  });
});
