import { useEffect, useRef, useState } from "react";
import {
  defaultEndCuts,
  roundableParts,
  type RoundablePart,
} from "../motion/photo/end-cuts";
import { downloadRoundedLimb, downloadEndCuts } from "../motion/photo/end-mask";
import { drawEndInspector } from "../motion/photo/draw-end-inspector";
import { getPose } from "../motion/gait";
import type { Workbench } from "../motion/useWorkbench";
export function EndCutTool(workbench: Workbench) {
  const { endCuts, setEndCuts, options } = workbench;
  const [part, setPart] = useState<RoundablePart>("near-thigh");
  const [end, setEnd] = useState<"start" | "end">("start");
  const [comparison, setComparison] = useState<"base" | "rounded">("rounded");
  const [view, setView] = useState<"isolated" | "assembled">("isolated");
  const [angle, setAngle] = useState(45),
    [guides, setGuides] = useState(true);
  const canvas = useRef<HTMLCanvasElement>(null),
    cut = endCuts[part],
    cap = cut[end];
  const isReady = options.photoStatus === "ready";
  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    drawEndInspector(context, {
      part,
      end,
      cuts: endCuts,
      pose: getPose(options.phase, options.gait),
      angle,
      view,
      comparison,
      guides,
      hipCut: options.hipCut,
    });
  }, [part, end, endCuts, options, angle, view, comparison, guides]);
  function updateCap(
    key: "radius" | "blend" | "enabled",
    value: number | boolean,
  ) {
    setEndCuts({
      ...endCuts,
      [part]: { ...cut, [end]: { ...cap, [key]: value } },
    });
  }
  function updateFeather(value: number) {
    setEndCuts({ ...endCuts, [part]: { ...cut, feather: value } });
  }
  function resetPart() {
    setEndCuts({ ...endCuts, [part]: defaultEndCuts[part] });
  }
  return (
    <section
      className="hip-tool end-tool"
      aria-label="Articulated element end cutter"
    >
      <div className="hip-tool-heading">
        <div>
          <b>Element end cutter</b>
          <small>Round the rotating piece—not just the socket behind it</small>
        </div>
        <button data-testid="end-cut__reset" onClick={resetPart}>
          Reset this element
        </button>
      </div>
      <div className="end-selectors">
        <label>
          Element
          <select
            data-testid="end-cut__part"
            value={part}
            onChange={(event) => setPart(event.target.value as RoundablePart)}
          >
            {roundableParts.map((name) => (
              <option key={name} value={name}>
                {name.replaceAll("-", " ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          Pivot end
          <select
            data-testid="end-cut__end"
            value={end}
            onChange={(event) => setEnd(event.target.value as "start" | "end")}
          >
            <option value="start">Start / proximal</option>
            <option value="end">End / distal</option>
          </select>
        </label>
      </div>
      <div className="hip-tool-grid">
        <div>
          <div className="hip-comparison">
            <button
              data-testid="end-cut__base"
              aria-pressed={comparison === "base"}
              onClick={() => setComparison("base")}
            >
              Base cutout
            </button>
            <button
              data-testid="end-cut__rounded"
              aria-pressed={comparison === "rounded"}
              onClick={() => setComparison("rounded")}
            >
              Rounded ends
            </button>
          </div>
          <canvas
            ref={canvas}
            width={600}
            height={400}
            data-testid="end-cut__preview"
            aria-label="Element rotating about its joint pivot"
          />
          <div className="hip-comparison">
            <button
              data-testid="end-cut__isolated"
              aria-pressed={view === "isolated"}
              onClick={() => setView("isolated")}
            >
              Rotation test
            </button>
            <button
              data-testid="end-cut__assembled"
              aria-pressed={view === "assembled"}
              onClick={() => setView("assembled")}
            >
              Assembled joint
            </button>
          </div>
          <label className="hip-guides">
            <input
              type="checkbox"
              checked={guides}
              data-testid="end-cut__guides"
              onChange={(event) => setGuides(event.target.checked)}
            />{" "}
            Show cap radius & pivot
          </label>
        </div>
        <div className="hip-fields">
          <label className="hip-guides">
            <input
              data-testid="end-cut__enabled"
              type="checkbox"
              checked={cap.enabled}
              onChange={(event) => updateCap("enabled", event.target.checked)}
            />{" "}
            Round this end
          </label>
          <label>
            <span>
              Cap radius<b>{cap.radius} px</b>
            </span>
            <input
              data-testid="end-cut__radius"
              type="range"
              min="1"
              max="9"
              step="0.1"
              value={cap.radius}
              onChange={(event) =>
                updateCap("radius", Number(event.target.value))
              }
            />
          </label>
          <label>
            <span>
              Blend into shaft<b>{cap.blend} px</b>
            </span>
            <input
              data-testid="end-cut__blend"
              type="range"
              min="0"
              max="8"
              step="0.1"
              value={cap.blend}
              onChange={(event) =>
                updateCap("blend", Number(event.target.value))
              }
            />
          </label>
          <label>
            <span>
              Edge feather<b>{cut.feather} px</b>
            </span>
            <input
              data-testid="end-cut__feather"
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={cut.feather}
              onChange={(event) => updateFeather(Number(event.target.value))}
            />
          </label>
          <label>
            <span>
              Test rotation<b>{angle}°</b>
            </span>
            <input
              data-testid="end-cut__angle"
              type="range"
              min="-180"
              max="180"
              step="1"
              value={angle}
              disabled={view === "assembled"}
              onChange={(event) => setAngle(Number(event.target.value))}
            />
          </label>
        </div>
      </div>
      <p>
        Caps are centred on the original bone pivots. Rotation test draws the
        element over a stationary socket; assembled view follows the cycle
        scrubber. Cuts update the live character, thumbnails and sheet export.
        This removes pixels only—larger radii cannot restore missing source
        texture. Shoe heel/toe anchors are not joint pivots, so shoes are
        excluded.
      </p>
      <div className="hip-downloads">
        <button
          data-testid="end-cut__png"
          disabled={!isReady}
          onClick={() => downloadRoundedLimb(part, cut)}
        >
          Download rounded element PNG
        </button>
        <button
          data-testid="end-cut__settings"
          onClick={() => downloadEndCuts(endCuts)}
        >
          Save all end cuts JSON
        </button>
        <small>Session calibration · start/end independently adjustable</small>
      </div>
    </section>
  );
}
