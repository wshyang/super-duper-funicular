import { DEFAULT_SPEED, MAX_SPEED, MIN_SPEED } from "../stage-model.ts";

export interface RunnerControlsProps {
  readonly playing: boolean;
  readonly speed: number;
  readonly showSkeleton: boolean;
  readonly phasePercent: string;
  readonly onTogglePlaying: () => void;
  readonly onSpeedChange: (speed: number) => void;
  readonly onToggleSkeleton: () => void;
  readonly onPhaseChange: (phase: number) => void;
  readonly phase: number;
}

export function RunnerControls(props: RunnerControlsProps) {
  return (
    <div className="runner-controls">
      <button type="button" data-testid="runner-controls__play-toggle" onClick={props.onTogglePlaying}>
        {props.playing ? "Pause" : "Play"}
      </button>
      <label>
        Speed {props.speed.toFixed(2)}
        <input
          type="range"
          data-testid="runner-controls__speed-slider"
          min={MIN_SPEED}
          max={MAX_SPEED}
          step={0.05}
          value={props.speed}
          onChange={(event) => props.onSpeedChange(Number(event.target.value))}
        />
      </label>
      <label>
        <input
          type="checkbox"
          data-testid="runner-controls__skeleton-toggle"
          checked={props.showSkeleton}
          onChange={props.onToggleSkeleton}
        />
        Show skeleton
      </label>
      <label>
        Phase {props.phasePercent}
        <input
          type="range"
          data-testid="runner-controls__phase-scrubber"
          min={0}
          max={1}
          step={0.001}
          value={props.phase}
          onChange={(event) => props.onPhaseChange(Number(event.target.value))}
        />
      </label>
      <span className="runner-controls__default-note">Default speed {DEFAULT_SPEED}</span>
    </div>
  );
}
