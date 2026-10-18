import fs from 'node:fs';
import path from 'node:path';
import { readPngFile, writePngFile } from '../src/core/png.js';
import { createRaster, writePixel } from '../src/core/raster.js';
import { ATLAS_TILE_HEIGHT, ATLAS_TILE_WIDTH } from '../src/atlas/unwrap.js';
import { ATLAS_BONE_IDS } from '../src/rig/bones.js';
import { buildPersonaFromPlate } from '../src/render/persona.js';

const PERSONA_ID = process.argv[2] ?? 'athletic';
const OUT = process.argv[3] ?? path.join('out', 'atlas', PERSONA_ID);

const COLUMNS = 3;
const PAD = 6;
const LABEL = 10;

function main(): void {
  const plate = readPngFile(path.join('assets', 'personas', PERSONA_ID, '01-master-lateral.png'));
  const context = buildPersonaFromPlate(PERSONA_ID, plate);
  const rows = Math.ceil(ATLAS_BONE_IDS.length / COLUMNS);
  // Tile labels sit under each tile; cyan tint marks synthesised (not photographed) pixels.
  const sheet = createRaster(
    COLUMNS * (ATLAS_TILE_WIDTH + PAD) + PAD,
    rows * (ATLAS_TILE_HEIGHT + PAD + LABEL) + PAD,
    { r: 24, g: 26, b: 32, a: 255 },
  );
  ATLAS_BONE_IDS.forEach((id, index) => {
    const tile = context.atlas.tiles[id];
    const col = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);
    const ox = PAD + col * (ATLAS_TILE_WIDTH + PAD);
    const oy = PAD + row * (ATLAS_TILE_HEIGHT + PAD + LABEL);
    for (let y = 0; y < ATLAS_TILE_HEIGHT; y++) {
      for (let x = 0; x < ATLAS_TILE_WIDTH; x++) {
        const i = (y * ATLAS_TILE_WIDTH + x) * 4;
        const a = tile.data[i + 3] ?? 0;
        const synthetic = tile.observed[y * ATLAS_TILE_WIDTH + x] === 0;
        const tint = synthetic ? { r: 0.35, g: 1.05, b: 1.15 } : { r: 1, g: 1, b: 1 };
        writePixel(sheet, ox + x, oy + y, {
          r: Math.min(255, (tile.data[i] ?? 0) * tint.r),
          g: Math.min(255, (tile.data[i + 1] ?? 0) * tint.g),
          b: Math.min(255, (tile.data[i + 2] ?? 0) * tint.b),
          a,
        });
        if (a === 0) writePixel(sheet, ox + x, oy + y, { r: 34, g: 36, b: 42, a: 255 });
      }
    }
    const coverage = context.atlas.report.perBone[id];
    const label = `${id} w${coverage.halfWidthPx.toFixed(1)} s${coverage.synthetic}`;
    paintLabel(sheet, label, ox, oy + ATLAS_TILE_HEIGHT + 1);
    console.log(label);
  });
  fs.mkdirSync(OUT, { recursive: true });
  writePngFile(path.join(OUT, 'atlas-sheet.png'), sheet);
  fs.writeFileSync(path.join(OUT, 'atlas-report.json'), `${JSON.stringify(context.atlas.report, null, 2)}\n`);
  console.log(`synthetic fraction ${context.atlas.report.syntheticFraction}`);
}

/** Five-by-seven bitmap glyphs: enough to label an inspection sheet with no font dependency. */
const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  a: ['01110', '10001', '11111', '10001', '10001'],
  b: ['11110', '10001', '11110', '10001', '11110'],
  c: ['01110', '10001', '10000', '10001', '01110'],
  d: ['11110', '10001', '10001', '10001', '11110'],
  e: ['11111', '10000', '11110', '10000', '11111'],
  f: ['11111', '10000', '11110', '10000', '10000'],
  g: ['01111', '10000', '10011', '10001', '01111'],
  h: ['10001', '10001', '11111', '10001', '10001'],
  i: ['111', '010', '010', '010', '111'],
  l: ['10000', '10000', '10000', '10000', '11111'],
  m: ['10001', '11011', '10101', '10001', '10001'],
  n: ['10001', '11001', '10101', '10011', '10001'],
  o: ['01110', '10001', '10001', '10001', '01110'],
  p: ['11110', '10001', '11110', '10000', '10000'],
  r: ['10110', '11001', '10000', '10000', '10000'],
  s: ['01111', '10000', '01110', '00001', '11110'],
  t: ['11111', '00100', '00100', '00100', '00100'],
  u: ['10001', '10001', '10001', '10001', '01110'],
  v: ['10001', '10001', '10001', '01010', '00100'],
  w: ['10001', '10001', '10101', '11011', '10001'],
  y: ['10001', '01010', '00100', '00100', '00100'],
  '0': ['01110', '10011', '10101', '11001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00110', '01000', '11111'],
  '3': ['11110', '00001', '01110', '00001', '11110'],
  '4': ['10010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '11110'],
  '6': ['01110', '10000', '11110', '10001', '01110'],
  '7': ['11111', '00010', '00100', '01000', '10000'],
  '8': ['01110', '10001', '01110', '10001', '01110'],
  '9': ['01110', '10001', '01111', '00001', '01110'],
  '.': ['0', '0', '0', '0', '1'],
  '=': ['00000', '11111', '00000', '11111', '00000'],
  ' ': ['00', '00', '00', '00', '00'],
};

function paintLabel(target: ReturnType<typeof createRaster>, text: string, ox: number, oy: number): void {
  let cursor = ox;
  for (const character of text.toLowerCase()) {
    const glyph = GLYPHS[character] ?? GLYPHS[' '] ?? [];
    const width = (glyph[0] ?? '').length;
    glyph.forEach((row, rowIndex) => {
      for (let column = 0; column < width; column++) {
        if (row[column] !== '1') continue;
        writePixel(target, cursor + column, oy + rowIndex, { r: 240, g: 240, b: 245, a: 255 });
      }
    });
    cursor += width + 1;
  }
}

main();
