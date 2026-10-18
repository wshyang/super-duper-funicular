import type {
  ArticulatedPose,
  BodyPartId,
  LimbKinematics,
  PhotorealAssetTuningSpec,
  Point2D,
} from '../shared/types.js';
import type { VectorizedPartSvg } from '../pipeline/svg-vectorizer.js';
import { resolvePhotorealAssetTuning } from './body-proportions.js';

export interface SvgSegmentPlacement {
  readonly partId: BodyPartId;
  readonly start: Point2D;
  readonly end: Point2D;
  readonly srcStart: Point2D;
  readonly srcEnd: Point2D;
  readonly dstHalfWidthPx: number;
}

function computeSegmentMatrixAttr(seg: SvgSegmentPlacement): string {
  const dx = seg.end.x - seg.start.x;
  const dy = seg.end.y - seg.start.y;
  const dstLen = Math.max(1e-3, Math.hypot(dx, dy));
  const ux = dx / dstLen;
  const uy = dy / dstLen;
  const nx = -uy;
  const ny = ux;
  const sdx = seg.srcEnd.x - seg.srcStart.x;
  const sdy = seg.srcEnd.y - seg.srcStart.y;
  const srcLen = Math.max(1e-3, Math.hypot(sdx, sdy));
  const sux = sdx / srcLen;
  const suy = sdy / srcLen;
  const snx = -suy;
  const sny = sux;
  const scaleAlong = dstLen / srcLen;
  const scalePerp = seg.dstHalfWidthPx / 80;
  const a = scaleAlong * ux * sux + scalePerp * nx * snx;
  const b = scaleAlong * uy * sux + scalePerp * ny * snx;
  const c = scaleAlong * ux * suy + scalePerp * nx * sny;
  const d = scaleAlong * uy * suy + scalePerp * ny * sny;
  const e = seg.start.x - a * seg.srcStart.x - c * seg.srcStart.y;
  const f = seg.start.y - b * seg.srcStart.x - d * seg.srcStart.y;
  return `matrix(${a.toFixed(4)} ${b.toFixed(4)} ${c.toFixed(4)} ${d.toFixed(4)} ${e.toFixed(2)} ${f.toFixed(2)})`;
}

function computeHorizontalSpanMatrixAttr(
  start: Point2D,
  end: Point2D,
  srcX0: number,
  srcX1: number,
  srcSoleY: number,
  scaleY: number,
): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dstLen = Math.max(1e-3, Math.hypot(dx, dy));
  const ux = dx / dstLen;
  const uy = dy / dstLen;
  const nx = -uy;
  const ny = ux;
  const sx = dstLen / (srcX1 - srcX0);
  const a = sx * ux;
  const b = sx * uy;
  const c = scaleY * nx;
  const d = scaleY * ny;
  const e = start.x - srcX0 * a - srcSoleY * c;
  const f = start.y - srcX0 * b - srcSoleY * d;
  return `matrix(${a.toFixed(4)} ${b.toFixed(4)} ${c.toFixed(4)} ${d.toFixed(4)} ${e.toFixed(2)} ${f.toFixed(2)})`;
}

function renderPartVectorPaths(part: VectorizedPartSvg, clipId: string): string {
  const paths = part.regionPaths
    .map((p) => `<path fill="${p.fillHex}" d="${p.d}"/>`)
    .join('');
  return `<g clip-path="url(#${clipId})">${paths}</g>`;
}

function buildSegmentedBoneSvgGroup(
  part: VectorizedPartSvg,
  seg: SvgSegmentPlacement,
): string {
  const matrix = computeSegmentMatrixAttr(seg);
  const clipId = `svg-rig-clip-${seg.partId}`;
  return [
    `<defs><clipPath id="${clipId}"><path d="${part.silhouettePathD}"/></clipPath></defs>`,
    `<g id="rig-part-${seg.partId}" data-part-id="${seg.partId}" transform="${matrix}">`,
    renderPartVectorPaths(part, clipId),
    `</g>`,
  ].join('\n');
}

function buildRollingFootSvgGroup(
  part: VectorizedPartSvg,
  partId: 'nearFoot' | 'farFoot',
  leg: LimbKinematics,
): string {
  const rearLen = Math.hypot(
    leg.ballPoint.x - leg.heelPoint.x,
    leg.ballPoint.y - leg.heelPoint.y,
  );
  const foreLen = Math.hypot(
    leg.tipPoint.x - leg.ballPoint.x,
    leg.tipPoint.y - leg.ballPoint.y,
  );
  const scaleY = (rearLen + foreLen) / 115;
  const rearMat = computeHorizontalSpanMatrixAttr(
    leg.heelPoint,
    leg.ballPoint,
    33,
    109,
    116,
    scaleY,
  );
  const foreMat = computeHorizontalSpanMatrixAttr(
    leg.ballPoint,
    leg.tipPoint,
    109,
    148,
    116,
    scaleY,
  );
  const silId = `svg-foot-sil-${partId}`;
  const rearClip = `svg-foot-rear-${partId}`;
  const foreClip = `svg-foot-fore-${partId}`;
  return [
    `<defs>`,
    `  <clipPath id="${silId}"><path d="${part.silhouettePathD}"/></clipPath>`,
    `  <clipPath id="${rearClip}"><path d="M 0 0 H 109 A 28 38 0 0 1 109 160 H 0 Z"/></clipPath>`,
    `  <clipPath id="${foreClip}"><path d="M 109 0 H 160 V 160 H 109 A 22 34 0 0 1 109 0 Z"/></clipPath>`,
    `</defs>`,
    `<g id="rig-part-${partId}" data-part-id="${partId}">`,
    `  <g transform="${rearMat}" clip-path="url(#${rearClip})">${renderPartVectorPaths(part, silId)}</g>`,
    `  <g transform="${foreMat}" clip-path="url(#${foreClip})">${renderPartVectorPaths(part, silId)}</g>`,
    `</g>`,
  ].join('\n');
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

function buildRigPlacements(
  pose: ArticulatedPose,
  assetTuning?: PhotorealAssetTuningSpec,
): readonly SvgSegmentPlacement[] {
  const tuning = resolvePhotorealAssetTuning(assetTuning?.personaId, assetTuning);
  const stdTop: Point2D = { x: 80, y: 36 };
  const stdBot: Point2D = { x: 80, y: 124 };
  const headPivot: Point2D = { x: pose.neck.x + 2.0, y: pose.neck.y + 2.0 };
  const headCrown: Point2D = {
    x: headPivot.x + 1.0 + Math.sin(pose.neckAngleRad) * 2.0,
    y: headPivot.y - 26.5 * tuning.headScale,
  };
  const ponyBounce = Math.sin(pose.phase * Math.PI * 4 - 0.55) * 4.0;
  const ponyRoot: Point2D = { x: headPivot.x - 7.5, y: headPivot.y - 15.5 };
  const ponyTip: Point2D = { x: ponyRoot.x - 25, y: ponyRoot.y + 3.0 + ponyBounce };
  const shoulderSocket: Point2D = { x: pose.nearArm.hipOrShoulder.x - 0.5, y: pose.nearArm.hipOrShoulder.y - 1.5 };
  const pelvisTop: Point2D = {
    x: pose.pelvis.x + 1.5 + (pose.collar.x - pose.pelvis.x) * 0.16,
    y: pose.pelvis.y - 8.5 + tuning.hipOffsetY,
  };
  const pelvisBot: Point2D = {
    x: pose.pelvis.x - 1.0,
    y: pose.pelvis.y + 12.5 * tuning.pelvisLengthScale + tuning.hipOffsetY,
  };
  return [
    { partId: 'farUpperArm', start: pose.farArm.hipOrShoulder, end: pose.farArm.midJoint, srcStart: stdTop, srcEnd: stdBot, dstHalfWidthPx: Math.round(tuning.upperArmWidthPx * 0.92) },
    { partId: 'farForearm', start: pose.farArm.midJoint, end: pose.farArm.endEffector, srcStart: stdTop, srcEnd: stdBot, dstHalfWidthPx: Math.round(tuning.forearmWidthPx * 0.92) },
    { partId: 'farHand', start: pose.farArm.endEffector, end: computeHandTip(pose.farArm, tuning.handLengthPx), srcStart: stdTop, srcEnd: stdBot, dstHalfWidthPx: Math.round(tuning.handWidthPx * 0.92) },
    { partId: 'farShin', start: pose.farLeg.midJoint, end: pose.farLeg.endEffector, srcStart: stdTop, srcEnd: stdBot, dstHalfWidthPx: Math.round(tuning.shinWidthPx * 0.95) },
    { partId: 'farThigh', start: pose.farLeg.hipOrShoulder, end: pose.farLeg.midJoint, srcStart: stdTop, srcEnd: stdBot, dstHalfWidthPx: Math.round(tuning.thighWidthPx * 0.95) },
    { partId: 'neck', start: { x: pose.neck.x + 2.2, y: pose.neck.y - 1.5 }, end: { x: pose.collar.x + 1.0, y: pose.collar.y + 3.5 }, srcStart: stdTop, srcEnd: stdBot, dstHalfWidthPx: Math.round(tuning.torsoWidthPx * 0.48) },
    { partId: 'torso', start: { x: pose.collar.x - 0.5, y: pose.collar.y - 2.0 }, end: { x: pose.pelvis.x - 1.0, y: pose.pelvis.y + 1.0 }, srcStart: { x: 74, y: 26 }, srcEnd: { x: 80, y: 120 }, dstHalfWidthPx: tuning.torsoWidthPx },
    { partId: 'pelvis', start: pelvisTop, end: pelvisBot, srcStart: { x: 82, y: 32 }, srcEnd: { x: 78, y: 120 }, dstHalfWidthPx: tuning.pelvisWidthPx },
    { partId: 'nearShin', start: pose.nearLeg.midJoint, end: pose.nearLeg.endEffector, srcStart: stdTop, srcEnd: stdBot, dstHalfWidthPx: tuning.shinWidthPx },
    { partId: 'nearThigh', start: pose.nearLeg.hipOrShoulder, end: pose.nearLeg.midJoint, srcStart: stdTop, srcEnd: stdBot, dstHalfWidthPx: tuning.thighWidthPx },
    { partId: 'hairAccessory', start: ponyRoot, end: ponyTip, srcStart: { x: 142, y: 82 }, srcEnd: { x: 14, y: 86 }, dstHalfWidthPx: Math.round(18 * tuning.headScale) },
    { partId: 'head', start: headCrown, end: headPivot, srcStart: { x: 76, y: 12 }, srcEnd: { x: 76, y: 120 }, dstHalfWidthPx: 23 * tuning.headScale },
    { partId: 'nearUpperArm', start: shoulderSocket, end: pose.nearArm.midJoint, srcStart: stdTop, srcEnd: stdBot, dstHalfWidthPx: tuning.upperArmWidthPx },
    { partId: 'nearForearm', start: pose.nearArm.midJoint, end: pose.nearArm.endEffector, srcStart: stdTop, srcEnd: stdBot, dstHalfWidthPx: tuning.forearmWidthPx },
    { partId: 'nearHand', start: pose.nearArm.endEffector, end: computeHandTip(pose.nearArm, tuning.handLengthPx), srcStart: stdTop, srcEnd: stdBot, dstHalfWidthPx: tuning.handWidthPx },
  ];
}

/**
 * Stitches all 17 vectorized SVG articulated elements into a single hierarchical SVG document
 * ordered back-to-front (`zOrder = 1..17`) with rounded-end joint superimposition, 2-segment foot roll,
 * and per-element `PhotorealAssetTuningSpec` sizing/scaling controls.
 */
export function stitchArticulatedSvgRig(
  pose: ArticulatedPose,
  vectorParts: Readonly<Record<BodyPartId, VectorizedPartSvg>>,
  canvasSize: { readonly width: number; readonly height: number } = { width: 220, height: 256 },
  assetTuning?: PhotorealAssetTuningSpec,
): string {
  const tuning = resolvePhotorealAssetTuning(assetTuning?.personaId, assetTuning);
  const byId = new Map<BodyPartId, SvgSegmentPlacement>();
  for (const seg of buildRigPlacements(pose, tuning)) {
    byId.set(seg.partId, seg);
  }
  const orderedIds: readonly BodyPartId[] = [
    'farUpperArm',
    'farForearm',
    'farHand',
    'farShin',
    'farThigh',
    'farFoot',
    'neck',
    'torso',
    'pelvis',
    'nearShin',
    'nearThigh',
    'nearFoot',
    'hairAccessory',
    'head',
    'nearUpperArm',
    'nearForearm',
    'nearHand',
  ];
  const groups: string[] = [];
  for (const id of orderedIds) {
    if (id === 'farFoot') {
      groups.push(buildRollingFootSvgGroup(vectorParts.farFoot, 'farFoot', pose.farLeg));
    } else if (id === 'nearFoot') {
      groups.push(buildRollingFootSvgGroup(vectorParts.nearFoot, 'nearFoot', pose.nearLeg));
    } else {
      const seg = byId.get(id);
      if (seg) {
        groups.push(buildSegmentedBoneSvgGroup(vectorParts[id], seg));
      }
    }
  }
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasSize.width} ${canvasSize.height}" width="${canvasSize.width}" height="${canvasSize.height}" data-phase="${pose.phase.toFixed(4)}" data-persona-id="${tuning.personaId}" data-torso-width="${tuning.torsoWidthPx}" data-head-scale="${tuning.headScale.toFixed(3)}">`,
    groups.join('\n'),
    `</svg>`,
  ].join('\n');
}
