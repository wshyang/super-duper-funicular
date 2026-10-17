import { getPhotoImage, photoParts } from "./assets";
import { getRoundedLimb } from "./end-mask";
import { getLimbGeometry, type RoundablePart, type EndCuts } from "./end-cuts";
import { getPartTransform } from "./transform";
import { getLimbPlacement } from "./limb-placement";
import { drawPhotoRunner, type PhotoRenderSettings } from "./render-photo";
import type { Pose } from "../gait";
export interface EndInspector {
  part: RoundablePart;
  end: "start" | "end";
  cuts: EndCuts;
  pose: Pose;
  angle: number;
  view: "isolated" | "assembled";
  comparison: "base" | "rounded";
  guides: boolean;
  hipCut: PhotoRenderSettings["hipCut"];
}
export function drawEndInspector(
  context: CanvasRenderingContext2D,
  options: EndInspector,
) {
  const geometry = getLimbGeometry(options.part),
    cut = options.cuts[options.part];
  context.clearRect(0, 0, 600, 400);
  context.save();
  context.translate(300, 200);
  context.scale(10, 10);
  if (options.view === "assembled") {
    const placement = getLimbPlacement(options.part, options.pose),
      pivot = placement[options.end];
    context.translate(-pivot.x, -pivot.y);
    drawPhotoRunner(context, options.pose, {
      hipCut: options.hipCut,
      endCuts: options.cuts,
      uncappedPart: options.comparison === "base" ? options.part : undefined,
    });
    context.translate(pivot.x, pivot.y);
  } else {
    // The socket is deliberately drawn first: the textured cap rotates on top.
    context.fillStyle = "#bed0c5";
    context.beginPath();
    context.arc(0, 0, cut[options.end].radius + 0.8, 0, Math.PI * 2);
    context.fill();
    context.rotate((options.angle * Math.PI) / 180);
    context.save();
    context.translate(0, options.end === "end" ? -geometry.length : 0);
    const image =
      options.comparison === "base"
        ? getPhotoImage(options.part)
        : getRoundedLimb(options.part, cut);
    const matrix = getPartTransform({
      part: photoParts[options.part],
      target: { start: { x: 0, y: 0 }, end: { x: 0, y: geometry.length } },
      width: geometry.width,
    });
    if (image) {
      context.transform(...matrix);
      context.drawImage(image, 0, 0);
    }
    context.restore();
  }
  if (options.guides) drawPivotGuide(context, cut[options.end].radius);
  context.restore();
}
function drawPivotGuide(context: CanvasRenderingContext2D, radius: number) {
  context.strokeStyle = "#81ffd4";
  context.lineWidth = 0.15;
  context.setLineDash([0.5, 0.3]);
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);
  context.strokeStyle = "#ffcc6e";
  context.beginPath();
  context.moveTo(-1.5, 0);
  context.lineTo(1.5, 0);
  context.moveTo(0, -1.5);
  context.lineTo(0, 1.5);
  context.stroke();
}
