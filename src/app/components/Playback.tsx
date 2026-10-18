import type { AnimationClock } from '../hooks/useAnimationClock.ts';

export interface PlaybackProps {
  readonly clock: AnimationClock;
  readonly phase: number;
  readonly onSeek: (phase: number) => void;
}

const SPEEDS = [0.25, 0.5, 1, 2] as const;

const SpeedSelect = ({ clock }: { clock: AnimationClock }): React.JSX.Element => {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    clock.setSpeed(Number.parseFloat(event.target.value));
  };
  return (
    <label className="speed">
      Speed
      <select value={clock.speed} onChange={handleChange} data-testid="playback__speed">
        {SPEEDS.map((value) => (
          <option key={value} value={value}>
            {value}×
          </option>
        ))}
      </select>
    </label>
  );
};

const TransportRow = ({
  clock,
  phase,
}: {
  clock: AnimationClock;
  phase: number;
}): React.JSX.Element => {
  const degrees = (phase * 360).toFixed(0);
  const phaseLabel = phase.toFixed(3);
  return (
    <div className="playback-row">
      <button
        type="button"
        className="primary-button"
        onClick={clock.toggle}
        data-testid="playback__play-toggle"
        aria-pressed={clock.isPlaying}
      >
        {clock.isPlaying ? 'Pause' : 'Play'}
      </button>
      <button
        type="button"
        className="ghost-button"
        onClick={() => clock.step(-1)}
        data-testid="playback__step-back"
      >
        − ⅛
      </button>
      <button
        type="button"
        className="ghost-button"
        onClick={() => clock.step(1)}
        data-testid="playback__step-forward"
      >
        + ⅛
      </button>
      <SpeedSelect clock={clock} />
      <span className="playback__readout" data-testid="playback__readout">
        φ {phaseLabel} · {degrees}°
      </span>
    </div>
  );
};

const PHASE_BUTTONS = Array.from({ length: 8 }, (_, index) => ({
  index,
  phase: index / 8,
  caption: String(index + 1).padStart(2, '0'),
}));

const PhaseButtons = ({ onSeek }: { onSeek: (phase: number) => void }): React.JSX.Element => (
  <div className="phase-buttons">
    {PHASE_BUTTONS.map((item) => (
      <button
        key={item.index}
        type="button"
        className="phase-button"
        onClick={() => onSeek(item.phase)}
        data-testid={`playback__phase-${item.caption}`}
      >
        {item.caption}
      </button>
    ))}
  </div>
);

export const PlaybackBar = ({ clock, phase, onSeek }: PlaybackProps): React.JSX.Element => {
  const handleScrub = (event: React.ChangeEvent<HTMLInputElement>): void => {
    onSeek(Number.parseFloat(event.target.value));
  };
  return (
    <section className="panel panel--playback" aria-label="Playback">
      <TransportRow clock={clock} phase={phase} />
      <input
        className="scrubber"
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={phase}
        onChange={handleScrub}
        data-testid="playback__scrubber"
        aria-label="Gait phase"
      />
      <PhaseButtons onSeek={onSeek} />
    </section>
  );
};
