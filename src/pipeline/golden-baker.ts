import type { RgbaImage } from './rgba-image.ts';
import { createImage, getPixel, setPixel } from './rgba-image.ts';
import { sha256Image } from './image-io.ts';

export const SHEET_BACKGROUND = { r: 0xe2, g: 0xe6, b: 0xee };
export const SHEET_COLS = 4;

export interface GoldenManifest {
  readonly personaId: string;
  readonly masterSha256: string;
  readonly recordRevision: number;
  readonly parts: Readonly<Record<string, string>>;
}

export function buildContactSheet(parts: Readonly<Record<string, RgbaImage>>): RgbaImage {
  const ids = Object.keys(parts).sort();
  const rows = Math.ceil(ids.length / SHEET_COLS);
  const sheet = createImage(SHEET_COLS * 160, rows * 160);
  for (let y = 0; y < sheet.height; y += 1) {
    for (let x = 0; x < sheet.width; x += 1) {
      setPixel(sheet, x, y, { ...SHEET_BACKGROUND, a: 255 });
    }
  }
  ids.forEach((id, index) => {
    const part = parts[id];
    if (part === undefined) return;
    const ox = (index % SHEET_COLS) * 160;
    const oy = Math.floor(index / SHEET_COLS) * 160;
    for (let y = 0; y < 160; y += 1) {
      for (let x = 0; x < 160; x += 1) {
        const pixel = getPixel(part, x, y);
        if (pixel.a === 0) continue;
        const base = getPixel(sheet, ox + x, oy + y);
        const alpha = pixel.a / 255;
        setPixel(sheet, ox + x, oy + y, {
          r: Math.round(pixel.r * alpha + base.r * (1 - alpha)),
          g: Math.round(pixel.g * alpha + base.g * (1 - alpha)),
          b: Math.round(pixel.b * alpha + base.b * (1 - alpha)),
          a: 255,
        });
      }
    }
  });
  return sheet;
}

export function buildGoldenManifest(personaId: string, masterSha256: string, recordRevision: number, parts: Readonly<Record<string, RgbaImage>>): GoldenManifest {
  const hashes: Record<string, string> = {};
  for (const id of Object.keys(parts).sort()) {
    const part = parts[id];
    if (part !== undefined) hashes[id] = sha256Image(part);
  }
  return { personaId, masterSha256, recordRevision, parts: hashes };
}
