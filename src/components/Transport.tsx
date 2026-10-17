import { Pause, Play, SkipForward } from "lucide-react";
import type { Workbench } from "../motion/useWorkbench";
export function Transport({ playback, activeFrame }: Workbench) {
  return (
    <div className="transport">
      <button
        className="play-button"
        data-testid="playback__toggle"
        aria-label={playback.isPlaying ? "Pause animation" : "Play animation"}
        onClick={playback.toggle}
      >
        {playback.isPlaying ? (
          <Pause size={17} fill="currentColor" />
        ) : (
          <Play size={17} fill="currentColor" />
        )}
      </button>
      <button
        className="icon-button"
        data-testid="playback__step"
        aria-label="Next frame"
        onClick={playback.step}
      >
        <SkipForward size={18} />
      </button>
      <span className="transport-divider" />
      <span className="phase-label">
        CYCLE <b>{String(activeFrame + 1).padStart(2, "0")}</b>
        <small>/ 08</small>
      </span>
      <input
        aria-label="Cycle phase"
        data-testid="playback__phase"
        type="range"
        min="0"
        max="999"
        value={Math.floor(playback.phase * 1000)}
        onChange={(event) => playback.seek(Number(event.target.value) / 1000)}
      />
      <label className="speed-label">
        <select
          aria-label="Playback speed"
          data-testid="playback__speed"
          value={playback.speed}
          onChange={(event) => playback.setSpeed(Number(event.target.value))}
        >
          <option value="0.25">0.25×</option>
          <option value="0.5">0.5×</option>
          <option value="1">1× speed</option>
          <option value="1.5">1.5×</option>
        </select>
      </label>
      <span className="loop-label">↻ LOOP</span>
    </div>
  );
}
