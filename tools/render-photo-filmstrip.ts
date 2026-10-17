/**
 * Renders the photographic rig through a full stride with the real canvas
 * painter. Run with: npm run photo:filmstrip
 */
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_CONTROLS, resolveGait } from "../src/lib/gait/gait.ts";
import { solvePose } from "../src/lib/gait/pose.ts";
import { paintPhotoRunner, type BitmapImage } from "../src/lib/render/photo-paint.ts";
import type { View } from "../src/lib/render/paint.ts";
import { composePhotoRunner, photoAssetFiles } from "../src/lib/photo/scene.ts";
import { parsePhotoRig, photoBodyMetrics, photoGait } from "../src/lib/photo/rig.ts";

const rig = parsePhotoRig(JSON.parse(readFileSync("public/sprites/photo/female-rig.json", "utf8")));
const assets = new Map<string, BitmapImage>();
for (const file of photoAssetFiles(rig)) {
  const image = await loadImage(resolve("public/sprites/photo", file));
  assets.set(file, image as unknown as BitmapImage);
}
const body = photoBodyMetrics(rig);
console.log("photo body", {
  hip: body.hipStandHeight.toFixed(3),
  torso: body.torsoLength.toFixed(3),
  thigh: body.thighLength.toFixed(3),
  shin: body.shinLength.toFixed(3),
  arm: body.upperArmLength.toFixed(3),
  forearm: body.forearmLength.toFixed(3),
  shoulderAt: body.shoulderAt.toFixed(3),
});

const gait = resolveGait(DEFAULT_CONTROLS);
const CELL_WIDTH = 300;
const CELL_HEIGHT = 400;
const COLUMNS = 8;
const ROWS = 2;
const canvas = createCanvas(CELL_WIDTH * COLUMNS, CELL_HEIGHT * ROWS);
const context = canvas.getContext("2d");
context.fillStyle = "#121820";
context.fillRect(0, 0, canvas.width, canvas.height);

for (let index = 0; index < COLUMNS * ROWS; index += 1) {
  const phase = index / (COLUMNS * ROWS);
  const pose = solvePose(photoGait(gait, rig), phase, body);
  const draws = composePhotoRunner(pose, rig);
  const column = index % COLUMNS;
  const row = Math.floor(index / COLUMNS);
  const view: View = {
    scale: 300,
    originX: column * CELL_WIDTH + CELL_WIDTH * 0.5,
    groundY: row * CELL_HEIGHT + 330,
  };
  context.strokeStyle = "rgba(255,255,255,0.06)";
  context.strokeRect(column * CELL_WIDTH + 2, row * CELL_HEIGHT + 2, CELL_WIDTH - 4, CELL_HEIGHT - 4);
  context.fillStyle = "rgba(255,220,120,0.75)";
  context.font = "11px ui-monospace, monospace";
  context.fillText(`${phase.toFixed(3)}  ${pose.support}`, column * CELL_WIDTH + 8, row * CELL_HEIGHT + 16);
  const painted = paintPhotoRunner(context as never, draws, rig, { get: (file) => assets.get(file) }, view);
  if (painted !== draws.length) throw new Error(`painted ${painted} of ${draws.length} parts`);
  context.strokeStyle = "rgba(255,255,255,0.18)";
  context.beginPath();
  context.moveTo(column * CELL_WIDTH, view.groundY);
  context.lineTo((column + 1) * CELL_WIDTH, view.groundY);
  context.stroke();
}

mkdirSync(resolve("reports"), { recursive: true });
writeFileSync(resolve("reports/photo-filmstrip.png"), canvas.toBuffer("image/png"));
console.log("wrote reports/photo-filmstrip.png");
