/**
 * Renders the stance half-cycle large enough to read the foot roll: the sole
 * gap under the heel, the ball and the toe is printed under each frame, so the
 * roll (heel → flat → heel peel → toe push) can be checked without guessing.
 *
 * Run with: npm run runner:footroll
 */
import { createCanvas } from "@napi-rs/canvas";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_CONTROLS, resolveGait } from "../src/lib/gait/gait.ts";
import { solvePose } from "../src/lib/gait/pose.ts";
import { composeRunner } from "../src/lib/render/scene.ts";
import { paintScene, type View } from "../src/lib/render/paint.ts";
import { findPersona, lookFor } from "../src/lib/rig/persona.ts";

const persona = findPersona(process.argv[2] ?? "sg-chinese-male");
const look = lookFor(persona.id, persona.skin.defaultColorwayId);
const gait = resolveGait(DEFAULT_CONTROLS);
const phases = [0, 0.06, 0.12, 0.18, 0.24, 0.3, 0.34, 0.4];
const CELL_WIDTH = 300;
const CELL_HEIGHT = 420;
const COLUMNS = 4;
const canvas = createCanvas(CELL_WIDTH * COLUMNS, CELL_HEIGHT * 2);
const context = canvas.getContext("2d");

context.fillStyle = "#10161e";
context.fillRect(0, 0, canvas.width, canvas.height);
phases.forEach((phase, index) => {
  const pose = solvePose(gait, phase, look.body);
  const column = index % COLUMNS;
  const row = Math.floor(index / COLUMNS);
  const view: View = { scale: 420, originX: column * CELL_WIDTH + CELL_WIDTH / 2, groundY: row * CELL_HEIGHT + 350 };
  context.strokeStyle = "rgba(255, 220, 80, 0.55)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(column * CELL_WIDTH, view.groundY);
  context.lineTo((column + 1) * CELL_WIDTH, view.groundY);
  context.stroke();
  paintScene(context, composeRunner(pose, look), view);
  const leg = pose.near.leg;
  context.fillStyle = "#f2c14e";
  context.font = "12px ui-monospace, monospace";
  context.fillText(`p=${phase.toFixed(2)}  ${leg.isStance ? "STANCE" : "swing"}`, column * CELL_WIDTH + 10, row * CELL_HEIGHT + 20);
  context.fillText(
    `heel ${leg.foot.heel.y.toFixed(3)}  ball ${leg.foot.ball.y.toFixed(3)}  toe ${leg.foot.toe.y.toFixed(3)}`,
    column * CELL_WIDTH + 10,
    row * CELL_HEIGHT + 36,
  );
});

mkdirSync(resolve("reports"), { recursive: true });
const destination = resolve(`reports/foot-roll-${persona.id}.png`);
writeFileSync(destination, canvas.toBuffer("image/png"));
console.log(`wrote ${destination}`);
console.log(`stance duty ${gait.dutyFactor} · ball is the pivot while the heel peels`);
