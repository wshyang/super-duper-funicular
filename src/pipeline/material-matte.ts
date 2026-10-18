import { getPixel, setPixel, type Pixel, type RgbaImage } from './rgba-image.ts';

export type PurgeClass = 'crimsonFabric' | 'blackFabric' | 'cyanBand' | 'whiteStripeFabric';

const CLASSES: Readonly<Record<PurgeClass, (p: Pixel) => boolean>> = {
  crimsonFabric: (p) => p.r >= 120 && p.r - p.g >= 96 && (p.g < 52 || p.r - p.b > 96),
  blackFabric: (p) => p.r < 70 && p.g < 70 && p.b < 70,
  cyanBand: (p) => p.b > 180 && p.g > 120 && p.r < 160,
  whiteStripeFabric: (p) => p.r > 215 && p.g > 215 && p.b > 215,
};

export function purgeMaterialClasses(image: RgbaImage, classes: readonly PurgeClass[]): RgbaImage {
  if (classes.length === 0) return image;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const pixel = getPixel(image, x, y);
      if (pixel.a === 0) continue;
      if (classes.some((id) => CLASSES[id](pixel))) setPixel(image, x, y, { ...pixel, a: 0 });
    }
  }
  return image;
}

export function purgeClassesForKind(kind: string): readonly PurgeClass[] {
  if (kind === 'arm' || kind === 'hand') return ['crimsonFabric', 'blackFabric', 'whiteStripeFabric'];
  if (kind === 'neck') return ['crimsonFabric'];
  if (kind === 'leg') return ['cyanBand'];
  return [];
}
