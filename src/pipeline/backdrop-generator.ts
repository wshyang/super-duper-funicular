import path from 'node:path';
import type { RasterImage, RgbaColor } from '../shared/types.js';
import { writePngFile } from './image-io.js';
import { createRaster, writePixel } from './raster.js';

export type StadiumTheme = 'day' | 'dusk' | 'night';

interface ThemePalette {
  readonly skyTop: RgbaColor;
  readonly skyHorizon: RgbaColor;
  readonly standUpper: RgbaColor;
  readonly standLower: RgbaColor;
  readonly turf: RgbaColor;
  readonly trackMain: RgbaColor;
  readonly trackLine: RgbaColor;
}

const STADIUM_THEMES: Readonly<Record<StadiumTheme, ThemePalette>> = {
  day: {
    skyTop: { r: 44, g: 122, b: 224, a: 255 },
    skyHorizon: { r: 162, g: 214, b: 255, a: 255 },
    standUpper: { r: 64, g: 82, b: 112, a: 255 },
    standLower: { r: 46, g: 60, b: 86, a: 255 },
    turf: { r: 42, g: 148, b: 74, a: 255 },
    trackMain: { r: 184, g: 68, b: 52, a: 255 },
    trackLine: { r: 244, g: 246, b: 250, a: 255 },
  },
  dusk: {
    skyTop: { r: 42, g: 32, b: 88, a: 255 },
    skyHorizon: { r: 238, g: 118, b: 74, a: 255 },
    standUpper: { r: 48, g: 42, b: 72, a: 255 },
    standLower: { r: 32, g: 28, b: 52, a: 255 },
    turf: { r: 32, g: 108, b: 58, a: 255 },
    trackMain: { r: 152, g: 54, b: 46, a: 255 },
    trackLine: { r: 236, g: 224, b: 212, a: 255 },
  },
  night: {
    skyTop: { r: 10, g: 16, b: 36, a: 255 },
    skyHorizon: { r: 28, g: 44, b: 82, a: 255 },
    standUpper: { r: 24, g: 32, b: 54, a: 255 },
    standLower: { r: 16, g: 22, b: 38, a: 255 },
    turf: { r: 22, g: 88, b: 48, a: 255 },
    trackMain: { r: 124, g: 44, b: 42, a: 255 },
    trackLine: { r: 220, g: 232, b: 248, a: 255 },
  },
};

export function renderStadiumBackdrop(theme: StadiumTheme): RasterImage {
  const width = 640;
  const height = 256;
  const raster = createRaster(width, height);
  const colors = STADIUM_THEMES[theme];
  for (let y = 0; y < height; y++) {
    const rowColor = resolveBackdropRowColor(y, height, colors);
    fillRow(raster, y, rowColor);
  }
  return raster;
}

function resolveBackdropRowColor(
  y: number,
  height: number,
  colors: ThemePalette,
): RgbaColor {
  if (y < 115) {
    const t = y / 115;
    return lerpRgba(colors.skyTop, colors.skyHorizon, t);
  }
  if (y < 155) {
    return y % 8 === 0 ? colors.standUpper : colors.standLower;
  }
  if (y < 188) {
    return colors.turf;
  }
  if (y === 190 || y === 212 || y === 236 || y === 252) {
    return colors.trackLine;
  }
  void height;
  return colors.trackMain;
}

function fillRow(raster: RasterImage, y: number, color: RgbaColor): void {
  for (let x = 0; x < raster.width; x++) {
    writePixel(raster, { x, y }, color);
  }
}

function lerpRgba(a: RgbaColor, b: RgbaColor, t: number): RgbaColor {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
    a: 255,
  };
}

export function generateAllBackdrops(srcImagesDir: string, publicBackdropsDir: string): string[] {
  const themes: readonly StadiumTheme[] = ['day', 'dusk', 'night'];
  const written: string[] = [];
  for (const theme of themes) {
    const raster = renderStadiumBackdrop(theme);
    const fileName = `stadium-track-${theme}.png`;
    const srcPath = path.join(srcImagesDir, 'backdrops', fileName);
    const pubPath = path.join(publicBackdropsDir, fileName);
    writePngFile(srcPath, raster);
    writePngFile(pubPath, raster);
    written.push(srcPath);
  }
  return written;
}
