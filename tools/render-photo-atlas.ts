/**
 * Renders the photographic parts atlas with the same cell painter the app
 * uses, so the rig viewer can be checked without a browser.
 * Run with: npx tsx tools/render-photo-atlas.ts
 */
import { Path2D, createCanvas, loadImage } from "@napi-rs/canvas";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { paintAtlasCell } from "../src/app/components/photo-atlas.ts";
import { parsePhotoRig, PHOTO_PART_ORDER } from "../src/lib/photo/rig.ts";
import type { BitmapImage } from "../src/lib/render/photo-paint.ts";

globalThis.Path2D = Path2D as unknown as typeof globalThis.Path2D;

const rig = parsePhotoRig(JSON.parse(readFileSync("public/sprites/photo/female-rig.json", "utf8")));
const CELL = 132;
const GAP = 10;
const COLUMNS = 3;
const ROWS = Math.ceil(PHOTO_PART_ORDER.length / COLUMNS);
const canvas = createCanvas(COLUMNS * CELL + (COLUMNS + 1) * GAP, ROWS * CELL + (ROWS + 1) * GAP);
const context = canvas.getContext("2d");
context.fillStyle = "#121820";
context.fillRect(0, 0, canvas.width, canvas.height);

const asset = new Map<string, BitmapImage>();
for (const part of rig.parts) {
  asset.set(part.file, (await loadImage(resolve("public/sprites/photo", part.file))) as unknown as BitmapImage);
}

rig.parts.forEach((part, index) => {
  const column = index % COLUMNS;
  const row = Math.floor(index / COLUMNS);
  context.save();
  context.translate(GAP + column * (CELL + GAP), GAP + row * (CELL + GAP));
  // napi's context is structurally the DOM one for every call this painter makes.
  paintAtlasCell(context as unknown as CanvasRenderingContext2D, part, asset.get(part.file));
  context.restore();
});

mkdirSync("reports", { recursive: true });
const file = "reports/photo-atlas-female-rig.png";
writeFileSync(file, canvas.toBuffer("image/png"));
console.log(`wrote ${file} ${canvas.width}x${canvas.height} with ${rig.parts.length} cells`);
