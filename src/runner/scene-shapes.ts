import type { BodyPartId, Primitive, ScenePart, Vec2 } from '../shared/types.ts';
import { add, rotate, vec } from './vec.ts';

export const OUTLINE = '#181a20';
export const OUTLINE_FAR = 'rgba(24, 26, 32, 0.82)';

export interface ToneOptions {
  readonly outline?: string;
  readonly outlineWidth?: number;
  readonly alpha?: number;
}

interface Rgba {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

const clampChannel = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, Math.min(255, Math.round(value))) : 0;

/** Accepts `#rgb`, `#rrggbb`, `rgb(...)` and `rgba(...)`; never returns NaN. */
export const parseColor = (color: string): Rgba => {
  const trimmed = color.trim();
  if (trimmed.startsWith('#')) {
    const value = trimmed.slice(1);
    const full =
      value.length === 3
        ? value
            .split('')
            .map((channel) => channel + channel)
            .join('')
        : value;
    return {
      r: clampChannel(Number.parseInt(full.slice(0, 2), 16)),
      g: clampChannel(Number.parseInt(full.slice(2, 4), 16)),
      b: clampChannel(Number.parseInt(full.slice(4, 6), 16)),
      a: 1,
    };
  }
  const match = trimmed.match(/^rgba?\(([^)]+)\)$/i);
  if (!match) return { r: 0, g: 0, b: 0, a: 1 };
  const parts = (match[1] as string).split(',').map((part) => Number.parseFloat(part.trim()));
  const alpha = parts[3];
  return {
    r: clampChannel(parts[0] ?? 0),
    g: clampChannel(parts[1] ?? 0),
    b: clampChannel(parts[2] ?? 0),
    a: alpha === undefined || !Number.isFinite(alpha) ? 1 : Math.max(0, Math.min(1, alpha)),
  };
};

const formatColor = ({ r, g, b, a }: Rgba): string => {
  if (a >= 1) {
    const hex = (value: number): string => clampChannel(value).toString(16).padStart(2, '0');
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  }
  const rounded = Math.round(a * 1000) / 1000;
  return `rgba(${clampChannel(r)}, ${clampChannel(g)}, ${clampChannel(b)}, ${rounded})`;
};

/** Linear blend of two colours; alpha is blended too so rgba inputs stay valid. */
export const mixHex = (a: string, b: string, amount: number): string => {
  const from = parseColor(a);
  const to = parseColor(b);
  const ratio = Number.isFinite(amount) ? Math.max(0, Math.min(1, amount)) : 0;
  return formatColor({
    r: from.r + (to.r - from.r) * ratio,
    g: from.g + (to.g - from.g) * ratio,
    b: from.b + (to.b - from.b) * ratio,
    a: from.a + (to.a - from.a) * ratio,
  });
};

export const darken = (color: string, amount: number): string => mixHex(color, '#0b0d12', amount);
export const lighten = (color: string, amount: number): string => mixHex(color, '#ffffff', amount);

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
  joints: readonly Primitive[] = [],
): ScenePart => ({
  part,
  primitives: [
    capsule(a, b, radius, fill, { outline: far ? OUTLINE_FAR : OUTLINE }),
    shine(a, b, radius),
    ...joints,
  ],
});
