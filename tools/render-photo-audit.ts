/** Multi-background audit through the app's solver, composition and canvas painter. */
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { auditCells, AUDIT_HEIGHT, AUDIT_WIDTH } from "../src/lib/analysis/audit-layout.ts";
import { DEFAULT_CONTROLS, resolveGait } from "../src/lib/gait/gait.ts";
import { solvePose } from "../src/lib/gait/pose.ts";
import { paintPhotoRunner, type BitmapImage } from "../src/lib/render/photo-paint.ts";
import { paintSkeleton } from "../src/lib/render/paint.ts";
import { composePhotoRunner, photoAssetFiles } from "../src/lib/photo/scene.ts";
import { parsePhotoRig, photoBodyMetrics, photoGait } from "../src/lib/photo/rig.ts";

const rig = parsePhotoRig(JSON.parse(readFileSync("public/sprites/photo/female-rig.json", "utf8")));
const assets = new Map<string, BitmapImage>();
for (const file of photoAssetFiles(rig)) {
  assets.set(file, await loadImage(resolve("public/sprites/photo", file)) as unknown as BitmapImage);
}
const canvas = createCanvas(AUDIT_WIDTH, AUDIT_HEIGHT);
const context = canvas.getContext("2d");
const gait = photoGait(resolveGait(DEFAULT_CONTROLS), rig);
const body = photoBodyMetrics(rig);
for (const cell of auditCells()) {
  // Isolated panels prevent a large limb excursion bleeding into another phase.
  const panel = createCanvas(cell.width, cell.height);
  const ctx = panel.getContext("2d");
  ctx.fillStyle = cell.panel === "light" ? "#e8edf2" : "#17232f";
  ctx.fillRect(0, 0, cell.width, cell.height);
  const pose = solvePose(gait, cell.phase, body);
  const draws = composePhotoRunner(pose, rig);
  const view = { scale: 250, originX: cell.width / 2, groundY: 310 };
  const painted = paintPhotoRunner(ctx as never, draws, rig, { get: (file) => assets.get(file) }, view);
  if (painted !== draws.length) throw new Error(`Incomplete phase ${cell.phase}`);
  if (cell.panel === "joints") paintSkeleton(ctx as never, pose, view);
  ctx.fillStyle = "#cbd5e1";
  ctx.fillRect(0, 330, cell.width, 30);
  ctx.fillStyle = "#17232f";
  ctx.font = "12px monospace";
  ctx.fillText(`${cell.phase.toFixed(4)} ${pose.support} ${cell.panel}`, 6, 349);
  context.drawImage(panel, cell.x, cell.y);
}
mkdirSync("reports", { recursive: true });
writeFileSync("reports/photo-audit.png", canvas.toBuffer("image/png"));
console.log("wrote reports/photo-audit.png (16 phases, light/dark/joints; default female run)");
