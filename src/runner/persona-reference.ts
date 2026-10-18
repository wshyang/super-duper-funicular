import type { PhotorealPersonaId } from '../shared/types.js';

export interface PersonaReferenceDimensions {
  readonly estimatedHeightCm: number;
  readonly masterStandingHeightPx: number;
  readonly headLengthPx: number;
  readonly neckLengthPx: number;
  readonly torsoLengthPx: number;
  readonly pelvisLengthPx: number;
  readonly upperArmLengthPx: number;
  readonly forearmLengthPx: number;
  readonly handLengthPx: number;
  readonly thighLengthPx: number;
  readonly shinLengthPx: number;
  readonly shoeLengthPx: number;
  readonly headDepthPx: number;
  readonly neckWidthPx: number;
  readonly torsoWidthPx: number;
  readonly pelvisWidthPx: number;
  readonly upperArmWidthPx: number;
  readonly forearmWidthPx: number;
  readonly handWidthPx: number;
  readonly thighWidthPx: number;
  readonly shinWidthPx: number;
}

/** Approximate, by-eye source-profile measurements in master-plate pixels. */
export const PERSONA_REFERENCE_DIMENSIONS: Readonly<
  Record<PhotorealPersonaId, PersonaReferenceDimensions>
> = {
  'photo-sg-chinese-female-petite': {
    estimatedHeightCm: 152,
    masterStandingHeightPx: 692,
    headLengthPx: 93,
    neckLengthPx: 48,
    torsoLengthPx: 196,
    pelvisLengthPx: 82,
    upperArmLengthPx: 104,
    forearmLengthPx: 92,
    handLengthPx: 54,
    thighLengthPx: 153,
    shinLengthPx: 145,
    shoeLengthPx: 91,
    headDepthPx: 82,
    neckWidthPx: 33,
    torsoWidthPx: 74,
    pelvisWidthPx: 89,
    upperArmWidthPx: 33,
    forearmWidthPx: 29,
    handWidthPx: 25,
    thighWidthPx: 57,
    shinWidthPx: 44,
  },
  'photo-sg-chinese-female': {
    estimatedHeightCm: 166,
    masterStandingHeightPx: 712,
    headLengthPx: 95,
    neckLengthPx: 50,
    torsoLengthPx: 199,
    pelvisLengthPx: 91,
    upperArmLengthPx: 113,
    forearmLengthPx: 95,
    handLengthPx: 48,
    thighLengthPx: 159,
    shinLengthPx: 151,
    shoeLengthPx: 103,
    headDepthPx: 86,
    neckWidthPx: 38,
    torsoWidthPx: 87,
    pelvisWidthPx: 99,
    upperArmWidthPx: 41,
    forearmWidthPx: 34,
    handWidthPx: 28,
    thighWidthPx: 69,
    shinWidthPx: 50,
  },
  'photo-sg-chinese-female-average': {
    estimatedHeightCm: 161,
    masterStandingHeightPx: 710,
    headLengthPx: 99,
    neckLengthPx: 55,
    torsoLengthPx: 208,
    pelvisLengthPx: 94,
    upperArmLengthPx: 116,
    forearmLengthPx: 94,
    handLengthPx: 54,
    thighLengthPx: 154,
    shinLengthPx: 140,
    shoeLengthPx: 98,
    headDepthPx: 88,
    neckWidthPx: 45,
    torsoWidthPx: 118,
    pelvisWidthPx: 116,
    upperArmWidthPx: 49,
    forearmWidthPx: 39,
    handWidthPx: 31,
    thighWidthPx: 79,
    shinWidthPx: 57,
  },
};

export function referencePercent(
  dimensionPx: number,
  measurements: PersonaReferenceDimensions,
): number {
  return (dimensionPx / measurements.masterStandingHeightPx) * 100;
}

/**
 * Relative display scale for a future multi-persona stage. Standalone profile
 * calibration remains normalized; side-by-side personas use estimated heights.
 */
export function personaHeightScaleForComparison(
  personaId: PhotorealPersonaId,
  referencePersonaId: PhotorealPersonaId = 'photo-sg-chinese-female',
): number {
  const personaHeight = PERSONA_REFERENCE_DIMENSIONS[personaId].estimatedHeightCm;
  const referenceHeight = PERSONA_REFERENCE_DIMENSIONS[referencePersonaId].estimatedHeightCm;
  return personaHeight / referenceHeight;
}
