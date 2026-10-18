import type {
  AlgorithmicBodyPartEntry,
  ArticulatedPose,
  BackdropVariantId,
  GaitConfig,
  PhotorealAssetTuningSpec,
  Point2D,
  RunnerPersonaId,
  RunnerVariantId,
} from '../../shared/types.js';
import {
  ARTICULATED_BODY_PARTS,
  DEFAULT_GAIT_CONFIG,
  DEFAULT_RIG_SPEC,
  PHOTOREAL_ASSET_TUNING_DEFAULTS,
} from '../../runner/body-proportions.js';
import { CANONICAL_PHASE_NAMES, solveArticulatedPose } from '../../runner/gait.js';
import { RUNNER_PALETTES } from '../../runner/palette.js';
import { PERSONA_SKINS } from '../../runner/skin-registry.js';

export type StudioTabId =
  | 'all-in-one'
  | 'stage-comparison'
  | 'gait-filmstrip'
  | 'articulated-rig'
  | 'flaw-diagnostics';

export type OverlayVisibility = 'visible' | 'hidden';

export interface FilmstripFrameCard {
  readonly frameNumber: number;
  readonly phaseValue: number;
  readonly phaseFormatted: string;
  readonly phaseLabel: string;
  readonly algorithmicUrl: string;
  readonly extractedUrl: string;
  readonly leadLegLabel: string;
  readonly crossoverLabel: string;
  readonly extractedStatusBadge: string;
  readonly isDuplicateFrame: boolean;
  readonly isActiveFrame: boolean;
}

export interface ArticulatedPartReadout {
  readonly part: AlgorithmicBodyPartEntry;
  readonly cutoutUrl: string;
  readonly svgPartUrl: string;
  readonly liveAngleDegFormatted: string;
  readonly jointCoordsFormatted: string;
  readonly groundStateLabel: string;
}

export interface FootOrbitSample {
  readonly phase: number;
  readonly nearAnkle: Point2D;
  readonly farAnkle: Point2D;
}

export interface FormattedPoseSummary {
  readonly phaseFormatted: string;
  readonly frameBadge: string;
  readonly phaseName: string;
  readonly pelvisCoords: string;
  readonly neckAngleDeg: string;
  readonly fallForwardLeadPx: string;
  readonly footRollStatus: string;
  readonly nearKneeDeg: string;
  readonly farKneeDeg: string;
  readonly crossoverPx: string;
  readonly flightBadge: string;
  readonly extractedFlawWarning: string;
}

const DUPLICATE_IOU_BY_FRAME: readonly number[] = [
  1.0, 1.0, 1.0, 1.0, 0.964, 0.969, 0.881, 0.926,
];

export function buildFilmstripCards(
  variant: RunnerVariantId,
  activeFrameIndex: number,
  personaId: RunnerPersonaId = 'sg-chinese-male',
): FilmstripFrameCard[] {
  const cards: FilmstripFrameCard[] = [];
  for (let i = 0; i < 8; i++) {
    cards.push(createSingleFilmstripCard(variant, { index: i, activeFrameIndex, personaId }));
  }
  return cards;
}

interface CardBuildSpec {
  readonly index: number;
  readonly activeFrameIndex: number;
  readonly personaId: RunnerPersonaId;
}

function createSingleFilmstripCard(
  variant: RunnerVariantId,
  spec: CardBuildSpec,
): FilmstripFrameCard {
  const frameNumber = spec.index + 1;
  const phaseValue = spec.index / 8;
  const padded = String(frameNumber).padStart(2, '0');
  const isDuplicate = spec.index >= 4;
  const dupTarget = spec.index - 3;
  const iouPct = Math.round((DUPLICATE_IOU_BY_FRAME[spec.index] ?? 0.94) * 100);
  const statusBadge = isDuplicate
    ? `DUP OF F${dupTarget} (${iouPct}% IoU)`
    : `UNIQUE POSE #${frameNumber}`;
  return {
    frameNumber,
    phaseValue,
    phaseFormatted: `${Math.round(phaseValue * 360)}°`,
    phaseLabel: CANONICAL_PHASE_NAMES[spec.index] ?? 'Right Contact (Midfoot Strike)',
    algorithmicUrl: `/sprites/algorithmic/${spec.personaId}/${variant}/frame-${padded}.png`,
    extractedUrl: `/sprites/extracted/${variant}/frame-${padded}.png`,
    leadLegLabel: spec.index < 4 ? 'Right (Near) Lead' : 'Left (Far) Lead',
    crossoverLabel:
      spec.index === 2 || spec.index === 6 ? 'Heel-Off Roll & Crossover' : 'Midfoot Strike / Roll',
    extractedStatusBadge: statusBadge,
    isDuplicateFrame: isDuplicate,
    isActiveFrame: spec.index === spec.activeFrameIndex,
  };
}

export function buildFormattedPoseSummary(
  pose: ArticulatedPose,
): FormattedPoseSummary {
  const frameNum = pose.canonicalFrameIndex + 1;
  const nearKneeAngle = radToDegString(
    pose.nearLeg.lowerAngleRad - pose.nearLeg.upperAngleRad,
  );
  const farKneeAngle = radToDegString(
    pose.farLeg.lowerAngleRad - pose.farLeg.upperAngleRad,
  );
  const neckRelDeg = radToDegString(pose.neckAngleRad + Math.PI / 2);
  const activeFoot = pose.nearLeg.isGrounded ? pose.nearLeg : pose.farLeg;
  const footRollStatus = `${activeFoot.contactPhase} (heel lift ${activeFoot.heelLiftPx}px)`;
  const dupSource = frameNum > 4 ? frameNum - 4 : frameNum;
  const flawWarning =
    frameNum > 4
      ? `Frame ${frameNum} duplicates Frame ${dupSource} (no left/right leg swap; flat rigid foot)`
      : `Frame ${frameNum}: unilateral lead leg; rigid foot without midfoot-to-toe roll`;
  return {
    phaseFormatted: `${Math.round(pose.phase * 100)}% (${Math.round(pose.phase * 360)}°)`,
    frameBadge: `Frame ${frameNum} / 8`,
    phaseName: pose.phaseName,
    pelvisCoords: `(${Math.round(pose.pelvis.x)}, ${Math.round(pose.pelvis.y)})`,
    neckAngleDeg: `${neckRelDeg}° cervical tilt`,
    fallForwardLeadPx: `+${pose.fallForwardComLeadPx} px ahead of hip`,
    footRollStatus,
    nearKneeDeg: `${nearKneeAngle}°`,
    farKneeDeg: `${farKneeAngle}°`,
    crossoverPx: `${pose.footCrossoverDeltaX > 0 ? '+' : ''}${Math.round(pose.footCrossoverDeltaX)} px`,
    flightBadge: pose.isFlightPhase ? 'AIRBORNE FLIGHT' : 'STANCE FOOT ROLL (IK)',
    extractedFlawWarning: flawWarning,
  };
}

export function buildArticulatedPartReadouts(
  pose: ArticulatedPose,
  personaId: RunnerPersonaId = 'sg-chinese-male',
): ArticulatedPartReadout[] {
  return ARTICULATED_BODY_PARTS.map((part) =>
    formatSinglePartReadout(part, pose, personaId),
  );
}

function formatSinglePartReadout(
  part: AlgorithmicBodyPartEntry,
  pose: ArticulatedPose,
  personaId: RunnerPersonaId,
): ArticulatedPartReadout {
  const limbAngle = resolvePartAngleRad(part.partId, pose);
  const jointPt = resolvePartJointPoint(part.partId, pose);
  const grounded =
    (part.partId === 'nearFoot' && pose.nearLeg.isGrounded) ||
    (part.partId === 'farFoot' && pose.farLeg.isGrounded);
  const cutoutUrl =
    personaId === 'photo-sg-chinese-female-average'
      ? (part.photoFemaleAveragePublicUrl ??
          part.photoFemalePublicUrl ??
          part.femalePublicUrl)
      : personaId === 'photo-sg-chinese-female'
        ? (part.photoFemalePublicUrl ?? part.femalePublicUrl)
        : personaId === 'sg-chinese-female'
          ? part.femalePublicUrl
          : part.publicUrl;
  return {
    part,
    cutoutUrl,
    svgPartUrl: `/sprites/photoreal/sg-chinese-female/svg-parts/${part.partId}.svg`,
    liveAngleDegFormatted: `${radToDegString(limbAngle)}°`,
    jointCoordsFormatted: `(${Math.round(jointPt.x)}, ${Math.round(jointPt.y)})`,
    groundStateLabel: grounded ? 'Rolling on Track (MTP Hinge)' : 'Articulating',
  };
}

function resolvePartAngleRad(
  partId: AlgorithmicBodyPartEntry['partId'],
  pose: ArticulatedPose,
): number {
  switch (partId) {
    case 'head':
      return pose.headAngleRad;
    case 'neck':
      return pose.neckAngleRad;
    case 'hairAccessory':
      return pose.hairAngleRad;
    case 'torso':
      return pose.torsoAngleRad;
    case 'pelvis':
      return pose.pelvisTiltRad;
    case 'nearUpperArm':
      return pose.nearArm.upperAngleRad;
    case 'nearForearm':
    case 'nearHand':
      return pose.nearArm.lowerAngleRad;
    case 'farUpperArm':
      return pose.farArm.upperAngleRad;
    case 'farForearm':
    case 'farHand':
      return pose.farArm.lowerAngleRad;
    case 'nearThigh':
      return pose.nearLeg.upperAngleRad;
    case 'nearShin':
      return pose.nearLeg.lowerAngleRad;
    case 'nearFoot':
      return pose.nearLeg.distalAngleRad;
    case 'farThigh':
      return pose.farLeg.upperAngleRad;
    case 'farShin':
      return pose.farLeg.lowerAngleRad;
    case 'farFoot':
      return pose.farLeg.distalAngleRad;
  }
}

function resolvePartJointPoint(
  partId: AlgorithmicBodyPartEntry['partId'],
  pose: ArticulatedPose,
): Point2D {
  if (partId === 'head') return pose.headCenter;
  if (partId === 'neck') return pose.neck;
  if (partId === 'hairAccessory') return pose.hairTip;
  if (partId === 'torso') return pose.collar;
  if (partId === 'pelvis') return pose.pelvis;
  if (partId.startsWith('near') && partId.includes('Arm')) return pose.nearArm.midJoint;
  if (partId.startsWith('far') && partId.includes('Arm')) return pose.farArm.midJoint;
  if (partId === 'nearHand') return pose.nearArm.tipPoint;
  if (partId === 'farHand') return pose.farArm.tipPoint;
  if (partId === 'nearFoot') return pose.nearLeg.ballPoint;
  if (partId === 'farFoot') return pose.farLeg.ballPoint;
  if (partId.startsWith('near')) return pose.nearLeg.midJoint;
  return pose.farLeg.midJoint;
}

export function sampleFootOrbitTrail(
  config: GaitConfig = DEFAULT_GAIT_CONFIG,
): FootOrbitSample[] {
  const samples: FootOrbitSample[] = [];
  const steps = 32;
  for (let i = 0; i < steps; i++) {
    const p = i / steps;
    const pose = solveArticulatedPose(p, config, DEFAULT_RIG_SPEC);
    samples.push({
      phase: p,
      nearAnkle: pose.nearLeg.ballPoint,
      farAnkle: pose.farLeg.ballPoint,
    });
  }
  return samples;
}

function radToDegString(rad: number): string {
  const deg = (rad * 180) / Math.PI;
  return String(Math.round(deg));
}

export interface FormattedSliderLabels {
  readonly phasePctText: string;
  readonly cadenceLabel: string;
  readonly leanLabel: string;
  readonly neckLabel: string;
  readonly footRollLabel: string;
  readonly strideLabel: string;
  readonly armSwingLabel: string;
  readonly armCarryFlexLabel: string;
  readonly armChestBiasLabel: string;
  readonly hairSwingLabel: string;
  readonly upperArmLenLabel: string;
  readonly forearmLenLabel: string;
  readonly armWidthLabel: string;
  readonly torsoWidthLabel: string;
  readonly pelvisWidthLabel: string;
  readonly thighWidthLabel: string;
}

export function buildFormattedSliderLabels(
  phase: number,
  gaitConfig: GaitConfig,
  assetTuning: PhotorealAssetTuningSpec = PHOTOREAL_ASSET_TUNING_DEFAULTS[
    'photo-sg-chinese-female'
  ],
): FormattedSliderLabels {
  const carryFlex = gaitConfig.armCarryFlexDeg ?? 84;
  const chestBias = gaitConfig.armChestBiasDeg ?? 4;
  const hairSwing = gaitConfig.hairSwingScale ?? 1.0;
  return {
    phasePctText: `${Math.round(phase * 100)}%`,
    cadenceLabel: `${gaitConfig.cadenceHz.toFixed(2)} Hz`,
    leanLabel: `${Math.round(gaitConfig.forwardLeanDeg)}°`,
    neckLabel: `${Math.round(gaitConfig.neckMotionScale * 100)}%`,
    footRollLabel: `${Math.round(gaitConfig.footRollScale * 100)}%`,
    strideLabel: `${Math.round(gaitConfig.strideLengthScale * 100)}%`,
    armSwingLabel: `${Math.round(gaitConfig.armSwingScale * 100)}%`,
    armCarryFlexLabel: `${Math.round(carryFlex)}°`,
    armChestBiasLabel: `${chestBias >= 0 ? '+' : ''}${Math.round(chestBias)}°`,
    hairSwingLabel: `${Math.round(hairSwing * 100)}%`,
    upperArmLenLabel: `${Math.round(assetTuning.upperArmLengthScale * 100)}%`,
    forearmLenLabel: `${Math.round(assetTuning.forearmLengthScale * 100)}%`,
    armWidthLabel: `${assetTuning.upperArmWidthPx.toFixed(1)} px`,
    torsoWidthLabel: `${assetTuning.torsoWidthPx.toFixed(1)} px`,
    pelvisWidthLabel: `${assetTuning.pelvisWidthPx.toFixed(1)} px`,
    thighWidthLabel: `${assetTuning.thighWidthPx.toFixed(1)} px`,
  };
}

export const VARIANT_OPTIONS = Object.values(RUNNER_PALETTES);
export const PERSONA_OPTIONS = PERSONA_SKINS;

export interface BackdropOption {
  readonly id: BackdropVariantId;
  readonly label: string;
}

export const BACKDROP_OPTIONS: readonly BackdropOption[] = [
  { id: 'stadium-day', label: 'Stadium Track (Day)' },
  { id: 'stadium-dusk', label: 'Stadium Track (Dusk)' },
  { id: 'stadium-night', label: 'Stadium Track (Night)' },
  { id: 'magenta-key', label: 'Magenta Chroma Key (#FF00FF)' },
  { id: 'studio-grid', label: 'Transparent Studio Grid' },
];
