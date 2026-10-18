import type { Raster } from '../../shared/types.ts';
import { getPixel } from './image-io.ts';
import { isMagentaLike } from './sheet-spec.ts';

export interface KeyedCell {
  readonly raster: Raster;
  readonly naiveResidue: number;
  readonly keyedResidue: number;
}

/**
 * Border-seeded flood-fill chroma key over both magenta tones, plus a
 * dilate-1 despill of fringes (FDS #feat-extraction step 3). Returns the keyed
 * cell and residue counts for the FLAW-05 evidence pair: a naive single-tone
 * key vs this key.
 */
export function keyCell(cell: Raster): KeyedCell {
  const background = globalBackground(cell);
  despill(cell, background);
  const out = blankOf(cell);
  for (let i = 0; i < background.length; i += 1) {
    if (!background[i]) {
      out.data[i * 4] = cell.data[i * 4] ?? 0;
      out.data[i * 4 + 1] = cell.data[i * 4 + 1] ?? 0;
      out.data[i * 4 + 2] = cell.data[i * 4 + 2] ?? 0;
      out.data[i * 4 + 3] = 255;
    }
  }
  return { raster: out, naiveResidue: naiveResidue(cell), keyedResidue: residue(out) };
}

function blankOf(cell: Raster): Raster {
  return { width: cell.width, height: cell.height, data: new Uint8ClampedArray(cell.width * cell.height * 4) };
}

function globalBackground(cell: Raster): Uint8Array {
  // Strict two-tone magenta predicate (divider + cell background) removes both
  // the border-connected field and isolated slivers inside limb gaps, without
  // touching violet kit pixels (b < 200 there). Despill then clears fringes.
  const background = new Uint8Array(cell.width * cell.height);
  for (let i = 0; i < background.length; i += 1) {
    const [r, g, b] = getPixel(cell, i % cell.width, Math.floor(i / cell.width));
    background[i] = isMagentaLike(r, g, b) ? 1 : 0;
  }
  return background;
}

/** Fringe removal: opaque magenta-like pixels touching background become background. */
function despill(cell: Raster, background: Uint8Array): void {
  const width = cell.width;
  for (let y = 1; y < cell.height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      if (background[index]) continue;
      const [r, g, b] = getPixel(cell, x, y);
      if (!isMagentaLike(r, g, b)) continue;
      if (touchesBackground(background, width, x, y)) background[index] = 1;
    }
  }
}

function touchesBackground(background: Uint8Array, width: number, x: number, y: number): boolean {
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (background[(y + dy) * width + (x + dx)]) return true;
    }
  }
  return false;
}

function naiveResidue(cell: Raster): number {
  // Single-tone key of only the divider colour (253,0,252): cell background survives.
  let count = 0;
  for (let i = 0; i < cell.width * cell.height; i += 1) {
    const [r, g, b] = getPixel(cell, i % cell.width, Math.floor(i / cell.width));
    if (Math.abs(r - 253) <= 6 && Math.abs(g - 74) <= 26 && Math.abs(b - 253) <= 6) count += 1;
  }
  return count;
}

function residue(keyed: Raster): number {
  let count = 0;
  for (let i = 0; i < keyed.width * keyed.height; i += 1) {
    if ((keyed.data[i * 4 + 3] ?? 0) === 0) continue;
    const [r, g, b] = getPixel(keyed, i % keyed.width, Math.floor(i / keyed.width));
    if (isMagentaLike(r, g, b)) count += 1;
  }
  return count;
}
