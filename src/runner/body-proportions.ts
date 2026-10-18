import type {
  AlgorithmicBodyPartEntry,
  ArmSwingStyleId,
  GaitConfig,
  LocomotionModeId,
  PhotorealAssetTuningSpec,
  PhotorealPersonaId,
} from '../shared/types.js';

export interface AnatomicalRigSpec {
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly groundY: number;
  readonly pelvisRestX: number;
  readonly pelvisRestY: number;
  readonly torsoLength: number;
  readonly neckLength: number;
  readonly headRadius: number;
  readonly ponytailLength: number;
  readonly upperArmLength: number;
  readonly forearmLength: number;
  readonly handRadius: number;
  readonly thighLength: number;
  readonly shinLength: number;
  readonly footLength: number;
  readonly heelOffsetLength: number;
  readonly midfootLength: number;
  readonly toeLength: number;
}

export const DEFAULT_RIG_SPEC: AnatomicalRigSpec = {
  canvasWidth: 220,
  canvasHeight: 256,
  groundY: 234,
  pelvisRestX: 94,
  pelvisRestY: 148,
  torsoLength: 43,
  neckLength: 13,
  headRadius: 13.5,
  ponytailLength: 26,
  upperArmLength: 24.5,
  forearmLength: 21.5,
  handRadius: 4.5,
  thighLength: 43,
  shinLength: 43,
  footLength: 28,
  heelOffsetLength: 6,
  midfootLength: 14,
  toeLength: 11,
};

export const DEFAULT_GAIT_CONFIG: GaitConfig = {
  cadenceHz: 1.55,
  strideLengthScale: 1.0,
  kneeDriveScale: 1.0,
  armSwingScale: 1.0,
  armCarryFlexDeg: 84,
  armChestBiasDeg: 4,
  hairStyleMode: 'ponytail',
  hairSwingScale: 1.0,
  forwardLeanDeg: 22,
  neckMotionScale: 1.0,
  footRollScale: 1.0,
  bounceAmplitudeScale: 1.0,
  pixelScale: 1,
  locomotionMode: 'run',
};

export const LOCOMOTION_MODE_DEFAULTS: Readonly<Record<LocomotionModeId, GaitConfig>> = {
  run: DEFAULT_GAIT_CONFIG,
  walk: {
    cadenceHz: 1.05,
    strideLengthScale: 0.78,
    kneeDriveScale: 0.65,
    armSwingScale: 0.65,
    armCarryFlexDeg: 58,
    armChestBiasDeg: -2,
    hairStyleMode: 'ponytail',
    hairSwingScale: 0.6,
    forwardLeanDeg: 8,
    neckMotionScale: 0.7,
    footRollScale: 0.9,
    bounceAmplitudeScale: 0.55,
    pixelScale: 1,
    locomotionMode: 'walk',
  },
  'brisk-walk': {
    cadenceHz: 1.35,
    strideLengthScale: 0.92,
    kneeDriveScale: 0.82,
    armSwingScale: 0.9,
    armCarryFlexDeg: 94,
    armChestBiasDeg: 10,
    hairStyleMode: 'ponytail',
    hairSwingScale: 0.85,
    forwardLeanDeg: 13,
    neckMotionScale: 0.85,
    footRollScale: 1.0,
    bounceAmplitudeScale: 0.75,
    pixelScale: 1,
    locomotionMode: 'brisk-walk',
  },
};

export interface ArmSwingPresetSpec {
  readonly id: ArmSwingStyleId;
  readonly label: string;
  readonly sub: string;
  readonly armSwingScale: number;
  readonly armCarryFlexDeg: number;
  readonly armChestBiasDeg: number;
}

export const ARM_SWING_PRESETS: readonly ArmSwingPresetSpec[] = [
  {
    id: 'athletic-sprint',
    label: 'Athletic Sprint Drive',
    sub: 'Balanced 84° elbow & full swing',
    armSwingScale: 1.0,
    armCarryFlexDeg: 84,
    armChestBiasDeg: 4,
  },
  {
    id: 'compact-chest-carry',
    label: 'Hands Close to Chest',
    sub: 'High 110° tuck & compact swing',
    armSwingScale: 0.58,
    armCarryFlexDeg: 110,
    armChestBiasDeg: 18,
  },
  {
    id: 'relaxed-jog',
    label: 'Relaxed Everyday Jog',
    sub: 'Soft 96° carry & gentle swing',
    armSwingScale: 0.76,
    armCarryFlexDeg: 96,
    armChestBiasDeg: 10,
  },
  {
    id: 'power-drive',
    label: 'Large Power Swing',
    sub: 'Wide 72° arc & maximum pump',
    armSwingScale: 1.35,
    armCarryFlexDeg: 72,
    armChestBiasDeg: 0,
  },
];

export const PHOTOREAL_ASSET_TUNING_DEFAULTS: Readonly<
  Record<PhotorealPersonaId, PhotorealAssetTuningSpec>
> = {
  'photo-sg-chinese-female': {
    personaId: 'photo-sg-chinese-female',
    buildLabel: 'Athletic Sprinter Proportions (Hui Min)',
    upperArmLengthScale: 1.0,
    forearmLengthScale: 1.0,
    upperArmWidthPx: 21.5,
    forearmWidthPx: 19.5,
    handWidthPx: 17.5,
    handLengthPx: 8.5,
    torsoWidthPx: 39.0,
    pelvisWidthPx: 27.5,
    thighWidthPx: 28.0,
    shinWidthPx: 27.5,
    shoulderOffsetX: -0.5,
    shoulderOffsetY: -2.0,
    hipOffsetY: 0.0,
    defaultArmCarryFlexDeg: 84,
    defaultArmChestBiasDeg: 4,
    defaultHairStyleMode: 'ponytail',
  },
  'photo-sg-chinese-female-average': {
    personaId: 'photo-sg-chinese-female-average',
    buildLabel: 'Average Everyday Body-Positive Proportions (Mei Ling)',
    upperArmLengthScale: 1.0,
    forearmLengthScale: 1.0,
    upperArmWidthPx: 24.5,
    forearmWidthPx: 21.5,
    handWidthPx: 18.0,
    handLengthPx: 8.5,
    torsoWidthPx: 45.0,
    pelvisWidthPx: 33.5,
    thighWidthPx: 32.5,
    shinWidthPx: 30.0,
    shoulderOffsetX: -1.0,
    shoulderOffsetY: -1.5,
    hipOffsetY: 0.5,
    defaultArmCarryFlexDeg: 94,
    defaultArmChestBiasDeg: 8,
    defaultHairStyleMode: 'long-flowing',
  },
};

export type PhotorealAssetTuningMap = Readonly<
  Record<PhotorealPersonaId, PhotorealAssetTuningSpec>
>;

export function createInitialAssetTuningMap(): PhotorealAssetTuningMap {
  return {
    'photo-sg-chinese-female': {
      ...PHOTOREAL_ASSET_TUNING_DEFAULTS['photo-sg-chinese-female'],
    },
    'photo-sg-chinese-female-average': {
      ...PHOTOREAL_ASSET_TUNING_DEFAULTS['photo-sg-chinese-female-average'],
    },
  };
}

export function applyAssetTuningToRigSpec(
  baseRig: AnatomicalRigSpec,
  tuning?: PhotorealAssetTuningSpec,
): AnatomicalRigSpec {
  if (!tuning) return baseRig;
  return {
    ...baseRig,
    upperArmLength: Number((baseRig.upperArmLength * tuning.upperArmLengthScale).toFixed(2)),
    forearmLength: Number((baseRig.forearmLength * tuning.forearmLengthScale).toFixed(2)),
  };
}

export type LocomotionConfigMap = Readonly<Record<LocomotionModeId, GaitConfig>>;

export function createInitialLocomotionConfigMap(): LocomotionConfigMap {
  return {
    run: { ...LOCOMOTION_MODE_DEFAULTS.run },
    walk: { ...LOCOMOTION_MODE_DEFAULTS.walk },
    'brisk-walk': { ...LOCOMOTION_MODE_DEFAULTS['brisk-walk'] },
  };
}

export function resetActiveLocomotionProfile(
  map: LocomotionConfigMap,
  mode: LocomotionModeId,
): LocomotionConfigMap {
  return {
    ...map,
    [mode]: { ...LOCOMOTION_MODE_DEFAULTS[mode] },
  };
}

const RAW_ARTICULATED_BODY_PARTS: readonly Omit<
  AlgorithmicBodyPartEntry,
  'photoFemaleAveragePublicUrl'
>[] = [
  {
    partId: 'farUpperArm',
    label: 'Far Upper Arm (Left Humerus)',
    layerOrder: 1,
    side: 'far',
    parentJoint: 'collar',
    childJoint: 'farElbow',
    lengthPx: DEFAULT_RIG_SPEC.upperArmLength,
    thicknessPx: 11,
    publicUrl: '/sprites/algorithmic/parts/sg-chinese-male/farUpperArm.png',
    femalePublicUrl: '/sprites/algorithmic/parts/sg-chinese-female/farUpperArm.png',
    photoFemalePublicUrl: '/sprites/algorithmic/parts/photo-sg-chinese-female/farUpperArm.png',
  },
  {
    partId: 'farForearm',
    label: 'Far Forearm (Left Radius/Ulna)',
    layerOrder: 2,
    side: 'far',
    parentJoint: 'farElbow',
    childJoint: 'farWrist',
    lengthPx: DEFAULT_RIG_SPEC.forearmLength,
    thicknessPx: 9,
    publicUrl: '/sprites/algorithmic/parts/sg-chinese-male/farForearm.png',
    femalePublicUrl: '/sprites/algorithmic/parts/sg-chinese-female/farForearm.png',
    photoFemalePublicUrl: '/sprites/algorithmic/parts/photo-sg-chinese-female/farForearm.png',
  },
  {
    partId: 'farHand',
    label: 'Far Hand (Left Inner Palm/Grip)',
    layerOrder: 3,
    side: 'far',
    parentJoint: 'farWrist',
    childJoint: 'farKnuckle',
    lengthPx: 8,
    thicknessPx: 8,
    publicUrl: '/sprites/algorithmic/parts/sg-chinese-male/farHand.png',
    femalePublicUrl: '/sprites/algorithmic/parts/sg-chinese-female/farHand.png',
    photoFemalePublicUrl: '/sprites/algorithmic/parts/photo-sg-chinese-female/farHand.png',
  },
  {
    partId: 'farThigh',
    label: 'Far Thigh (Left Inner/Medial Femur)',
    layerOrder: 4,
    side: 'far',
    parentJoint: 'pelvis',
    childJoint: 'farKnee',
    lengthPx: DEFAULT_RIG_SPEC.thighLength,
    thicknessPx: 16,
    publicUrl: '/sprites/algorithmic/parts/sg-chinese-male/farThigh.png',
    femalePublicUrl: '/sprites/algorithmic/parts/sg-chinese-female/farThigh.png',
    photoFemalePublicUrl: '/sprites/algorithmic/parts/photo-sg-chinese-female/farThigh.png',
  },
  {
    partId: 'farShin',
    label: 'Far Shin & Sock (Left Inner/Medial Tibia)',
    layerOrder: 5,
    side: 'far',
    parentJoint: 'farKnee',
    childJoint: 'farAnkle',
    lengthPx: DEFAULT_RIG_SPEC.shinLength,
    thicknessPx: 12,
    publicUrl: '/sprites/algorithmic/parts/sg-chinese-male/farShin.png',
    femalePublicUrl: '/sprites/algorithmic/parts/sg-chinese-female/farShin.png',
    photoFemalePublicUrl: '/sprites/algorithmic/parts/photo-sg-chinese-female/farShin.png',
  },
  {
    partId: 'farFoot',
    label: 'Far Articulated Foot (Inner Medial Arch → Toes)',
    layerOrder: 6,
    side: 'far',
    parentJoint: 'farAnkle',
    childJoint: 'farToe',
    lengthPx: DEFAULT_RIG_SPEC.footLength,
    thicknessPx: 9,
    publicUrl: '/sprites/algorithmic/parts/sg-chinese-male/farFoot.png',
    femalePublicUrl: '/sprites/algorithmic/parts/sg-chinese-female/farFoot.png',
    photoFemalePublicUrl: '/sprites/algorithmic/parts/photo-sg-chinese-female/farFoot.png',
  },
  {
    partId: 'pelvis',
    label: 'Pelvis & Track Shorts',
    layerOrder: 7,
    side: 'center',
    parentJoint: 'pelvis',
    childJoint: 'waist',
    lengthPx: 22,
    thicknessPx: 24,
    publicUrl: '/sprites/algorithmic/parts/sg-chinese-male/pelvis.png',
    femalePublicUrl: '/sprites/algorithmic/parts/sg-chinese-female/pelvis.png',
    photoFemalePublicUrl: '/sprites/algorithmic/parts/photo-sg-chinese-female/pelvis.png',
  },
  {
    partId: 'torso',
    label: 'Forward-Falling Torso & Singlet',
    layerOrder: 8,
    side: 'center',
    parentJoint: 'pelvis',
    childJoint: 'collar',
    lengthPx: DEFAULT_RIG_SPEC.torsoLength,
    thicknessPx: 26,
    publicUrl: '/sprites/algorithmic/parts/sg-chinese-male/torso.png',
    femalePublicUrl: '/sprites/algorithmic/parts/sg-chinese-female/torso.png',
    photoFemalePublicUrl: '/sprites/algorithmic/parts/photo-sg-chinese-female/torso.png',
  },
  {
    partId: 'neck',
    label: 'Articulated Cervical Neck Pivot',
    layerOrder: 9,
    side: 'center',
    parentJoint: 'collar',
    childJoint: 'neck',
    lengthPx: DEFAULT_RIG_SPEC.neckLength,
    thicknessPx: 10,
    publicUrl: '/sprites/algorithmic/parts/sg-chinese-male/neck.png',
    femalePublicUrl: '/sprites/algorithmic/parts/sg-chinese-female/neck.png',
    photoFemalePublicUrl: '/sprites/algorithmic/parts/photo-sg-chinese-female/neck.png',
  },
  {
    partId: 'hairAccessory',
    label: 'Articulated Hair / Dynamic Ponytail or Flowing Plume',
    layerOrder: 10,
    side: 'center',
    parentJoint: 'hairAnchor',
    childJoint: 'hairTip',
    lengthPx: DEFAULT_RIG_SPEC.ponytailLength,
    thicknessPx: 10,
    publicUrl: '/sprites/algorithmic/parts/sg-chinese-male/hairAccessory.png',
    femalePublicUrl: '/sprites/algorithmic/parts/sg-chinese-female/hairAccessory.png',
    photoFemalePublicUrl: '/sprites/algorithmic/parts/photo-sg-chinese-female/hairAccessory.png',
  },
  {
    partId: 'head',
    label: 'Articulated Head & Facial Profile',
    layerOrder: 11,
    side: 'center',
    parentJoint: 'neck',
    childJoint: 'crown',
    lengthPx: 28,
    thicknessPx: 26,
    publicUrl: '/sprites/algorithmic/parts/sg-chinese-male/head.png',
    femalePublicUrl: '/sprites/algorithmic/parts/sg-chinese-female/head.png',
    photoFemalePublicUrl: '/sprites/algorithmic/parts/photo-sg-chinese-female/head.png',
  },
  {
    partId: 'nearThigh',
    label: 'Near Thigh (Right Outer/Lateral Femur)',
    layerOrder: 12,
    side: 'near',
    parentJoint: 'pelvis',
    childJoint: 'nearKnee',
    lengthPx: DEFAULT_RIG_SPEC.thighLength,
    thicknessPx: 17,
    publicUrl: '/sprites/algorithmic/parts/sg-chinese-male/nearThigh.png',
    femalePublicUrl: '/sprites/algorithmic/parts/sg-chinese-female/nearThigh.png',
    photoFemalePublicUrl: '/sprites/algorithmic/parts/photo-sg-chinese-female/nearThigh.png',
  },
  {
    partId: 'nearShin',
    label: 'Near Shin & Sock (Right Outer/Lateral Tibia)',
    layerOrder: 13,
    side: 'near',
    parentJoint: 'nearKnee',
    childJoint: 'nearAnkle',
    lengthPx: DEFAULT_RIG_SPEC.shinLength,
    thicknessPx: 12,
    publicUrl: '/sprites/algorithmic/parts/sg-chinese-male/nearShin.png',
    femalePublicUrl: '/sprites/algorithmic/parts/sg-chinese-female/nearShin.png',
    photoFemalePublicUrl: '/sprites/algorithmic/parts/photo-sg-chinese-female/nearShin.png',
  },
  {
    partId: 'nearFoot',
    label: 'Near Articulated Foot (Outer Lateral Heel → Ball → Toes)',
    layerOrder: 14,
    side: 'near',
    parentJoint: 'nearAnkle',
    childJoint: 'nearToe',
    lengthPx: DEFAULT_RIG_SPEC.footLength,
    thicknessPx: 10,
    publicUrl: '/sprites/algorithmic/parts/sg-chinese-male/nearFoot.png',
    femalePublicUrl: '/sprites/algorithmic/parts/sg-chinese-female/nearFoot.png',
    photoFemalePublicUrl: '/sprites/algorithmic/parts/photo-sg-chinese-female/nearFoot.png',
  },
  {
    partId: 'nearUpperArm',
    label: 'Near Upper Arm (Right Outer/Lateral Humerus)',
    layerOrder: 15,
    side: 'near',
    parentJoint: 'collar',
    childJoint: 'nearElbow',
    lengthPx: DEFAULT_RIG_SPEC.upperArmLength,
    thicknessPx: 11,
    publicUrl: '/sprites/algorithmic/parts/sg-chinese-male/nearUpperArm.png',
    femalePublicUrl: '/sprites/algorithmic/parts/sg-chinese-female/nearUpperArm.png',
    photoFemalePublicUrl: '/sprites/algorithmic/parts/photo-sg-chinese-female/nearUpperArm.png',
  },
  {
    partId: 'nearForearm',
    label: 'Near Forearm (Right Outer/Lateral Radius/Ulna)',
    layerOrder: 16,
    side: 'near',
    parentJoint: 'nearElbow',
    childJoint: 'nearWrist',
    lengthPx: DEFAULT_RIG_SPEC.forearmLength,
    thicknessPx: 9,
    publicUrl: '/sprites/algorithmic/parts/sg-chinese-male/nearForearm.png',
    femalePublicUrl: '/sprites/algorithmic/parts/sg-chinese-female/nearForearm.png',
    photoFemalePublicUrl: '/sprites/algorithmic/parts/photo-sg-chinese-female/nearForearm.png',
  },
  {
    partId: 'nearHand',
    label: 'Near Hand & Wristband (Right Outer Dorsal Fist)',
    layerOrder: 17,
    side: 'near',
    parentJoint: 'nearWrist',
    childJoint: 'nearKnuckle',
    lengthPx: 8,
    thicknessPx: 8,
    publicUrl: '/sprites/algorithmic/parts/sg-chinese-male/nearHand.png',
    femalePublicUrl: '/sprites/algorithmic/parts/sg-chinese-female/nearHand.png',
    photoFemalePublicUrl: '/sprites/algorithmic/parts/photo-sg-chinese-female/nearHand.png',
  },
];

export const ARTICULATED_BODY_PARTS: readonly AlgorithmicBodyPartEntry[] =
  RAW_ARTICULATED_BODY_PARTS.map((entry) => ({
    ...entry,
    photoFemaleAveragePublicUrl: `/sprites/algorithmic/parts/photo-sg-chinese-female-average/${entry.partId}.png`,
  }));
