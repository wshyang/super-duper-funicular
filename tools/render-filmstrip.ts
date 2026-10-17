/**
 * Renders a 16-phase filmstrip of the generated runner for the README.
 * Run with: npm run runner:filmstrip -- red
 */
import { createCanvas } from "@napi-rs/canvas";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_CONTROLS, resolveGait } from "../src/lib/gait/gait.ts";
import { solvePose } from "../src/lib/gait/pose.ts";
import { composeRunner } from "../src/lib/render/scene.ts";
import { paintScene, paintShadow, type View } from "../src/lib/render/paint.ts";
import { findPersona, lookFor } from "../src/lib/rig/persona.ts";

const persona = findPersona(process.argv[2] ?? "sg-chinese-male");
const look = lookFor(persona.id, process.argv[3] ?? persona.skin.defaultColorwayId);
const gait = resolveGait(DEFAULT_CONTROLS);
const CELL_WIDTH = 190;
const CELL_HEIGHT = 250;
const COLUMNS = 8;
const ROWS = 2;
const canvas = createCanvas(CELL_WIDTH * COLUMNS, CELL_HEIGHT * ROWS);
const context = canvas.getContext("2d");
context.fillStyle = "#121820";
context.fillRect(0, 0, canvas.width, canvas.height);

for (let index = 0; index < COLUMNS * ROWS; index += 1) {
  const pose = solvePose(gait, index / (COLUMNS * ROWS), look.body);
  const scene = composeRunner(pose, look);
  const column = index % COLUMNS;
  const row = Math.floor(index / COLUMNS);
  const view: View = {
    scale: CELL_WIDTH,
    originX: column * CELL_WIDTH + CELL_WIDTH / 2,
    groundY: row * CELL_HEIGHT + 210,
  };
  context.strokeStyle = "rgba(255,255,255,0.05)";
  context.strokeRect(column * CELL_WIDTH + 2, row * CELL_HEIGHT + 2, CELL_WIDTH - 4, CELL_HEIGHT - 4);
  paintShadow(context, pose, view);
  paintScene(context, scene, view);
  context.fillStyle = "rgba(247,201,72,0.7)";
  context.font = "11px ui-monospace, monospace";
  context.fillText(`${(index / (COLUMNS * ROWS)).toFixed(3)}  ${pose.support}`, column * CELL_WIDTH + 8, row * CELL_HEIGHT + 16);
}

mkdirSync(resolve("reports"), { recursive: true });
const destination = resolve(`reports/filmstrip-${persona.id}.png`);
writeFileSync(destination, canvas.toBuffer("image/png"));
console.log(`wrote ${destination}`);
