import type { MotionId, MotionProfile, Persona, PersonaId } from '../../shared/types.ts';

/**
 * Body metrics: invariant bone lengths in rig pixels (CROSS-005 named
 * constants). The rig is a stylized planar kinematic model, not motion capture.
 */
export interface BodyMetrics {
  readonly femur: number;
  readonly tibia: number;
  readonly torso: number;
  readonly neck: number;
  readonly headRadius: number;
  readonly humerus: number;
  readonly forearm: number;
  readonly handRadius: number;
  readonly thighRadius: number;
  readonly shinRadius: number;
  readonly armRadius: number;
  readonly footLength: number;
  readonly footHeight: number;
}

export const BODY: BodyMetrics = {
  femur: 36,
  tibia: 34,
  torso: 31,
  neck: 8,
  headRadius: 9,
  humerus: 22,
  forearm: 19,
  handRadius: 4,
  thighRadius: 6,
  shinRadius: 4.5,
  armRadius: 4,
  footLength: 16,
  footHeight: 6,
};

/** The 17 articulated parts (FDS #obj-rig), back-to-front paint order. */
export const PART_IDS = [
  'far-upper-arm',
  'far-forearm',
  'far-hand',
  'far-thigh',
  'far-shin',
  'far-foot',
  'pelvis',
  'torso',
  'neck',
  'head',
  'hair',
  'near-thigh',
  'near-shin',
  'near-foot',
  'near-upper-arm',
  'near-forearm',
  'near-hand',
] as const;
export type PartId = (typeof PART_IDS)[number];

export const PART_COUNT = PART_IDS.length;

export const PERSONAS: Readonly<Record<PersonaId, Persona>> = {
  'wei-ming': {
    id: 'wei-ming',
    label: 'Wei Ming',
    scale: 1,
    palette: {
      skin: '#e8b088',
      skinFar: '#c98f68',
      hair: '#20242b',
      top: '#d8433c',
      bottom: '#37474f',
      shoe: '#eceff1',
      shoeFar: '#b0bec5',
    },
  },
  'mei-lin': {
    id: 'mei-lin',
    label: 'Mei Lin',
    scale: 0.96,
    palette: {
      skin: '#f0c09a',
      skinFar: '#d19d76',
      hair: '#2b1d16',
      top: '#7b4fa0',
      bottom: '#2f3b45',
      shoe: '#f6f1ec',
      shoeFar: '#c8bfb6',
    },
  },
};

export const PERSONA_IDS: readonly PersonaId[] = ['wei-ming', 'mei-lin'];

/** Motion profiles (FDS #obj-motion-profile, ADD-008 harmonised table). */
export const MOTION_PROFILES: Readonly<Record<MotionId, MotionProfile>> = {
  run: {
    id: 'run',
    label: 'Running',
    cadenceStepsPerMin: 168,
    stanceDuty: 0.36,
    doubleSupportDuty: 0,
    footTravelPx: 36,
    footLiftPx: 25,
    leanRad: (10 * Math.PI) / 180,
    armSwingRad: (52 * Math.PI) / 180,
    elbowFlexRad: (78 * Math.PI) / 180,
    pelvisHeightPx: 62,
  },
  walk: {
    id: 'walk',
    label: 'Walking',
    cadenceStepsPerMin: 108,
    stanceDuty: 0.62,
    doubleSupportDuty: 0.12,
    footTravelPx: 28,
    footLiftPx: 7,
    leanRad: (2 * Math.PI) / 180,
    armSwingRad: (24 * Math.PI) / 180,
    elbowFlexRad: (18 * Math.PI) / 180,
    pelvisHeightPx: 60,
  },
  'brisk-walk': {
    id: 'brisk-walk',
    label: 'Brisk walking',
    cadenceStepsPerMin: 132,
    stanceDuty: 0.56,
    doubleSupportDuty: 0.06,
    footTravelPx: 32,
    footLiftPx: 9,
    leanRad: (4 * Math.PI) / 180,
    armSwingRad: (34 * Math.PI) / 180,
    elbowFlexRad: (30 * Math.PI) / 180,
    pelvisHeightPx: 61,
  },
};

export const MOTION_IDS: readonly MotionProfile['id'][] = ['run', 'walk', 'brisk-walk'];
