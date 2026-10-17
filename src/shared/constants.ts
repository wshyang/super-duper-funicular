import type { GaitSettings, MotionId, Palette, PaletteId, Persona, PersonaId } from './types.ts';

export const APP_NAME = 'Funicular Motion Lab';
export const APP_VERSION = '0.1.0';

export const CANVAS = { width: 260, height: 340, groundY: 318 } as const;

export const PALETTES: readonly Palette[] = [
  {
    id: 'red',
    label: 'Crimson',
    primary: '#c02822',
    primaryDark: '#8f1a16',
    accent: '#f4d7d5',
    shorts: '#333a4a',
  },
  {
    id: 'blue',
    label: 'Cobalt',
    primary: '#2a62c9',
    primaryDark: '#1c478f',
    accent: '#d7e3f8',
    shorts: '#31384a',
  },
  {
    id: 'green',
    label: 'Leaf',
    primary: '#259d24',
    primaryDark: '#176f17',
    accent: '#d9f2d7',
    shorts: '#2f3744',
  },
  {
    id: 'yellow',
    label: 'Sunshine',
    primary: '#e6c90c',
    primaryDark: '#a89108',
    accent: '#fbf3c4',
    shorts: '#343a48',
  },
  {
    id: 'purple',
    label: 'Violet',
    primary: '#7a3097',
    primaryDark: '#55206a',
    accent: '#ecdcf4',
    shorts: '#323848',
  },
  {
    id: 'orange',
    label: 'Tangerine',
    primary: '#f87708',
    primaryDark: '#b95406',
    accent: '#fde4cd',
    shorts: '#343a48',
  },
] as const;

export const PALETTE_BY_ID: Readonly<Record<PaletteId, Palette>> = Object.fromEntries(
  PALETTES.map((palette) => [palette.id, palette]),
) as Record<PaletteId, Palette>;

export const PERSONAS: readonly Persona[] = [
  {
    id: 'wei-ming',
    name: 'Wei Ming',
    pronoun: 'he/him',
    skin: '#c68a5c',
    skinShade: '#a26b43',
    hair: '#1d1a18',
    scale: 1,
    ponytail: false,
  },
  {
    id: 'mei-lin',
    name: 'Mei Lin',
    pronoun: 'she/her',
    skin: '#d7a077',
    skinShade: '#b17e58',
    hair: '#191614',
    scale: 0.96,
    ponytail: true,
  },
] as const;

export const PERSONA_BY_ID: Readonly<Record<PersonaId, Persona>> = Object.fromEntries(
  PERSONAS.map((persona) => [persona.id, persona]),
) as Record<PersonaId, Persona>;

export const MOTIONS: readonly {
  id: MotionId;
  label: string;
  duty: number;
  description: string;
}[] = [
  { id: 'run', label: 'Run', duty: 0.38, description: 'Flight phase, long stride, driving arms.' },
  {
    id: 'brisk-walk',
    label: 'Brisk walk',
    duty: 0.56,
    description: 'Short double support, upright torso.',
  },
  { id: 'walk', label: 'Walk', duty: 0.62, description: 'Grounded double support, relaxed arms.' },
] as const;

export const MOTION_BY_ID = Object.fromEntries(
  MOTIONS.map((motion) => [motion.id, motion]),
) as Record<MotionId, (typeof MOTIONS)[number]>;

export const DEFAULT_GAIT: GaitSettings = {
  persona: 'mei-lin',
  palette: 'red',
  motion: 'run',
  cadence: 0.82,
  stride: 1,
  footLift: 1,
  lean: 1,
};

export const PHASE_STEP = 1 / 8;

export const PART_ORDER = [
  'farUpperArm',
  'farForearm',
  'farHand',
  'farThigh',
  'farShin',
  'farFoot',
  'pelvis',
  'neck',
  'hairAccessory',
  'torso',
  'head',
  'nearThigh',
  'nearShin',
  'nearFoot',
  'nearUpperArm',
  'nearForearm',
  'nearHand',
] as const;

export const PART_LABELS: Readonly<Record<string, string>> = {
  farUpperArm: 'Far upper arm',
  farForearm: 'Far forearm',
  farHand: 'Far hand',
  farThigh: 'Far thigh',
  farShin: 'Far shin',
  farFoot: 'Far shoe',
  pelvis: 'Pelvis / shorts',
  neck: 'Cervical neck',
  hairAccessory: 'Hair accessory',
  torso: 'Torso / singlet',
  head: 'Head',
  nearThigh: 'Near thigh',
  nearShin: 'Near shin',
  nearFoot: 'Near shoe',
  nearUpperArm: 'Near upper arm',
  nearForearm: 'Near forearm',
  nearHand: 'Near hand',
};
