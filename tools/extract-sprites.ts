/**
 * Cuts the reference sheet into individual sprites and files them under a
 * public URL path. Run with: npm run sprites:extract
 *
 * Outputs
 *   src/images/colorways/<colourway>-runner-8frame-strip.png     art reference strip
 *   public/sprites/reference/<colourway>/frame-<nn>.png          registered
 *   public/sprites/reference/<colourway>/frame-<nn>.cutout.png   tight crop
 *   public/sprites/manifest.json                                 layout + metrics
 *   public/sprites/contact-sheet.png                             visual index
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { detectAccent } from "../src/lib/pipeline/accent.ts";
import { readImage, type RgbaImage } from "../src/lib/pipeline/decode.ts";
import { blit, encodePng, onBackdrop, type RgbaPixels } from "../src/lib/pipeline/png.ts";
import { detectSheet } from "../src/lib/pipeline/sheet.ts";
import {
  cutCell,
  encodeSignature,
  magentaLeak,
  poseSignatureVector,
  registerSprites,
  signatureDistance,
  type CutSprite,
} from "../src/lib/pipeline/sprite-cut.ts";

const SOURCE = resolve("src/images/source/runner-sheet__8frame-alternating-gait__6-colorways__source.jpeg");
const OUTPUT = resolve("public/sprites");
const ART = resolve("src/images/colorways");
const DUPLICATE_THRESHOLD = 0.06;

interface FrameRecord {
  readonly file: string;
  readonly cutoutFile: string;
  readonly row: number;
  readonly column: number;
  readonly width: number;
  readonly height: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly footContactY: number;
  readonly pelvisX: number;
  readonly pelvisY: number;
  readonly area: number;
  readonly magentaLeakPixels: number;
  readonly poseSignature: string;
  readonly signatureVector: readonly number[];
  readonly duplicateOfFrame: number | null;
}

const image = await readImage(SOURCE);
const layout = detectSheet(image);
const sprites = layout.cells.map((cell) => cutCell(image, cell, layout.labels));
const registration = registerSprites(sprites);

mkdirSync(OUTPUT, { recursive: true });
mkdirSync(ART, { recursive: true });
const frames: FrameRecord[] = [];
const colorways: string[] = [];
const signatures = sprites.map((sprite) => poseSignatureVector(sprite.rgba, sprite.width, sprite.height));

for (let row = 0; row < layout.rows; row += 1) {
  const rowIndices = layout.cells.flatMap((cell, index) => (cell.row === row ? [index] : []));
  const accent = detectAccent(stitchRow(rowIndices.map((index) => sprites[index] as CutSprite)));
  const folder = `${accent.name}-${accent.hex.replace("#", "")}`;
  colorways.push(folder);
  mkdirSync(resolve(OUTPUT, "reference", folder), { recursive: true });
  writeFileSync(
    resolve(ART, `${accent.name}-runner-8frame-strip.png`),
    encodePng(...stripsOf(rowIndices.map((index) => sprites[index] as CutSprite))),
  );
  for (const index of rowIndices) {
    const cell = layout.cells[index] as (typeof layout.cells)[number];
    const sprite = sprites[index] as CutSprite;
    const registered = registration.frames[index];
    if (registered === undefined) throw new Error(`Missing registration for cell ${index}`);
    const frameNumber = cell.column + 1;
    const name = `frame-${String(frameNumber).padStart(2, "0")}`;
    writeFileSync(
      resolve(OUTPUT, "reference", folder, `${name}.png`),
      encodePng(registered.rgba, registration.width, registration.height),
    );
    writeFileSync(
      resolve(OUTPUT, "reference", folder, `${name}.cutout.png`),
      encodePng(sprite.rgba, sprite.width, sprite.height),
    );
    frames.push({
      file: `/sprites/reference/${folder}/${name}.png`,
      cutoutFile: `/sprites/reference/${folder}/${name}.cutout.png`,
      row,
      column: cell.column,
      width: sprite.width,
      height: sprite.height,
      offsetX: registered.offsetX,
      offsetY: registered.offsetY,
      footContactY: sprite.metrics.footContactY + registered.offsetY,
      pelvisX: sprite.metrics.pelvisX + registered.offsetX,
      pelvisY: sprite.metrics.pelvisY + registered.offsetY,
      area: sprite.metrics.area,
      magentaLeakPixels: magentaLeak(sprite.rgba),
      poseSignature: encodeSignature(signatures[index] ?? []),
      signatureVector: signatures[index] ?? [],
      duplicateOfFrame: findEarlierDuplicate(index, row, layout.columns, signatures),
    });
  }
}

const duplicateGroups = groupDuplicates(frames);
const manifest = {
  generatedBy: "npm run sprites:extract",
  source: "/sprites/../src/images/source/runner-sheet__8frame-alternating-gait__6-colorways__source.jpeg",
  sourcePixels: { width: image.width, height: image.height },
  layout: { rows: layout.rows, columns: layout.columns, cells: layout.cells.length },
  registration: {
    canvas: { width: registration.width, height: registration.height },
    pivot: "pelvis centroid (shorts colour), translation only, no rescaling",
  },
  colorways: colorways.map((folder, row) => ({ row, id: folder, folder })),
  frames,
  duplicateGroups,
};
writeFileSync(resolve(OUTPUT, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(resolve(OUTPUT, "contact-sheet.png"), encodePng(...contactSheet(sprites, layout.rows, layout.columns)));

console.log(`sheet ${image.width}x${image.height} -> ${layout.rows} rows x ${layout.columns} columns`);
console.log(`colourways: ${colorways.join(", ")}`);
console.log(`registered canvas: ${registration.width}x${registration.height}`);
console.log(`frames written: ${frames.length} (plus tight cut-outs)`);
console.log(`magenta leak pixels: ${frames.reduce((sum, frame) => sum + frame.magentaLeakPixels, 0)}`);
console.log(`duplicate groups: ${duplicateGroups.length}`);
for (const group of duplicateGroups) console.log(`  ${group.kind}: ${group.frames.join(", ")}`);

/** One colourway's eight cut-outs laid out left to right, transparent between. */
function stripsOf(rowSprites: readonly CutSprite[]): [Uint8ClampedArray, number, number] {
  const gap = 10;
  const width = rowSprites.reduce((sum, sprite) => sum + sprite.width + gap, gap);
  const height = Math.max(...rowSprites.map((sprite) => sprite.height)) + gap * 2;
  const canvas: RgbaPixels = { width, height, rgba: new Uint8ClampedArray(width * height * 4) };
  let cursor = gap;
  for (const sprite of rowSprites) {
    blit(canvas, { width: sprite.width, height: sprite.height, rgba: sprite.rgba }, cursor, gap);
    cursor += sprite.width + gap;
  }
  return [canvas.rgba, canvas.width, canvas.height];
}

function stitchRow(rowSprites: readonly CutSprite[]): RgbaImage {
  const width = rowSprites.reduce((sum, sprite) => sum + sprite.width + 8, 8);
  const height = Math.max(...rowSprites.map((sprite) => sprite.height));
  const data = new Uint8ClampedArray(width * height * 4);
  let cursor = 8;
  for (const sprite of rowSprites) {
    for (let y = 0; y < sprite.height; y += 1) {
      for (let x = 0; x < sprite.width; x += 1) {
        const from = (y * sprite.width + x) * 4;
        if ((sprite.rgba[from + 3] ?? 0) < 200) continue;
        const to = (y * width + cursor + x) * 4;
        data[to] = sprite.rgba[from] ?? 0;
        data[to + 1] = sprite.rgba[from + 1] ?? 0;
        data[to + 2] = sprite.rgba[from + 2] ?? 0;
        data[to + 3] = 255;
      }
    }
    cursor += sprite.width + 8;
  }
  return { width, height, data };
}

function findEarlierDuplicate(
  index: number,
  row: number,
  columns: number,
  allSignatures: readonly (readonly number[])[],
): number | null {
  for (let candidate = 0; candidate < index; candidate += 1) {
    const sameRow = Math.floor(candidate / columns) === row;
    if (!sameRow) continue;
    const distance = signatureDistance(allSignatures[index] ?? [], allSignatures[candidate] ?? []);
    if (distance <= DUPLICATE_THRESHOLD) return (candidate % columns) + 1;
  }
  return null;
}

function groupDuplicates(records: readonly FrameRecord[]): Array<{ kind: string; frames: string[] }> {
  const groups: Array<{ kind: string; frames: string[] }> = [];
  const perRow = new Map<number, FrameRecord[]>();
  for (const record of records) {
    const bucket = perRow.get(record.row) ?? [];
    bucket.push(record);
    perRow.set(record.row, bucket);
  }
  for (const [row, bucket] of perRow) {
    const used = new Set<string>();
    for (const record of bucket) {
      if (used.has(record.file)) continue;
      const members = bucket.filter(
        (other) => !used.has(other.file) && signatureDistance(record.signatureVector, other.signatureVector) <= DUPLICATE_THRESHOLD,
      );
      if (members.length < 2) continue;
      for (const member of members) used.add(member.file);
      groups.push({
        kind: `row ${row + 1} repeated pose`,
        frames: members.map((member) => `f${member.column + 1}`),
      });
    }
  }
  return groups;
}

function contactSheet(
  allSprites: readonly CutSprite[],
  rows: number,
  columns: number,
): [Uint8ClampedArray, number, number] {
  const cellWidth = Math.max(...allSprites.map((sprite) => sprite.width)) + 12;
  const cellHeight = Math.max(...allSprites.map((sprite) => sprite.height)) + 12;
  const sheet: RgbaPixels = {
    width: cellWidth * columns,
    height: cellHeight * rows,
    rgba: new Uint8ClampedArray(cellWidth * columns * cellHeight * rows * 4),
  };
  for (let y = 0; y < sheet.height; y += 1) {
    for (let x = 0; x < sheet.width; x += 1) {
      const offset = (y * sheet.width + x) * 4;
      const checker = (Math.floor(x / 16) + Math.floor(y / 16)) % 2 === 0;
      const value = checker ? 32 : 40;
      sheet.rgba[offset] = value;
      sheet.rgba[offset + 1] = value + 4;
      sheet.rgba[offset + 2] = value + 8;
      sheet.rgba[offset + 3] = 255;
    }
  }
  allSprites.forEach((sprite, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const targetX = column * cellWidth + Math.floor((cellWidth - sprite.width) / 2);
    const targetY = row * cellHeight + Math.floor((cellHeight - sprite.height) / 2);
    blit(sheet, { width: sprite.width, height: sprite.height, rgba: sprite.rgba }, targetX, targetY);
  });
  void onBackdrop;
  return [sheet.rgba, sheet.width, sheet.height];
}
