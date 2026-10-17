import { Film } from "lucide-react";
import { getPhaseLabel } from "../motion/gait";
import { PoseThumbnail } from "./Stage";
import type { Workbench } from "../motion/useWorkbench";
export function CycleStrip({ options, activeFrame, playback }: Workbench) {
  const motion = options.gait.motion ?? "run";
  const title =
    motion === "run"
      ? "Anatomy of a run"
      : motion === "walk"
        ? "Anatomy of a walk"
        : "Anatomy of a brisk walk";
  const phases = Array.from({ length: 8 }, (_, index) => ({
    index,
    phase: index / 8,
    label: getPhaseLabel(index / 8, motion),
  }));
  return (
    <section className="cycle-panel panel">
      <div className="panel-heading">
        <span>
          <Film size={16} /> {title}{" "}
          <span className="subtle">One full cycle, eight moments.</span>
        </span>
        <span className="cycle-meta">
          LEFT + RIGHT <span>·</span> 360°
        </span>
      </div>
      <div className="frame-strip">
        {phases.map((frame) => (
          <button
            key={frame.index}
            data-testid="cycle__frame"
            className={activeFrame === frame.index ? "frame active" : "frame"}
            onClick={() => playback.seek(frame.phase)}
          >
            <div className="frame-top">
              <span>0{frame.index + 1}</span>
              {activeFrame === frame.index && <i />}
            </div>
            <PoseThumbnail {...options} phase={frame.phase} />
            <span className="frame-name">{frame.label}</span>
            <span className="frame-phase">{frame.index * 45}°</span>
          </button>
        ))}
      </div>
    </section>
  );
}
