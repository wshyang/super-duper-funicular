import { auditSamples } from "./audit-layout";
import { drawRunner, type RenderOptions } from "./render";
import { hasPhotoAssets } from "./photo/assets";
import { personas } from "./personas";
import { motions } from "./motions";
import { getPose } from "./gait";

type Context = CanvasRenderingContext2D;
function paintPanel(context: Context, options: RenderOptions, panel: number) {
  context.save();
  context.translate(panel * 160, 0);
  context.fillStyle = panel === 1 ? "#181c26" : "#e2e6ee";
  context.fillRect(0, 0, 160, 180);
  context.strokeStyle = "#8995a5";
  context.beginPath();
  context.moveTo(8, 153);
  context.lineTo(152, 153);
  context.stroke();
  context.fillStyle = panel === 1 ? "#ffffff" : "#202633";
  context.font = "9px sans-serif";
  context.fillText(["Light", "Dark", "Joint overlay"][panel], 8, 12);
  context.translate(75, 153);
  drawRunner(context, { ...options, skeleton: panel === 2 });
  context.restore();
}
function paintSample(context: Context, options: RenderOptions) {
  for (let panel = 0; panel < 3; panel++) paintPanel(context, options, panel);
  const pose = getPose(options.phase, options.gait);
  const support = Number(pose.near.isContact) + Number(pose.far.isContact);
  context.fillStyle = "#e2e6ee";
  context.fillRect(0, 160, 480, 20);
  context.fillStyle = "#202633";
  context.font = "9px sans-serif";
  const motion = motions[options.gait.motion ?? "run"].name;
  context.fillText(
    `${motion} · phase ${options.phase.toFixed(4)} · support ${support}/2`,
    8,
    173,
  );
}
/** Uses the same assets, gait and masks as live rendering; no playback mutation. */
export function createCycleAudit(options: RenderOptions) {
  if (personas[options.persona].renderStyle === "photo" && !hasPhotoAssets())
    return null;
  const canvas = document.createElement("canvas");
  canvas.width = 3840;
  canvas.height = 1440;
  const context = canvas.getContext("2d")!;
  context.scale(2, 2);
  for (const sample of auditSamples) {
    context.save();
    context.translate(sample.x, sample.y);
    paintSample(context, { ...options, phase: sample.phase });
    context.restore();
  }
  return canvas;
}
export function downloadCycleAudit(options: RenderOptions) {
  const canvas = createCycleAudit(options);
  if (!canvas) return;
  const anchor = document.createElement("a");
  anchor.download = `stride-lab-${options.persona}-${options.gait.motion ?? "run"}-audit-16.png`;
  anchor.href = canvas.toDataURL("image/png");
  anchor.click();
}
