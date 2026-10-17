import type {
  BodyPartId,
  Point2D,
  RasterImage,
  RunnerPalette,
  RunnerPersonaId,
} from '../shared/types.js';

export type HairStyleKind = 'male-taper-fade' | 'female-ponytail';
export type TopGarmentCut = 'athletic-singlet' | 'racerback-crop';
export type ShortsGarmentCut = 'split-track-shorts' | 'sculpted-sprinter-shorts';

export interface SkinPartTransform {
  readonly partId: BodyPartId;
  readonly origin: Point2D;
  readonly end: Point2D;
  readonly angleRad: number;
  readonly lengthPx: number;
}

export type SkinPartRenderHook = (
  canvas: RasterImage,
  transform: SkinPartTransform,
  palette: RunnerPalette,
) => void;

export interface SkinAnthropometrics {
  readonly torsoLength: number;
  readonly neckLength: number;
  readonly headRadius: number;
  readonly shoulderRadius: number;
  readonly waistRadius: number;
  readonly pelvisRadius: number;
  readonly thighRadius: number;
  readonly kneeRadius: number;
  readonly shinRadius: number;
  readonly ankleRadius: number;
  readonly upperArmRadius: number;
  readonly elbowRadius: number;
  readonly forearmRadius: number;
  readonly wristRadius: number;
  readonly neckRadius: number;
  readonly defaultForwardLeanDeg: number;
}

export interface RunnerSkinDefinition {
  readonly id: RunnerPersonaId;
  readonly title: string;
  readonly subtitle: string;
  readonly badgeLabel: string;
  readonly complexionNear: string;
  readonly complexionFar: string;
  readonly hairColor: string;
  readonly hairHighlight: string;
  readonly hairTieAccent: string;
  readonly wristbandColor: string;
  readonly hairStyle: HairStyleKind;
  readonly topCut: TopGarmentCut;
  readonly shortsCut: ShortsGarmentCut;
  readonly anthropometrics: SkinAnthropometrics;
  readonly partHooks?: Partial<Record<BodyPartId, SkinPartRenderHook>>;
  readonly customPartRasters?: Partial<Record<BodyPartId, RasterImage>>;
}

export const SG_CHINESE_MALE_SKIN: RunnerSkinDefinition = {
  id: 'sg-chinese-male',
  title: 'Singapore Chinese Male Runner',
  subtitle: 'Wei Jie — National Stadium 100m/400m Sprinter (Taper-Fade Crop & Track Singlet)',
  badgeLabel: 'SG CHINESE MALE',
  complexionNear: '#F0BE95',
  complexionFar: '#C89269',
  hairColor: '#1C1512',
  hairHighlight: '#382B24',
  hairTieAccent: '#E11D48',
  wristbandColor: '#F8FAFC',
  hairStyle: 'male-taper-fade',
  topCut: 'athletic-singlet',
  shortsCut: 'split-track-shorts',
  anthropometrics: {
    torsoLength: 47,
    neckLength: 11,
    headRadius: 14.5,
    shoulderRadius: 14.8,
    waistRadius: 11.4,
    pelvisRadius: 12.6,
    thighRadius: 10.6,
    kneeRadius: 7.2,
    shinRadius: 7.0,
    ankleRadius: 4.8,
    upperArmRadius: 7.2,
    elbowRadius: 5.5,
    forearmRadius: 5.4,
    wristRadius: 4.4,
    neckRadius: 5.4,
    defaultForwardLeanDeg: 20,
  },
};

export const SG_CHINESE_FEMALE_SKIN: RunnerSkinDefinition = {
  id: 'sg-chinese-female',
  title: 'Singapore Chinese Female Runner',
  subtitle: 'Hui Min — Marina Bay Sprint & Ekiden Athlete (Articulated Ponytail & Racerback)',
  badgeLabel: 'SG CHINESE FEMALE',
  complexionNear: '#F6CBA5',
  complexionFar: '#CFA07A',
  hairColor: '#181210',
  hairHighlight: '#362722',
  hairTieAccent: '#FB7185',
  wristbandColor: '#38BDF8',
  hairStyle: 'female-ponytail',
  topCut: 'racerback-crop',
  shortsCut: 'sculpted-sprinter-shorts',
  anthropometrics: {
    torsoLength: 44,
    neckLength: 12,
    headRadius: 13.8,
    shoulderRadius: 12.2,
    waistRadius: 9.4,
    pelvisRadius: 12.2,
    thighRadius: 9.6,
    kneeRadius: 6.4,
    shinRadius: 6.2,
    ankleRadius: 4.2,
    upperArmRadius: 5.8,
    elbowRadius: 4.6,
    forearmRadius: 4.5,
    wristRadius: 3.8,
    neckRadius: 4.5,
    defaultForwardLeanDeg: 21,
  },
};

export const PHOTO_SG_CHINESE_FEMALE_SKIN: RunnerSkinDefinition = {
  id: 'photo-sg-chinese-female',
  title: 'Photorealistic SG Chinese Female',
  subtitle:
    'Hui Min (Photoreal Rig) — 10-Asset Studio Cutouts with Lateral (Outside) Near Limbs & Medial (Inside) Far Limbs/Palm/Shoe',
  badgeLabel: 'PHOTOREALISTIC FEMALE (17 CUTOUTS)',
  complexionNear: '#F2BF96',
  complexionFar: '#C8926B',
  hairColor: '#161110',
  hairHighlight: '#322520',
  hairTieAccent: '#BE123C',
  wristbandColor: '#38BDF8',
  hairStyle: 'female-ponytail',
  topCut: 'racerback-crop',
  shortsCut: 'sculpted-sprinter-shorts',
  anthropometrics: {
    torsoLength: 44,
    neckLength: 12,
    headRadius: 13.8,
    shoulderRadius: 12.2,
    waistRadius: 9.4,
    pelvisRadius: 12.2,
    thighRadius: 9.6,
    kneeRadius: 6.4,
    shinRadius: 6.2,
    ankleRadius: 4.2,
    upperArmRadius: 5.8,
    elbowRadius: 4.6,
    forearmRadius: 4.5,
    wristRadius: 3.8,
    neckRadius: 4.5,
    defaultForwardLeanDeg: 22,
  },
};

const SKIN_REGISTRY = new Map<string, RunnerSkinDefinition>([
  [SG_CHINESE_MALE_SKIN.id, SG_CHINESE_MALE_SKIN],
  [SG_CHINESE_FEMALE_SKIN.id, SG_CHINESE_FEMALE_SKIN],
  [PHOTO_SG_CHINESE_FEMALE_SKIN.id, PHOTO_SG_CHINESE_FEMALE_SKIN],
]);

export const PERSONA_SKINS: readonly RunnerSkinDefinition[] = [
  SG_CHINESE_MALE_SKIN,
  SG_CHINESE_FEMALE_SKIN,
  PHOTO_SG_CHINESE_FEMALE_SKIN,
];

export function isPhotorealPersona(personaId: RunnerPersonaId): boolean {
  return personaId === 'photo-sg-chinese-female';
}

export function resolveRunnerSkin(personaId: RunnerPersonaId): RunnerSkinDefinition {
  return SKIN_REGISTRY.get(personaId) ?? SG_CHINESE_MALE_SKIN;
}

export function registerCustomSkin(skin: RunnerSkinDefinition): RunnerSkinDefinition {
  SKIN_REGISTRY.set(skin.id, skin);
  return skin;
}

export function attachSkinPartHook(
  skin: RunnerSkinDefinition,
  partId: BodyPartId,
  hook: SkinPartRenderHook,
): RunnerSkinDefinition {
  return {
    ...skin,
    partHooks: {
      ...(skin.partHooks ?? {}),
      [partId]: hook,
    },
  };
}

export function applyPersonaSkinToPalette(
  basePalette: RunnerPalette,
  skin: RunnerSkinDefinition,
): RunnerPalette {
  return {
    ...basePalette,
    skinNear: skin.complexionNear,
    skinFar: skin.complexionFar,
    hairMain: skin.hairColor,
  };
}
