import type {
  ArticulatedPose,
  BodyPartId,
  LimbKinematics,
  PhotorealAssetTuningSpec,
  Point2D,
  RasterImage,
  RgbaColor,
  RunnerPalette,
  RunnerPersonaId,
} from '../shared/types.js';
import { blitRaster, createRaster } from '../pipeline/raster.js';
import { DEFAULT_RIG_SPEC } from './body-proportions.js';
import { parseHexColor } from './palette.js';
import {
  getPhotorealPartBankForPersona,
  renderPhotorealFemalePoseOntoCanvas,
} from './photoreal-rig.js';
import { drawOutlinedDisc, drawTaperedCapsule, quantizePixelScale } from './shapes.js';
import {
  renderArticulatedNeckAndHead,
  renderArticulatedShoeFill,
  renderArticulatedShoePass,
  renderPersonaHairCap,
} from './skin-painters.js';
import {
  applyPersonaSkinToPalette,
  isPhotorealPersona,
  type RunnerSkinDefinition,
  resolveRunnerSkin,
} from './skin-registry.js';

export interface RenderPoseOptions {
  readonly pose: ArticulatedPose;
  readonly palette: RunnerPalette;
  readonly pixelScale: 1 | 2 | 3;
  readonly personaId?: RunnerPersonaId;
  readonly customSkin?: RunnerSkinDefinition;
  readonly assetTuning?: PhotorealAssetTuningSpec;
}

export function renderRunnerPoseToRaster(options: RenderPoseOptions): RasterImage {
  const canvas = createRaster(DEFAULT_RIG_SPEC.canvasWidth, DEFAULT_RIG_SPEC.canvasHeight);
  const personaId = options.personaId ?? 'sg-chinese-male';
  const skin = options.customSkin ?? resolveRunnerSkin(personaId);
  const skinnedPalette = applyPersonaSkinToPalette(options.palette, skin);
  const { pose } = options;
  if (
    isPhotorealPersona(personaId) &&
    renderPhotorealFemalePoseOntoCanvas(canvas, pose, options.palette, {
      personaId,
      tuning: options.assetTuning,
    })
  ) {
    invokeRegisteredSkinHooks(canvas, pose, { palette: skinnedPalette, skin });
    return quantizePixelScale(canvas, options.pixelScale);
  }
  renderArmLayer(canvas, pose.farArm, { palette: skinnedPalette, skin, side: 'far' });
  renderLegLayer(canvas, pose.farLeg, { palette: skinnedPalette, skin, side: 'far' });
  renderTorsoAndPelvisLayer(canvas, pose, { palette: skinnedPalette, skin });
  renderArticulatedNeckAndHead(canvas, { pose, palette: skinnedPalette, skin });
  renderLegLayer(canvas, pose.nearLeg, { palette: skinnedPalette, skin, side: 'near' });
  renderArmLayer(canvas, pose.nearArm, { palette: skinnedPalette, skin, side: 'near' });
  invokeRegisteredSkinHooks(canvas, pose, { palette: skinnedPalette, skin });
  return quantizePixelScale(canvas, options.pixelScale);
}

interface LimbStyle {
  readonly palette: RunnerPalette;
  readonly skin: RunnerSkinDefinition;
  readonly side: 'far' | 'near';
}

function renderArmLayer(
  canvas: RasterImage,
  arm: LimbKinematics,
  style: LimbStyle,
): void {
  const outline = parseHexColor(style.palette.outline);
  const skin = parseHexColor(
    style.side === 'near' ? style.palette.skinNear : style.palette.skinFar,
  );
  const sleeve = parseHexColor(
    style.side === 'near' ? style.palette.jerseyMain : style.palette.jerseyShadow,
  );
  const sleeveFraction = style.skin.topCut === 'racerback-crop' ? 0.28 : 0.48;
  const sleeveEnd = lerpPoint(arm.hipOrShoulder, arm.midJoint, sleeveFraction);
  paintArmPass(canvas, arm, { sleeveEnd, color: outline, expand: 2.2, skin: style.skin });
  paintArmFillPass(canvas, arm, { sleeveEnd, skin, sleeve, style });
}

interface ArmOutlinePassSpec {
  readonly sleeveEnd: Point2D;
  readonly color: RgbaColor;
  readonly expand: number;
  readonly skin: RunnerSkinDefinition;
}

function paintArmPass(
  canvas: RasterImage,
  arm: LimbKinematics,
  spec: ArmOutlinePassSpec,
): void {
  const a = spec.skin.anthropometrics;
  drawTaperedCapsule(canvas, {
    start: arm.hipOrShoulder,
    end: arm.midJoint,
    radiusStart: a.upperArmRadius + spec.expand,
    radiusEnd: a.elbowRadius + spec.expand,
    fillColor: spec.color,
    outlineColor: spec.color,
    outlineWidth: 0,
  });
  drawTaperedCapsule(canvas, {
    start: arm.hipOrShoulder,
    end: spec.sleeveEnd,
    radiusStart: a.upperArmRadius + 1.2 + spec.expand,
    radiusEnd: a.upperArmRadius + 0.4 + spec.expand,
    fillColor: spec.color,
    outlineColor: spec.color,
    outlineWidth: 0,
  });
  drawTaperedCapsule(canvas, {
    start: arm.midJoint,
    end: arm.endEffector,
    radiusStart: a.forearmRadius + spec.expand,
    radiusEnd: a.wristRadius + spec.expand,
    fillColor: spec.color,
    outlineColor: spec.color,
    outlineWidth: 0,
  });
  drawOutlinedDisc(canvas, {
    center: arm.tipPoint,
    radius: a.wristRadius + 0.8 + spec.expand,
    fillColor: spec.color,
    outlineColor: spec.color,
    outlineWidth: 0,
  });
}

interface ArmFillSpec {
  readonly sleeveEnd: Point2D;
  readonly skin: RgbaColor;
  readonly sleeve: RgbaColor;
  readonly style: LimbStyle;
}

function paintArmFillPass(
  canvas: RasterImage,
  arm: LimbKinematics,
  spec: ArmFillSpec,
): void {
  const a = spec.style.skin.anthropometrics;
  drawTaperedCapsule(canvas, {
    start: arm.hipOrShoulder, end: arm.midJoint,
    radiusStart: a.upperArmRadius, radiusEnd: a.elbowRadius,
    fillColor: spec.skin, outlineColor: spec.skin, outlineWidth: 0,
  });
  drawTaperedCapsule(canvas, {
    start: arm.midJoint, end: arm.endEffector,
    radiusStart: a.forearmRadius, radiusEnd: a.wristRadius,
    fillColor: spec.skin, outlineColor: spec.skin, outlineWidth: 0,
  });
  drawOutlinedDisc(canvas, {
    center: arm.tipPoint, radius: a.wristRadius + 0.8,
    fillColor: spec.skin, outlineColor: spec.skin, outlineWidth: 0,
  });
  drawTaperedCapsule(canvas, {
    start: arm.hipOrShoulder, end: spec.sleeveEnd,
    radiusStart: a.upperArmRadius + 1.2, radiusEnd: a.upperArmRadius + 0.4,
    fillColor: spec.sleeve, outlineColor: spec.sleeve, outlineWidth: 0,
  });
  if (spec.style.side === 'near') {
    const bandColor = parseHexColor(spec.style.skin.wristbandColor);
    drawOutlinedDisc(canvas, {
      center: arm.endEffector, radius: a.wristRadius + 0.4,
      fillColor: bandColor, outlineColor: bandColor, outlineWidth: 0,
    });
  }
}

function renderLegLayer(
  canvas: RasterImage,
  leg: LimbKinematics,
  style: LimbStyle,
): void {
  const outline = parseHexColor(style.palette.outline);
  const skin = parseHexColor(
    style.side === 'near' ? style.palette.skinNear : style.palette.skinFar,
  );
  const shorts = parseHexColor(
    style.side === 'near' ? style.palette.shortsMain : style.palette.shortsShadow,
  );
  const sock = parseHexColor(
    style.side === 'near' ? style.palette.sockMain : style.palette.sockShadow,
  );
  paintLegSilhouettePass(canvas, leg, { outline, skinDef: style.skin });
  paintLegColorPass(canvas, leg, {
    skin,
    shorts,
    sock,
    palette: style.palette,
    skinDef: style.skin,
  });
}

interface LegSilhouetteSpec {
  readonly outline: RgbaColor;
  readonly skinDef: RunnerSkinDefinition;
}

function paintLegSilhouettePass(
  canvas: RasterImage,
  leg: LimbKinematics,
  spec: LegSilhouetteSpec,
): void {
  const a = spec.skinDef.anthropometrics;
  const shortsHemFrac =
    spec.skinDef.shortsCut === 'sculpted-sprinter-shorts' ? 0.52 : 0.64;
  const shortsHem = lerpPoint(leg.hipOrShoulder, leg.midJoint, shortsHemFrac);
  drawTaperedCapsule(canvas, {
    start: leg.hipOrShoulder,
    end: leg.midJoint,
    radiusStart: a.thighRadius + 2.2,
    radiusEnd: a.kneeRadius + 2.2,
    fillColor: spec.outline,
    outlineColor: spec.outline,
    outlineWidth: 0,
  });
  drawTaperedCapsule(canvas, {
    start: leg.hipOrShoulder,
    end: shortsHem,
    radiusStart: a.thighRadius + 3.6,
    radiusEnd: a.kneeRadius + 4.0,
    fillColor: spec.outline,
    outlineColor: spec.outline,
    outlineWidth: 0,
  });
  drawTaperedCapsule(canvas, {
    start: leg.midJoint,
    end: leg.endEffector,
    radiusStart: a.shinRadius + 2.2,
    radiusEnd: a.ankleRadius + 2.2,
    fillColor: spec.outline,
    outlineColor: spec.outline,
    outlineWidth: 0,
  });
  renderArticulatedShoePass(canvas, leg, spec.outline);
}

interface LegFillColors {
  readonly skin: RgbaColor;
  readonly shorts: RgbaColor;
  readonly sock: RgbaColor;
  readonly palette: RunnerPalette;
  readonly skinDef: RunnerSkinDefinition;
}

function paintLegColorPass(
  canvas: RasterImage,
  leg: LimbKinematics,
  colors: LegFillColors,
): void {
  const a = colors.skinDef.anthropometrics;
  const shortsHemFrac =
    colors.skinDef.shortsCut === 'sculpted-sprinter-shorts' ? 0.52 : 0.64;
  const shortsHem = lerpPoint(leg.hipOrShoulder, leg.midJoint, shortsHemFrac);
  const sockTop = lerpPoint(leg.midJoint, leg.endEffector, 0.36);
  drawTaperedCapsule(canvas, {
    start: leg.hipOrShoulder,
    end: leg.midJoint,
    radiusStart: a.thighRadius,
    radiusEnd: a.kneeRadius,
    fillColor: colors.skin,
    outlineColor: colors.skin,
    outlineWidth: 0,
  });
  drawTaperedCapsule(canvas, {
    start: leg.midJoint,
    end: leg.endEffector,
    radiusStart: a.shinRadius,
    radiusEnd: a.ankleRadius,
    fillColor: colors.skin,
    outlineColor: colors.skin,
    outlineWidth: 0,
  });
  drawTaperedCapsule(canvas, {
    start: sockTop,
    end: leg.endEffector,
    radiusStart: a.shinRadius - 0.3,
    radiusEnd: a.ankleRadius,
    fillColor: colors.sock,
    outlineColor: colors.sock,
    outlineWidth: 0,
  });
  drawTaperedCapsule(canvas, {
    start: leg.hipOrShoulder,
    end: shortsHem,
    radiusStart: a.thighRadius + 1.4,
    radiusEnd: a.kneeRadius + 1.8,
    fillColor: colors.shorts,
    outlineColor: colors.shorts,
    outlineWidth: 0,
  });
  renderArticulatedShoeFill(canvas, leg, colors.palette);
}

interface TorsoRenderContext {
  readonly palette: RunnerPalette;
  readonly skin: RunnerSkinDefinition;
}

function renderTorsoAndPelvisLayer(
  canvas: RasterImage,
  pose: ArticulatedPose,
  ctx: TorsoRenderContext,
): void {
  const a = ctx.skin.anthropometrics;
  const outline = parseHexColor(ctx.palette.outline);
  const shorts = parseHexColor(ctx.palette.shortsMain);
  const jersey = parseHexColor(ctx.palette.jerseyMain);
  const highlight = parseHexColor(ctx.palette.jerseyHighlight);
  const waist = lerpPoint(pose.pelvis, pose.chest, 0.32);
  drawTaperedCapsule(canvas, {
    start: pose.pelvis, end: waist,
    radiusStart: a.pelvisRadius + 2.4, radiusEnd: a.waistRadius + 2.4,
    fillColor: outline, outlineColor: outline, outlineWidth: 0,
  });
  drawTaperedCapsule(canvas, {
    start: waist, end: pose.chest,
    radiusStart: a.waistRadius + 2.4, radiusEnd: a.shoulderRadius + 2.4,
    fillColor: outline, outlineColor: outline, outlineWidth: 0,
  });
  drawTaperedCapsule(canvas, {
    start: pose.pelvis, end: waist,
    radiusStart: a.pelvisRadius, radiusEnd: a.waistRadius,
    fillColor: shorts, outlineColor: shorts, outlineWidth: 0,
  });
  drawTaperedCapsule(canvas, {
    start: waist, end: pose.chest,
    radiusStart: a.waistRadius, radiusEnd: a.shoulderRadius,
    fillColor: jersey, outlineColor: jersey, outlineWidth: 0,
  });
  const stripeStart = lerpPoint(waist, pose.chest, 0.3);
  const stripeEnd = lerpPoint(waist, pose.chest, 0.85);
  drawTaperedCapsule(canvas, {
    start: { x: stripeStart.x + 3.2, y: stripeStart.y },
    end: { x: stripeEnd.x + 3.2, y: stripeEnd.y },
    radiusStart: 3.8, radiusEnd: 5.2,
    fillColor: highlight, outlineColor: highlight, outlineWidth: 0,
  });
}

function invokeRegisteredSkinHooks(
  canvas: RasterImage,
  pose: ArticulatedPose,
  ctx: TorsoRenderContext,
): void {
  if (ctx.skin.customPartRasters?.head) {
    blitRaster(canvas, ctx.skin.customPartRasters.head, {
      x: Math.round(pose.headCenter.x - 16),
      y: Math.round(pose.headCenter.y - 16),
    });
  }
  const hooks = ctx.skin.partHooks;
  if (!hooks) {
    return;
  }
  for (const [partKey, hookFn] of Object.entries(hooks)) {
    if (!hookFn) continue;
    const partId = partKey as BodyPartId;
    hookFn(
      canvas,
      {
        partId,
        origin: partId === 'neck' ? pose.collar : pose.neck,
        end: partId === 'neck' ? pose.neck : pose.headCenter,
        angleRad: partId === 'neck' ? pose.neckAngleRad : pose.headAngleRad,
        lengthPx:
          partId === 'neck'
            ? ctx.skin.anthropometrics.neckLength
            : ctx.skin.anthropometrics.headRadius * 2,
      },
      ctx.palette,
    );
  }
}

export function renderIsolatedBodyPartToRaster(
  partId: BodyPartId,
  palette: RunnerPalette,
  personaId: RunnerPersonaId = 'sg-chinese-male',
): RasterImage {
  if (isPhotorealPersona(personaId)) {
    const bankPart =
      getPhotorealPartBankForPersona(personaId)[partId] ??
      getPhotorealPartBankForPersona('photo-sg-chinese-female')[partId];
    if (bankPart) {
      return bankPart;
    }
  }
  const canvas = createRaster(96, 96);
  const skin = resolveRunnerSkin(personaId);
  const skinnedPalette = applyPersonaSkinToPalette(palette, skin);
  if (partId === 'head' || partId === 'hairAccessory') {
    renderIsolatedHeadOrHair(canvas, partId, { palette: skinnedPalette, skin });
    return canvas;
  }
  renderIsolatedFootOrLimb(canvas, partId, skinnedPalette);
  return canvas;
}

function renderIsolatedHeadOrHair(
  canvas: RasterImage,
  partId: 'head' | 'hairAccessory',
  ctx: TorsoRenderContext,
): void {
  const outline = parseHexColor(ctx.palette.outline);
  const fill = resolvePartColor(partId, ctx.palette);
  if (partId === 'head') {
    drawOutlinedDisc(canvas, {
      center: { x: 48, y: 48 },
      radius: 17,
      fillColor: fill,
      outlineColor: outline,
      outlineWidth: 2,
    });
    renderPersonaHairCap(canvas, { x: 48, y: 48 }, ctx);
    return;
  }
  const hair = parseHexColor(ctx.skin.hairColor);
  const tie = parseHexColor(ctx.skin.hairTieAccent);
  drawTaperedCapsule(canvas, {
    start: { x: 60, y: 32 },
    end: { x: 26, y: 64 },
    radiusStart: 7,
    radiusEnd: 3.5,
    fillColor: hair,
    outlineColor: outline,
    outlineWidth: 2,
  });
  drawOutlinedDisc(canvas, {
    center: { x: 60, y: 32 },
    radius: 4.5,
    fillColor: tie,
    outlineColor: outline,
    outlineWidth: 1.5,
  });
}

function renderIsolatedFootOrLimb(
  canvas: RasterImage,
  partId: BodyPartId,
  palette: RunnerPalette,
): void {
  const outline = parseHexColor(palette.outline);
  const fill = resolvePartColor(partId, palette);
  if (partId === 'nearFoot' || partId === 'farFoot') {
    drawTaperedCapsule(canvas, {
      start: { x: 24, y: 46 },
      end: { x: 52, y: 56 },
      radiusStart: 7,
      radiusEnd: 6,
      fillColor: fill,
      outlineColor: outline,
      outlineWidth: 2,
    });
    drawTaperedCapsule(canvas, {
      start: { x: 52, y: 56 },
      end: { x: 74, y: 56 },
      radiusStart: 6,
      radiusEnd: 4,
      fillColor: fill,
      outlineColor: outline,
      outlineWidth: 2,
    });
    return;
  }
  drawTaperedCapsule(canvas, {
    start: { x: 48, y: 24 },
    end: { x: 48, y: 72 },
    radiusStart: partId === 'neck' ? 7 : 12,
    radiusEnd: partId === 'neck' ? 6 : 9,
    fillColor: fill,
    outlineColor: outline,
    outlineWidth: 2,
  });
}

function resolvePartColor(partId: BodyPartId, palette: RunnerPalette): RgbaColor {
  if (partId === 'torso' || partId === 'nearUpperArm') {
    return parseHexColor(palette.jerseyMain);
  }
  if (partId === 'farUpperArm') {
    return parseHexColor(palette.jerseyShadow);
  }
  if (partId === 'pelvis' || partId === 'nearThigh') {
    return parseHexColor(palette.shortsMain);
  }
  if (partId === 'farThigh') {
    return parseHexColor(palette.shortsShadow);
  }
  if (partId === 'nearShin' || partId === 'farShin') {
    return parseHexColor(palette.sockMain);
  }
  if (partId === 'nearFoot' || partId === 'farFoot') {
    return parseHexColor(palette.shoeMain);
  }
  return parseHexColor(palette.skinNear);
}

function lerpPoint(a: Point2D, b: Point2D, t: number): Point2D {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}
