/**
 * Renders a development contact sheet of the generated runner at eight phases.
 * This uses the real canvas painter, not a mock, so the preview is exactly what
 * the browser draws. Run with: npm run runner:preview -- red
 */
import { createCanvas } from "@napi-rs/canvas";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_CONTROLS, resolveGait } from "../src/lib/gait/gait.ts";
import { solvePose } from "../src/lib/gait/pose.ts";
import { composeRunner } from "../src/lib/render/scene.ts";
import { paintScene, paintShadow, paintSkeleton, type View } from "../src/lib/render/paint.ts";
import { COLORWAYS } from "../src/lib/rig/palette.ts";
import { findPersona, lookFor, PERSONAS } from "../src/lib/rig/persona.ts";

const persona = findPersona(process.argv[2] ?? "sg-chinese-male");
const colorwayId = process.argv[3] ?? persona.skin.defaultColorwayId;
const look = lookFor(persona.id, colorwayId);
const gait = resolveGait(DEFAULT_CONTROLS);
const spriteHeight = 300;
const columns = 4;
const rows = 2;
const cellWidth = 340;
const cellHeight = 400;
const canvas = createCanvas(cellWidth * columns, cellHeight * rows + 60);
const context = canvas.getContext("2d");

context.fillStyle = "#151a22";
context.fillRect(0, 0, canvas.width, canvas.height);
context.fillStyle = "#e9e3d6";
context.font = "600 20px sans-serif";
context.fillText(`Generated run cycle — ${persona.label} — ${colorwayId} — 8 phases`, 24, 30);

for (let index = 0; index < 8; index += 1) {
  const phase = index / 8;
  const pose = solvePose(gait, phase, look.body);
  const scene = composeRunner(pose, look);
  const column = index % columns;
  const row = Math.floor(index / columns);
  const view: View = {
    scale: spriteHeight,
    originX: column * cellWidth + cellWidth / 2,
    groundY: row * cellHeight + 330,
  };
  context.save();
  context.strokeStyle = "rgba(255,255,255,0.08)";
  context.lineWidth = 1;
  context.strokeRect(column * cellWidth + 6, row * cellHeight + 48, cellWidth - 12, cellHeight - 24);
  paintShadow(context, pose, view);
  paintScene(context, scene, view);
  if (index % 2 === 1) paintSkeleton(context, pose, view);
  context.fillStyle = "#f2c14e";
  context.font = "600 15px monospace";
  context.fillText(`f${index + 1}  p=${phase.toFixed(3)}  ${pose.support}`, column * cellWidth + 16, row * cellHeight + 72);
  context.restore();
}

const outputDirectory = resolve("reports");
mkdirSync(outputDirectory, { recursive: true });
const destination = resolve(outputDirectory, `runner-preview-${persona.id}.png`);
writeFileSync(destination, canvas.toBuffer("image/png"));
console.log(`wrote ${destination}`);
console.log(`colorways: ${COLORWAYS.map((entry) => entry.id).join(", ")}`);
console.log(`personas: ${PERSONAS.map((entry) => entry.id).join(", ")}`);
