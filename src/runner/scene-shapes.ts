import type { BodyPartId, Primitive, ScenePart, Vec2 } from '../shared/types.ts';
import { add, rotate, vec } from './vec.ts';

export const OUTLINE = '#181a20';
export const OUTLINE_FAR = 'rgba(24, 26, 32, 0.82)';

export interface ToneOptions {
  readonly outline?: string;
  readonly outlineWidth?: number;
  readonly alpha?: number;
}

const clampChannel = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));

const parseHex = (hex: string): [number, number, number] => {
  const value = hex.replace('#', '');
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
};

export const mixHex = (a: string, b: string, amount: number): string => {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  const channel = (x: number, y: number): string =>
    clampChannel(x + (y - x) * amount)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(ar, br)}${channel(ag, bg)}${channel(ab, bb)}`;
};

export const darken = (hex: string, amount: number): string => mixHex(hex, '#0b0d12', amount);
export const lighten = (hex: string, amount: number): string => mixHex(hex, '#ffffff', amount);

export const capsule = (
  a: Vec2,
  b: Vec2,
  radius: number,
  fill: string,
  options: ToneOptions = {},
): Primitive => ({
  kind: 'capsule',
  a,
  b,
  radius,
  fill,
  outline: options.outline ?? OUTLINE,
  outlineWidth: options.outlineWidth ?? 1.15,
  alpha: options.alpha,
});

export const circle = (
  center: Vec2,
  radius: number,
  fill: string,
  options: ToneOptions = {},
): Primitive => ({
  kind: 'circle',
  center,
  radius,
  fill,
  outline: options.outline ?? OUTLINE,
  outlineWidth: options.outlineWidth ?? 1.1,
  alpha: options.alpha,
});

export const polygon = (
  points: readonly Vec2[],
  fill: string,
  options: ToneOptions = {},
): Primitive => ({
  kind: 'polygon',
  points,
  fill,
  outline: options.outline,
  outlineWidth: options.outlineWidth ?? 1.15,
  alpha: options.alpha,
});

export const shine = (a: Vec2, b: Vec2, radius: number): Primitive => ({
  kind: 'capsule',
  a,
  b,
  radius: radius * 0.32,
  fill: 'rgba(255, 255, 255, 0.15)',
});

export const ellipsePoints = (
  center: Vec2,
  rx: number,
  ry: number,
  rotation: number,
  segments = 28,
): Vec2[] => {
  const points: Vec2[] = [];
  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    const local = vec(Math.cos(angle) * rx, Math.sin(angle) * ry);
    points.push(add(center, rotate(local, rotation)));
  }
  return points;
};

export const limb = (
  part: BodyPartId,
  a: Vec2,
  b: Vec2,
  radius: number,
  fill: string,
  far: boolean,
  joint?: Primitive,
): ScenePart => ({
  part,
  primitives: [
    capsule(a, b, radius, fill, { outline: far ? OUTLINE_FAR : OUTLINE }),
    shine(a, b, radius),
    ...(joint ? [joint] : []),
  ],
});
