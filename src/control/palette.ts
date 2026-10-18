import type { MaterialId, RgbaColor } from '../core/types.js';

export interface PlatePalette {
  readonly name: string;
  readonly materials: Readonly<Record<MaterialId, RgbaColor>>;
  readonly background: RgbaColor;
  readonly joint: RgbaColor;
  readonly ground: RgbaColor;
}

const colour = (r: number, g: number, b: number): RgbaColor => ({ r, g, b, a: 255 });

export const ANCHOR_PALETTE: PlatePalette = {
  name: 'anchor-crimson',
  materials: {
    skin: colour(201, 154, 114),
    skinFar: colour(170, 126, 92),
    fabric: colour(142, 27, 42),
    fabricFar: colour(110, 21, 33),
    footwear: colour(242, 240, 236),
    footwearFar: colour(206, 202, 194),
    hair: colour(34, 26, 25),
  },
  background: colour(255, 0, 255),
  joint: colour(0, 255, 255),
  ground: colour(30, 30, 34),
};

export const VIEW_PALETTE: PlatePalette = {
  ...ANCHOR_PALETTE,
  name: 'view-neutral',
  background: colour(226, 230, 238),
  ground: colour(120, 126, 138),
};
