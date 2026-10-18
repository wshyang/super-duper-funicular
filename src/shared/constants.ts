import type { MotionId, MotionProfile, Palette, PaletteId, Persona, PersonaId } from './types';

export const APP_NAME = 'Funicular Motion Lab';
export const STAGE_SIZE = { width: 920, height: 520, groundY: 430 } as const;
export const FOOT_SHAPE = { heelX: -17, toeX: 37, topY: -5, soleY: 12, radius: 8 } as const;
export const FRAME_STEP = 1 / 8;

export const PALETTES: readonly Palette[] = [
  {
    id: 'red',
    label: 'Crimson',
    primary: '#c23b3b',
    shade: '#87282d',
    accent: '#ffd5c8',
    shorts: '#273447',
  },
  {
    id: 'blue',
    label: 'Cobalt',
    primary: '#337ad2',
    shade: '#20549a',
    accent: '#d5e9ff',
    shorts: '#273447',
  },
  {
    id: 'green',
    label: 'Fern',
    primary: '#3eae56',
    shade: '#24743a',
    accent: '#d4f2d5',
    shorts: '#273447',
  },
  {
    id: 'yellow',
    label: 'Sunrise',
    primary: '#e4c830',
    shade: '#9e781c',
    accent: '#fff3b8',
    shorts: '#273447',
  },
  {
    id: 'purple',
    label: 'Iris',
    primary: '#9250ba',
    shade: '#5e337e',
    accent: '#f1dcff',
    shorts: '#273447',
  },
  {
    id: 'orange',
    label: 'Clementine',
    primary: '#ed7b2c',
    shade: '#a94d21',
    accent: '#ffe1bd',
    shorts: '#273447',
  },
] as const;

export const PALETTE_BY_ID: Readonly<Record<PaletteId, Palette>> = Object.fromEntries(
  PALETTES.map((palette) => [palette.id, palette]),
) as Record<PaletteId, Palette>;

export const PERSONAS: readonly Persona[] = [
  { id: 'sprinter', label: 'Sprinter', scale: 1, headScale: 1, ponytail: false },
  { id: 'strider', label: 'Strider', scale: 0.96, headScale: 1.08, ponytail: true },
] as const;

export const PERSONA_BY_ID: Readonly<Record<PersonaId, Persona>> = Object.fromEntries(
  PERSONAS.map((persona) => [persona.id, persona]),
) as Record<PersonaId, Persona>;

export const MOTION_PROFILES: readonly MotionProfile[] = [
  {
    id: 'run',
    label: 'Run',
    cadence: 168,
    dutyFactor: 0.38,
    stride: 160,
    lift: 72,
    leanDeg: 11,
    flight: true,
  },
  {
    id: 'walk',
    label: 'Walk',
    cadence: 108,
    dutyFactor: 0.62,
    stride: 96,
    lift: 24,
    leanDeg: 2,
    flight: false,
  },
  {
    id: 'brisk-walk',
    label: 'Brisk walk',
    cadence: 132,
    dutyFactor: 0.56,
    stride: 124,
    lift: 32,
    leanDeg: 4,
    flight: false,
  },
] as const;

export const MOTION_BY_ID: Readonly<Record<MotionId, MotionProfile>> = Object.fromEntries(
  MOTION_PROFILES.map((profile) => [profile.id, profile]),
) as Record<MotionId, MotionProfile>;

export const DEFAULT_SETTINGS = {
  persona: 'sprinter',
  palette: 'red',
  motion: 'run',
  speed: 1,
} as const;

export const SOURCE_PATH = 'incorrect running sprites.jpeg';
export const SOURCE_SHA256 = 'f99114235d61781f76a6b32c637edac16f13af6592a2866fe0e0528504727030';
export const NEAR_DUPLICATE_THRESHOLD = 0.78;
