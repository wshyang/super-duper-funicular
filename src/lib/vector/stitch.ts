import type { Persona, Pose, Vec2 } from '../../shared/types.ts';
import { BODY, PART_IDS, type PartId } from '../rig/body.ts';

/**
 * Pose-native SVG stitcher (FDS #feat-export). Each of the 17 parts is emitted
 * in its REST shape (drawn from the proximal joint along +y) inside a `<g>`
 * carrying the exact 6-parameter affine `matrix(a b c d e f)` that maps rest →
 * posed. Back-to-front order = PART_IDS. Raster-part contour vectorisation is
 * a separate deferred item (CROSS-012).
 */
export function stitchSvgFrame(pose: Pose, persona: Persona, width: number, height: number, groundY: number): string {
  const groups = PART_IDS.map((part) => partGroup(part, pose, persona)).join('\n');
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<g transform="translate(${r2(width / 2)} ${r2(groundY)})">`,
    groups,
    '</g>',
    '</svg>',
  ].join('\n');
}

function partGroup(part: PartId, pose: Pose, persona: Persona): string {
  const shape = restShape(part, pose, persona);
  return `  <g data-part="${part}" transform="${shape.matrix}">${shape.body}</g>`;
}

interface RestShape {
  readonly matrix: string;
  readonly body: string;
}

function restShape(part: PartId, pose: Pose, persona: Persona): RestShape {
  const pal = persona.palette;
  const side = part.startsWith('near') ? 'near' : 'far';
  const far = side === 'far';
  const skin = far ? pal.skinFar : pal.skin;
  const kit = far ? shadeOf(pal.top) : pal.top;
  const kitLeg = far ? shadeOf(pal.bottom) : pal.bottom;
  const shoe = far ? pal.shoeFar : pal.shoe;
  const j = pose.joints;
  switch (part) {
    case 'far-upper-arm':
    case 'near-upper-arm':
      return limb(j.shoulder, j.elbow[side], BODY.humerus, skin);
    case 'far-forearm':
    case 'near-forearm':
      return limb(j.elbow[side], j.wrist[side], BODY.forearm, skin);
    case 'far-hand':
    case 'near-hand':
      return placed(circle(BODY.handRadius, skin), j.wrist[side]);
    case 'far-thigh':
    case 'near-thigh':
      return limb(j.hip, j.knee[side], BODY.femur, kitLeg);
    case 'far-shin':
    case 'near-shin':
      return limb(j.knee[side], j.ankle[side], BODY.tibia, kitLeg);
    case 'far-foot':
    case 'near-foot':
      return foot(j.ankle[side], pose.footPitch[side], shoe);
    case 'pelvis':
      return placed(circle(7, pal.bottom), j.hip);
    case 'torso':
      return limb(j.hip, j.shoulder, BODY.torso, pal.top);
    case 'neck':
      return limb(j.neckBase, j.headCenter, BODY.neck, pal.skin);
    case 'head':
      return placed(circle(BODY.headRadius, pal.skin), j.headCenter);
    case 'hair':
      return placed(circle(BODY.headRadius * 0.75, pal.hair), {
        x: j.headCenter.x - BODY.headRadius * 0.45,
        y: j.headCenter.y - BODY.headRadius * 0.45,
      });
  }
}

function limb(a: Vec2, b: Vec2, restLength: number, color: string): RestShape {
  const ux = (b.x - a.x) / restLength;
  const uy = (b.y - a.y) / restLength;
  const radius = radiusOf(restLength);
  const body = `<line x1="0" y1="0" x2="0" y2="${r2(restLength)}" stroke="${color}" stroke-width="${r2(radius * 2)}" stroke-linecap="round"/>`;
  return { matrix: `matrix(${r3(uy)} ${r3(-ux)} ${r3(ux)} ${r3(uy)} ${r2(a.x)} ${r2(a.y)})`, body };
}

function radiusOf(restLength: number): number {
  if (restLength === BODY.femur) return BODY.thighRadius;
  if (restLength === BODY.tibia) return BODY.shinRadius;
  if (restLength === BODY.torso) return 8;
  if (restLength === BODY.neck) return 3;
  return BODY.armRadius;
}

function circle(radius: number, color: string): string {
  return `<circle cx="0" cy="0" r="${r2(radius)}" fill="${color}"/>`;
}

function placed(body: string, at: Vec2): RestShape {
  return { matrix: `matrix(1 0 0 1 ${r2(at.x)} ${r2(at.y)})`, body };
}

function foot(ankle: Vec2, pitch: number, color: string): RestShape {
  const c = Math.cos(pitch);
  const s = Math.sin(pitch);
  const half = BODY.footLength * 0.5;
  const body = `<polygon points="${-half},-2 ${half},-2 ${half},${BODY.footHeight} ${-half},${BODY.footHeight}" fill="${color}"/>`;
  return { matrix: `matrix(${r3(c)} ${r3(s)} ${r3(-s)} ${r3(c)} ${r2(ankle.x)} ${r2(ankle.y)})`, body };
}

function shadeOf(hex: string): string {
  const int = Number.parseInt(hex.replace('#', ''), 16);
  const channel = (v: number): string => Math.round(v * 0.78).toString(16).padStart(2, '0');
  return `#${channel((int >> 16) & 255)}${channel((int >> 8) & 255)}${channel(int & 255)}`;
}

const r2 = (v: number): number => Math.round(v * 100) / 100;
const r3 = (v: number): number => Math.round(v * 1000) / 1000;
