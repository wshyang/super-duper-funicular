import type {
  ArticulatedPose,
  BodyPartId,
  LimbKinematics,
  PhotorealAssetTuningSpec,
  PhotorealPersonaId,
  Point2D,
  RasterImage,
  RunnerPalette,
} from '../shared/types.js';
import { removeSmallOpaqueIslands } from '../pipeline/connected-components.js';
import {
  ARTICULATED_BODY_PARTS,
  PHOTOREAL_ASSET_TUNING_DEFAULTS,
} from './body-proportions.js';
import { parseHexColor } from './palette.js';
import {
  warpPhotorealRollingShoe,
  warpPhotorealSegmentToQuad,
} from './photoreal-warp.js';

export type PhotorealPartBank = Partial<Record<BodyPartId, RasterImage>>;

const partBanksByPersona: Record<PhotorealPersonaId, PhotorealPartBank> = {
  'photo-sg-chinese-female': {},
  'photo-sg-chinese-female-average': {},
  'photo-sg-chinese-female-petite': {},
};

export function setPhotorealPartBankForPersona(
  personaId: PhotorealPersonaId,
  bank: PhotorealPartBank,
): void {
  partBanksByPersona[personaId] = { ...bank };
}

export function getPhotorealPartBankForPersona(
  personaId: PhotorealPersonaId,
): PhotorealPartBank {
  return partBanksByPersona[personaId];
}

export function hasPhotorealPartBankForPersona(
  personaId: PhotorealPersonaId,
): boolean {
  const bank = partBanksByPersona[personaId];
  return ARTICULATED_BODY_PARTS.every((part) => Boolean(bank[part.partId]));
}

export function setPhotorealFemalePartBank(bank: PhotorealPartBank): void {
  setPhotorealPartBankForPersona('photo-sg-chinese-female', bank);
}

export function getPhotorealFemalePartBank(): PhotorealPartBank {
  return getPhotorealPartBankForPersona('photo-sg-chinese-female');
}

export function hasPhotorealFemalePartBank(): boolean {
  return hasPhotorealPartBankForPersona('photo-sg-chinese-female');
}

export interface PhotorealRenderContext {
  readonly personaId?: PhotorealPersonaId;
  readonly tuning?: PhotorealAssetTuningSpec;
}

export function renderPhotorealFemalePoseOntoCanvas(
  canvas: RasterImage,
  pose: ArticulatedPose,
  palette: RunnerPalette,
  context: PhotorealRenderContext = {},
): boolean {
  const personaId: PhotorealPersonaId =
    context.personaId ?? 'photo-sg-chinese-female';
  const effectivePersonaId: PhotorealPersonaId = hasPhotorealPartBankForPersona(
    personaId,
  )
    ? personaId
    : 'photo-sg-chinese-female';
  if (!hasPhotorealPartBankForPersona(effectivePersonaId)) return false;
  const bank = partBanksByPersona[effectivePersonaId] as Record<
    BodyPartId,
    RasterImage
  >;
  const tuning =
    context.tuning ?? PHOTOREAL_ASSET_TUNING_DEFAULTS[personaId];
  renderFarSideLimbs(canvas, pose, { palette, bank, tuning });
  renderTorsoAndNeck(canvas, pose, { palette, bank, tuning });
  renderNearLegAndPelvisShorts(canvas, pose, { palette, bank, tuning });
  renderHeadAndHairDynamics(canvas, pose, { palette, bank, tuning });
  renderNearArmChain(canvas, pose, { palette, bank, tuning });
  const cleaned = removeSmallOpaqueIslands(canvas, 8);
  canvas.data.set(cleaned.data);
  return true;
}

interface RigLayerContext {
  readonly palette: RunnerPalette;
  readonly bank: Record<BodyPartId, RasterImage>;
  readonly tuning: PhotorealAssetTuningSpec;
}

function renderFarSideLimbs(
  canvas: RasterImage,
  pose: ArticulatedPose,
  ctx: RigLayerContext,
): void {
  const { bank, palette, tuning } = ctx;
  warpPhotorealSegmentToQuad(canvas, bank.farUpperArm, {
    dstStart: pose.farArm.hipOrShoulder,
    dstEnd: pose.farArm.midJoint,
    dstHalfWidthPx: tuning.upperArmWidthPx * 0.93,
  });
  warpPhotorealSegmentToQuad(canvas, bank.farForearm, {
    dstStart: pose.farArm.midJoint,
    dstEnd: pose.farArm.endEffector,
    dstHalfWidthPx: tuning.forearmWidthPx * 0.93,
  });
  const farHandTip = computeHandTip(pose.farArm, tuning.handLengthPx * 0.95);
  warpPhotorealSegmentToQuad(canvas, bank.farHand, {
    dstStart: pose.farArm.endEffector,
    dstEnd: farHandTip,
    dstHalfWidthPx: tuning.handWidthPx * 0.94,
  });
  warpPhotorealSegmentToQuad(canvas, bank.farShin, {
    dstStart: pose.farLeg.midJoint,
    dstEnd: pose.farLeg.endEffector,
    dstHalfWidthPx: tuning.shinWidthPx * 0.96,
  });
  warpPhotorealSegmentToQuad(canvas, bank.farThigh, {
    dstStart: pose.farLeg.hipOrShoulder,
    dstEnd: pose.farLeg.midJoint,
    dstHalfWidthPx: tuning.thighWidthPx * 0.96,
  });
  if (!pose.neutralStanding) {
    warpPhotorealRollingShoe(
      canvas,
      bank.farFoot,
      pose.farLeg,
      parseHexColor(palette.jerseyMain),
      13.5,
    );
  }
}

function resolveHeadNeckPivot(pose: ArticulatedPose): Point2D {
  return { x: pose.neck.x + 2.0, y: pose.neck.y + 2.0 };
}

function renderTorsoAndNeck(
  canvas: RasterImage,
  pose: ArticulatedPose,
  ctx: RigLayerContext,
): void {
  const { bank, palette, tuning } = ctx;
  const headNeckPivot = resolveHeadNeckPivot(pose);
  const neckTop: Point2D = {
    x: headNeckPivot.x,
    y: headNeckPivot.y - 2.0,
  }; // Two-pixel overlap closes resampling gaps without stacking a long neck piece.
  const neckBottom: Point2D = {
    x: pose.collar.x + 1.0,
    y: pose.collar.y + 3.5,
  };
  warpPhotorealSegmentToQuad(canvas, bank.neck, {
    dstStart: neckTop,
    dstEnd: neckBottom,
    dstHalfWidthPx: Math.round(tuning.torsoWidthPx * 0.30),
  });
  const torsoTop: Point2D = {
    x: pose.collar.x - 0.5,
    y: pose.collar.y - 2.0,
  };
  const torsoBottom: Point2D = {
    x: pose.pelvis.x,
    y: pose.pelvis.y + 2.0,
  };
  warpPhotorealSegmentToQuad(canvas, bank.torso, {
    dstStart: torsoTop,
    dstEnd: torsoBottom,
    dstHalfWidthPx: tuning.torsoWidthPx,
    srcStart: { x: 74, y: 26 },
    srcEnd: { x: 80, y: 120 },
    tintTarget: parseHexColor(palette.jerseyMain),
    tintMode: 'crimson-singlet',
  });
}

function renderNearLegAndPelvisShorts(
  canvas: RasterImage,
  pose: ArticulatedPose,
  ctx: RigLayerContext,
): void {
  const { bank, palette, tuning } = ctx;
  const pelvisTop: Point2D = {
    x: pose.pelvis.x + 1.5,
    y: pose.pelvis.y - 6.5 + tuning.hipOffsetY,
  };
  const pelvisBottom: Point2D = {
    x: pose.pelvis.x - 1.0,
    y: pose.pelvis.y + 12.5 * tuning.pelvisLengthScale + tuning.hipOffsetY,
  };
  warpPhotorealSegmentToQuad(canvas, bank.pelvis, {
    dstStart: pelvisTop,
    dstEnd: pelvisBottom,
    dstHalfWidthPx: tuning.pelvisWidthPx,
    srcStart: { x: 82, y: 32 },
    srcEnd: { x: 78, y: 120 },
  });
  warpPhotorealSegmentToQuad(canvas, bank.nearShin, {
    dstStart: pose.nearLeg.midJoint,
    dstEnd: pose.nearLeg.endEffector,
    dstHalfWidthPx: tuning.shinWidthPx,
  });
  warpPhotorealSegmentToQuad(canvas, bank.nearThigh, {
    dstStart: pose.nearLeg.hipOrShoulder,
    dstEnd: pose.nearLeg.midJoint,
    dstHalfWidthPx: tuning.thighWidthPx,
  });
  warpPhotorealRollingShoe(
    canvas,
    bank.nearFoot,
    pose.nearLeg,
    parseHexColor(palette.jerseyMain),
    14.0,
  );
}

function renderHeadAndHairDynamics(
  canvas: RasterImage,
  pose: ArticulatedPose,
  ctx: RigLayerContext,
): void {
  const { bank, palette } = ctx;
  const headPivot = resolveHeadNeckPivot(pose);
  const headCrown: Point2D = {
    x: headPivot.x + 1.0 + Math.sin(pose.neckAngleRad) * 2.0,
    y: headPivot.y - 26.5 * ctx.tuning.headScale,
  };
  if (pose.hairStyleMode === 'long-flowing') {
    renderFlowingLongHairPlume(canvas, pose, headPivot, bank);
  } else if (pose.hairStyleMode === 'ponytail' && pose.neutralStanding) {
    renderNeutralPonytail(canvas, headPivot, bank);
  } else if (pose.hairStyleMode === 'ponytail') {
    renderSportyPonytailPlume(canvas, pose, headPivot, { bank, palette });
  }
  warpPhotorealSegmentToQuad(canvas, bank.head, {
    dstStart: headCrown,
    dstEnd: headPivot,
    dstHalfWidthPx: 23 * ctx.tuning.headScale,
    srcStart: { x: 76, y: 12 },
    srcEnd: { x: 76, y: 120 },
  });
}

function renderSportyPonytailPlume(
  canvas: RasterImage,
  pose: ArticulatedPose,
  headPivot: Point2D,
  ctx: { readonly bank: Record<BodyPartId, RasterImage>; readonly palette: RunnerPalette },
): void {
  const ponySprite = ctx.bank.hairAccessory;
  const ponyBounce = Math.sin(pose.phase * Math.PI * 4 - 0.55) * 4.0;
  const ponyRoot: Point2D = {
    x: headPivot.x - 7.5,
    y: headPivot.y - 15.5,
  };
  const ponyTip: Point2D = {
    x: ponyRoot.x - 25,
    y: ponyRoot.y + 3.0 + ponyBounce,
  };
  warpPhotorealSegmentToQuad(canvas, ponySprite, {
    dstStart: ponyRoot,
    dstEnd: ponyTip,
    dstHalfWidthPx: 19,
    srcStart: { x: 142, y: 82 },
    srcEnd: { x: 14, y: 86 },
    tintTarget: parseHexColor(ctx.palette.jerseyMain),
    tintMode: 'accent-trim',
  });
}

function renderNeutralPonytail(
  canvas: RasterImage,
  headPivot: Point2D,
  bank: Record<BodyPartId, RasterImage>,
): void {
  const ponyRoot = { x: headPivot.x - 7.5, y: headPivot.y - 15.5 };
  const ponyTip = { x: ponyRoot.x - 12, y: ponyRoot.y + 54 };
  warpPhotorealSegmentToQuad(canvas, bank.hairAccessory, {
    dstStart: ponyRoot,
    dstEnd: ponyTip,
    dstHalfWidthPx: 19,
    srcStart: { x: 142, y: 82 },
    srcEnd: { x: 14, y: 86 },
  });
}

function renderFlowingLongHairPlume(
  canvas: RasterImage,
  pose: ArticulatedPose,
  headPivot: Point2D,
  bank: Record<BodyPartId, RasterImage>,
): void {
  const flowingSprite = bank.hairAccessory;
  const strideSwingX = Math.sin((pose.phase - 0.14) * Math.PI * 2) * 5.2;
  const stepLiftY = Math.sin((pose.phase - 0.22) * Math.PI * 4) * 4.2;
  const lagTipY = Math.sin((pose.phase - 0.38) * Math.PI * 4) * 6.5;
  const crownRoot: Point2D = {
    x: headPivot.x - 4.5,
    y: headPivot.y - 13.5,
  };
  const midCascade: Point2D = {
    x: crownRoot.x - 17.5 + strideSwingX * 0.55,
    y: crownRoot.y + 36.0 + stepLiftY,
  };
  const lowerTip: Point2D = {
    x: crownRoot.x - 24.5 + strideSwingX,
    y: crownRoot.y + 72.0 + lagTipY,
  };
  warpPhotorealSegmentToQuad(canvas, flowingSprite, {
    dstStart: crownRoot,
    dstEnd: lowerTip,
    dstHalfWidthPx: 25.0,
    srcStart: { x: 142, y: 82 },
    srcEnd: { x: 14, y: 86 },
  });
  warpPhotorealSegmentToQuad(canvas, flowingSprite, {
    dstStart: { x: crownRoot.x - 2.0, y: crownRoot.y + 4.0 },
    dstEnd: midCascade,
    dstHalfWidthPx: 20.5,
    srcStart: { x: 142, y: 82 },
    srcEnd: { x: 52, y: 86 },
  });
}

function renderNearArmChain(
  canvas: RasterImage,
  pose: ArticulatedPose,
  ctx: RigLayerContext,
): void {
  const { bank, tuning } = ctx;
  const shoulderSocket: Point2D = {
    x: pose.nearArm.hipOrShoulder.x + tuning.shoulderOffsetX,
    y: pose.nearArm.hipOrShoulder.y + tuning.shoulderOffsetY,
  };
  warpPhotorealSegmentToQuad(canvas, bank.nearUpperArm, {
    dstStart: shoulderSocket,
    dstEnd: pose.nearArm.midJoint,
    dstHalfWidthPx: tuning.upperArmWidthPx,
  });
  warpPhotorealSegmentToQuad(canvas, bank.nearForearm, {
    dstStart: pose.nearArm.midJoint,
    dstEnd: pose.nearArm.endEffector,
    dstHalfWidthPx: tuning.forearmWidthPx,
  });
  const nearHandTip = computeHandTip(pose.nearArm, tuning.handLengthPx);
  warpPhotorealSegmentToQuad(canvas, bank.nearHand, {
    dstStart: pose.nearArm.endEffector,
    dstEnd: nearHandTip,
    dstHalfWidthPx: tuning.handWidthPx,
  });
}

function computeHandTip(arm: LimbKinematics, handLenPx: number): Point2D {
  const dx = arm.endEffector.x - arm.midJoint.x;
  const dy = arm.endEffector.y - arm.midJoint.y;
  const len = Math.max(1, Math.hypot(dx, dy));
  return {
    x: arm.endEffector.x + (dx / len) * handLenPx,
    y: arm.endEffector.y + (dy / len) * handLenPx,
  };
}
