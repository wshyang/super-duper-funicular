import type {
  ArticulatedPose,
  LimbKinematics,
  Point2D,
  RasterImage,
  RgbaColor,
  RunnerPalette,
} from '../shared/types.js';
import { parseHexColor } from './palette.js';
import { drawOutlinedDisc, drawTaperedCapsule } from './shapes.js';
import type { RunnerSkinDefinition } from './skin-registry.js';
import { projectPoint } from './two-bone-ik.js';

export function renderArticulatedShoePass(
  canvas: RasterImage,
  leg: LimbKinematics,
  outline: RgbaColor,
): void {
  drawTaperedCapsule(canvas, {
    start: leg.heelPoint,
    end: leg.ballPoint,
    radiusStart: 6.2,
    radiusEnd: 5.2,
    fillColor: outline,
    outlineColor: outline,
    outlineWidth: 0,
  });
  drawTaperedCapsule(canvas, {
    start: leg.ballPoint,
    end: leg.tipPoint,
    radiusStart: 5.0,
    radiusEnd: 3.8,
    fillColor: outline,
    outlineColor: outline,
    outlineWidth: 0,
  });
}

export function renderArticulatedShoeFill(
  canvas: RasterImage,
  leg: LimbKinematics,
  palette: RunnerPalette,
): void {
  const shoeUpper = parseHexColor(palette.shoeMain);
  const sole = parseHexColor(palette.shoeSole);
  const accent = parseHexColor(palette.jerseyHighlight);
  drawTaperedCapsule(canvas, {
    start: { x: leg.heelPoint.x, y: leg.heelPoint.y + 1.4 },
    end: { x: leg.ballPoint.x, y: leg.ballPoint.y + 1.4 },
    radiusStart: 3.8, radiusEnd: 3.2,
    fillColor: sole, outlineColor: sole, outlineWidth: 0,
  });
  drawTaperedCapsule(canvas, {
    start: { x: leg.ballPoint.x, y: leg.ballPoint.y + 1.2 },
    end: { x: leg.tipPoint.x, y: leg.tipPoint.y + 1.0 },
    radiusStart: 3.0, radiusEnd: 2.2,
    fillColor: sole, outlineColor: sole, outlineWidth: 0,
  });
  drawTaperedCapsule(canvas, {
    start: leg.heelPoint, end: leg.ballPoint,
    radiusStart: 4.1, radiusEnd: 3.3,
    fillColor: shoeUpper, outlineColor: shoeUpper, outlineWidth: 0,
  });
  drawTaperedCapsule(canvas, {
    start: leg.ballPoint, end: leg.tipPoint,
    radiusStart: 3.3, radiusEnd: 2.2,
    fillColor: shoeUpper, outlineColor: shoeUpper, outlineWidth: 0,
  });
  drawOutlinedDisc(canvas, {
    center: leg.ballPoint, radius: 1.6,
    fillColor: accent, outlineColor: accent, outlineWidth: 0,
  });
}

export interface NeckAndHeadRenderInput {
  readonly pose: ArticulatedPose;
  readonly palette: RunnerPalette;
  readonly skin: RunnerSkinDefinition;
}

export function renderArticulatedNeckAndHead(
  canvas: RasterImage,
  input: NeckAndHeadRenderInput,
): void {
  const { pose, palette, skin } = input;
  if (skin.hairStyle === 'female-ponytail') {
    renderArticulatedPonytail(canvas, pose, skin);
  }
  renderCervicalNeckSegment(canvas, pose, { palette, skin });
  renderHeadAndFaceProfile(canvas, pose, { palette, skin });
}

export function renderArticulatedPonytail(
  canvas: RasterImage,
  pose: ArticulatedPose,
  skin: RunnerSkinDefinition,
): void {
  const outline = parseHexColor('#141018');
  const hairMain = parseHexColor(skin.hairColor);
  const hairTie = parseHexColor(skin.hairTieAccent);
  const midCurve = {
    x: (pose.hairAnchor.x + pose.hairTip.x) * 0.5 - 3,
    y: (pose.hairAnchor.y + pose.hairTip.y) * 0.5 - 4,
  };
  drawTaperedCapsule(canvas, {
    start: pose.hairAnchor, end: midCurve, radiusStart: 6.8, radiusEnd: 7.8,
    fillColor: outline, outlineColor: outline, outlineWidth: 0,
  });
  drawTaperedCapsule(canvas, {
    start: midCurve, end: pose.hairTip, radiusStart: 7.6, radiusEnd: 3.6,
    fillColor: outline, outlineColor: outline, outlineWidth: 0,
  });
  drawTaperedCapsule(canvas, {
    start: pose.hairAnchor, end: midCurve, radiusStart: 4.8, radiusEnd: 5.6,
    fillColor: hairMain, outlineColor: hairMain, outlineWidth: 0,
  });
  drawTaperedCapsule(canvas, {
    start: midCurve, end: pose.hairTip, radiusStart: 5.4, radiusEnd: 2.0,
    fillColor: hairMain, outlineColor: hairMain, outlineWidth: 0,
  });
  drawOutlinedDisc(canvas, {
    center: pose.hairAnchor, radius: 3.6,
    fillColor: hairTie, outlineColor: outline, outlineWidth: 1.5,
  });
}

interface PaletteAndSkin {
  readonly palette: RunnerPalette;
  readonly skin: RunnerSkinDefinition;
}

function renderCervicalNeckSegment(
  canvas: RasterImage,
  pose: ArticulatedPose,
  ctx: PaletteAndSkin,
): void {
  const outline = parseHexColor(ctx.palette.outline);
  const skinShadow = parseHexColor(ctx.skin.complexionFar);
  const skinNear = parseHexColor(ctx.skin.complexionNear);
  const r = ctx.skin.anthropometrics.neckRadius;
  drawTaperedCapsule(canvas, {
    start: pose.collar,
    end: pose.neck,
    radiusStart: r + 2.4,
    radiusEnd: r + 1.8,
    fillColor: outline,
    outlineColor: outline,
    outlineWidth: 0,
  });
  drawTaperedCapsule(canvas, {
    start: pose.collar,
    end: pose.neck,
    radiusStart: r,
    radiusEnd: r - 0.5,
    fillColor: skinShadow,
    outlineColor: skinShadow,
    outlineWidth: 0,
  });
  drawTaperedCapsule(canvas, {
    start: { x: pose.collar.x + 1.2, y: pose.collar.y },
    end: { x: pose.neck.x + 1.2, y: pose.neck.y },
    radiusStart: r * 0.65,
    radiusEnd: r * 0.6,
    fillColor: skinNear,
    outlineColor: skinNear,
    outlineWidth: 0,
  });
}

function renderHeadAndFaceProfile(
  canvas: RasterImage,
  pose: ArticulatedPose,
  ctx: PaletteAndSkin,
): void {
  const skinColor = parseHexColor(ctx.skin.complexionNear);
  const outline = parseHexColor(ctx.palette.outline);
  const headR = ctx.skin.anthropometrics.headRadius;
  const jawPoint = projectPoint(pose.headCenter, pose.headAngleRad + 0.38, headR * 0.52);
  drawTaperedCapsule(canvas, {
    start: pose.headCenter,
    end: jawPoint,
    radiusStart: headR + 2.2,
    radiusEnd: headR * 0.72 + 2.2,
    fillColor: outline,
    outlineColor: outline,
    outlineWidth: 0,
  });
  drawTaperedCapsule(canvas, {
    start: pose.headCenter,
    end: jawPoint,
    radiusStart: headR,
    radiusEnd: headR * 0.72,
    fillColor: skinColor,
    outlineColor: skinColor,
    outlineWidth: 0,
  });
  renderPersonaHairCap(canvas, pose.headCenter, ctx);
  renderFacialEyesAndBrow(canvas, pose, ctx);
}

export function renderPersonaHairCap(
  canvas: RasterImage,
  headCenter: Point2D,
  ctx: PaletteAndSkin,
): void {
  const hair = parseHexColor(ctx.skin.hairColor);
  const outline = parseHexColor(ctx.palette.outline);
  const headR = ctx.skin.anthropometrics.headRadius;
  const hairBack = { x: headCenter.x - headR * 0.38, y: headCenter.y - headR * 0.22 };
  const hairFront = { x: headCenter.x + headR * 0.34, y: headCenter.y - headR * 0.56 };
  drawTaperedCapsule(canvas, {
    start: hairBack,
    end: hairFront,
    radiusStart: headR * 0.78,
    radiusEnd: headR * 0.64,
    fillColor: hair,
    outlineColor: outline,
    outlineWidth: 2,
  });
  if (ctx.skin.hairStyle === 'male-taper-fade') {
    const sideburn = { x: headCenter.x - 1, y: headCenter.y + 1 };
    drawOutlinedDisc(canvas, {
      center: sideburn,
      radius: 3.2,
      fillColor: hair,
      outlineColor: hair,
      outlineWidth: 0,
    });
  }
}

function renderFacialEyesAndBrow(
  canvas: RasterImage,
  pose: ArticulatedPose,
  ctx: PaletteAndSkin,
): void {
  const outline = parseHexColor(ctx.palette.outline);
  const eyePos = projectPoint(pose.headCenter, pose.headAngleRad - 0.1, 8.2);
  drawOutlinedDisc(canvas, {
    center: eyePos,
    radius: 1.7,
    fillColor: outline,
    outlineColor: outline,
    outlineWidth: 0,
  });
  const earPos = { x: pose.headCenter.x - 2.5, y: pose.headCenter.y + 1.5 };
  drawOutlinedDisc(canvas, {
    center: earPos,
    radius: 2.8,
    fillColor: parseHexColor(ctx.skin.complexionFar),
    outlineColor: outline,
    outlineWidth: 1.0,
  });
}
