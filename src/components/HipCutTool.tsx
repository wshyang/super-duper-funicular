import { useEffect, useRef, useState } from "react";
import { defaultHipCut, type HipCut } from "../motion/photo/hip-cut";
import { downloadHipMask, downloadHipSettings } from "../motion/photo/hip-mask";
import { drawPhotoRunner } from "../motion/photo/render-photo";
import { getPose } from "../motion/gait";
import type { Workbench } from "../motion/useWorkbench";
const fields = [
  { key: "radiusX", label: "Hip width", min: 4, max: 10 },
  { key: "radiusY", label: "Cut depth", min: 2, max: 9 },
  { key: "offsetY", label: "Vertical offset", min: -3, max: 3 },
  { key: "feather", label: "Edge feather", min: 0, max: 1.5 },
] as const;
function drawGuide(context: CanvasRenderingContext2D, cut: HipCut) {
  context.strokeStyle = "#a1ffe2";
  context.lineWidth = 0.2;
  context.setLineDash([0.6, 0.4]);
  context.beginPath();
  context.ellipse(0, cut.offsetY, cut.radiusX, cut.radiusY, 0, 0, Math.PI);
  context.stroke();
  context.setLineDash([]);
  context.strokeStyle = "#ffdc85";
  context.beginPath();
  context.moveTo(-2, 0);
  context.lineTo(2, 0);
  context.moveTo(0, -2);
  context.lineTo(0, 2);
  context.stroke();
}
export function HipCutTool(workbench: Workbench) {
  const { hipCut, setHipCut, options } = workbench;
  const [comparison, setComparison] = useState<"original" | "rounded">(
    "rounded",
  );
  const [guides, setGuides] = useState(true);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    const pose = getPose(options.phase, options.gait);
    context.clearRect(0, 0, 600, 360);
    context.save();
    context.translate(300, 150);
    context.scale(9, 9);
    context.translate(-pose.hip.x, -pose.hip.y);
    drawPhotoRunner(context, pose, {
      hipCut,
      comparison,
      endCuts: options.endCuts,
    });
    if (guides) {
      context.translate(pose.hip.x, pose.hip.y);
      context.rotate(pose.torsoAngle * 0.3);
      drawGuide(context, hipCut);
    }
    context.restore();
  }, [options, hipCut, comparison, guides]);
  const isReady = options.photoStatus === "ready";
  function update(key: keyof HipCut, value: number) {
    setHipCut({ ...hipCut, [key]: value });
  }
  return (
    <section className="hip-tool" aria-label="Hip cut calibration">
      <div className="hip-tool-heading">
        <div>
          <b>Hip cut & layer tool</b>
          <small>Rounded pelvis socket · near thigh in front</small>
        </div>
        <button
          data-testid="hip-cut__reset"
          onClick={() => setHipCut(defaultHipCut)}
        >
          Reset cut
        </button>
      </div>
      <div className="hip-tool-grid">
        <div>
          <div className="hip-comparison">
            <button
              data-testid="hip-cut__original"
              aria-pressed={comparison === "original"}
              onClick={() => setComparison("original")}
            >
              Original overlap
            </button>
            <button
              data-testid="hip-cut__rounded"
              aria-pressed={comparison === "rounded"}
              onClick={() => setComparison("rounded")}
            >
              Rounded cut
            </button>
          </div>
          <canvas
            ref={canvas}
            width={600}
            height={360}
            data-testid="hip-cut__preview"
            aria-label="Magnified animated hip seam comparison"
          />
          <label className="hip-guides">
            <input
              type="checkbox"
              checked={guides}
              data-testid="hip-cut__guides"
              onChange={(event) => setGuides(event.target.checked)}
            />{" "}
            Show pivot & cut boundary
          </label>
        </div>
        <div className="hip-fields">
          {fields.map((field) => (
            <label key={field.key}>
              <span>
                {field.label}
                <b>{hipCut[field.key]} px</b>
              </span>
              <input
                data-testid={`hip-cut__${field.key}`}
                type="range"
                min={field.min}
                max={field.max}
                step="0.1"
                value={hipCut[field.key]}
                onChange={(event) =>
                  update(field.key, Number(event.target.value))
                }
              />
            </label>
          ))}
        </div>
      </div>
      <p>
        Back → front: far leg → rounded pelvis → near leg → torso. Use the cycle
        scrubber to inspect the seam. Comparison affects this close-up only;
        adjustments update the runner and sheet export.
      </p>
      <div className="hip-downloads">
        <button
          data-testid="hip-cut__png"
          disabled={!isReady}
          onClick={() => downloadHipMask(hipCut)}
        >
          Download cut pelvis PNG
        </button>
        <button
          data-testid="hip-cut__settings"
          onClick={() => downloadHipSettings(hipCut)}
        >
          Save settings JSON
        </button>
        <small>Session calibration · originals untouched</small>
      </div>
    </section>
  );
}
