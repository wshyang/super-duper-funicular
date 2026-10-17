import type { GaitSettings, MotionId, PaletteId, PersonaId } from '../../shared/types.ts';
import { MOTIONS, PALETTES, PERSONAS } from '../../shared/constants.ts';
import type { AnimationClock } from '../hooks/useAnimationClock.ts';
import type { OverlayKey, Overlays } from '../hooks/useWorkspace.ts';

const formatCadence = (value: number): string => `${value.toFixed(2)} cyc/s`;
const formatPercent = (value: number): string => `${(value * 100).toFixed(0)}%`;

export interface ControlsProps {
  readonly settings: GaitSettings;
  readonly onChange: (patch: Partial<GaitSettings>) => void;
  readonly onReset: () => void;
}

interface SliderProps {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly testId: string;
  readonly format: (value: number) => string;
  readonly onChange: (value: number) => void;
}

const Slider = (props: SliderProps): React.JSX.Element => {
  const formatted = props.format(props.value);
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    props.onChange(Number.parseFloat(event.target.value));
  };
  return (
    <label className="slider">
      <span className="slider__label">
        {props.label}
        <output className="slider__value">{formatted}</output>
      </span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        data-testid={props.testId}
        onChange={handleChange}
      />
    </label>
  );
};

const PersonaGrid = ({ settings, onChange }: ControlsProps): React.JSX.Element => (
  <div className="persona-grid">
    {PERSONAS.map((persona) => {
      const active = settings.persona === persona.id;
      return (
        <button
          key={persona.id}
          type="button"
          className={active ? 'persona persona--active' : 'persona'}
          onClick={() => onChange({ persona: persona.id as PersonaId })}
          data-testid={`persona__option-${persona.id}`}
          aria-pressed={active}
        >
          <span className="persona__swatch" style={{ background: persona.skin }} />
          <span className="persona__name">{persona.name}</span>
          <span className="persona__meta">
            {persona.ponytail ? 'Female · ponytail' : 'Male · crop'}
          </span>
        </button>
      );
    })}
  </div>
);

const MotionChoices = ({ settings, onChange }: ControlsProps): React.JSX.Element => (
  <div className="segmented" role="group" aria-label="Motion profile">
    {MOTIONS.map((motion) => {
      const active = settings.motion === motion.id;
      return (
        <button
          key={motion.id}
          type="button"
          className={active ? 'segmented__option segmented__option--active' : 'segmented__option'}
          onClick={() => onChange({ motion: motion.id as MotionId })}
          data-testid={`motion__option-${motion.id}`}
          aria-pressed={active}
          title={motion.description}
        >
          {motion.label}
        </button>
      );
    })}
  </div>
);

const PaletteChoices = ({ settings, onChange }: ControlsProps): React.JSX.Element => (
  <div className="palette-grid" role="group" aria-label="Colourway">
    {PALETTES.map((palette) => {
      const active = settings.palette === palette.id;
      return (
        <button
          key={palette.id}
          type="button"
          className={active ? 'palette palette--active' : 'palette'}
          onClick={() => onChange({ palette: palette.id as PaletteId })}
          data-testid={`palette__option-${palette.id}`}
          aria-pressed={active}
          title={palette.label}
        >
          <span className="palette__chip" style={{ background: palette.primary }} />
          <span>{palette.label}</span>
        </button>
      );
    })}
  </div>
);

export const CharacterPanel = (props: ControlsProps): React.JSX.Element => (
  <section className="panel" aria-label="Character and motion">
    <div className="panel-head">
      <h2 className="panel-title">Character</h2>
      <button
        type="button"
        className="ghost-button"
        onClick={props.onReset}
        data-testid="controls__reset"
      >
        Reset
      </button>
    </div>
    <PersonaGrid {...props} />
    <h3 className="control-label">Motion</h3>
    <MotionChoices {...props} />
    <h3 className="control-label">Colourway</h3>
    <PaletteChoices {...props} />
  </section>
);

export interface GaitControlsProps {
  readonly settings: GaitSettings;
  readonly onChange: (patch: Partial<GaitSettings>) => void;
}

export const GaitControls = ({ settings, onChange }: GaitControlsProps): React.JSX.Element => (
  <section className="panel" aria-label="Gait tuning">
    <h2 className="panel-title">Gait tuning</h2>
    <Slider
      label="Cadence"
      value={settings.cadence}
      min={0.4}
      max={1.4}
      step={0.01}
      testId="gait__cadence"
      format={formatCadence}
      onChange={(cadence) => onChange({ cadence })}
    />
    <Slider
      label="Stride"
      value={settings.stride}
      min={0.7}
      max={1.2}
      step={0.01}
      testId="gait__stride"
      format={formatPercent}
      onChange={(stride) => onChange({ stride })}
    />
    <Slider
      label="Foot lift"
      value={settings.footLift}
      min={0.5}
      max={1.5}
      step={0.01}
      testId="gait__foot-lift"
      format={formatPercent}
      onChange={(footLift) => onChange({ footLift })}
    />
    <Slider
      label="Forward lean"
      value={settings.lean}
      min={0.5}
      max={1.5}
      step={0.01}
      testId="gait__lean"
      format={formatPercent}
      onChange={(lean) => onChange({ lean })}
    />
  </section>
);

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

export interface OverlayProps {
  readonly overlays: Overlays;
  readonly onToggle: (key: OverlayKey) => void;
  readonly busy: boolean;
  readonly onExportSprite: () => void;
  readonly onExportAudit: () => void;
}

const OVERLAY_ITEMS: readonly { key: OverlayKey; label: string; testId: string }[] = [
  { key: 'skeleton', label: 'Skeleton', testId: 'overlay__skeleton' },
  { key: 'ground', label: 'Ground line', testId: 'overlay__ground' },
  { key: 'onion', label: 'Onion skin', testId: 'overlay__onion' },
  { key: 'compare', label: 'Compare source', testId: 'overlay__compare' },
];

const OverlayToggle = ({
  overlays,
  onToggle,
  item,
}: {
  overlays: Overlays;
  onToggle: (key: OverlayKey) => void;
  item: { key: OverlayKey; label: string; testId: string };
}): React.JSX.Element => {
  const handleChange = (): void => onToggle(item.key);
  return (
    <label className="toggle">
      <input
        type="checkbox"
        checked={overlays[item.key]}
        onChange={handleChange}
        data-testid={item.testId}
      />
      {item.label}
    </label>
  );
};

export const OverlayBar = ({
  overlays,
  onToggle,
  busy,
  onExportSprite,
  onExportAudit,
}: OverlayProps): React.JSX.Element => (
  <section className="panel" aria-label="Overlays and export">
    <h2 className="panel-title">Overlays</h2>
    <p className="panel-hint">
      Overlays are drawn on the procedural canvas only; the reference frame stays untouched.
    </p>
    <div className="toggle-grid">
      {OVERLAY_ITEMS.map((item) => (
        <OverlayToggle key={item.key} overlays={overlays} onToggle={onToggle} item={item} />
      ))}
    </div>
    <div className="export-row">
      <button
        type="button"
        className="secondary-button"
        onClick={onExportSprite}
        disabled={busy}
        data-testid="export__sprite-sheet"
      >
        {busy ? 'Rendering…' : 'Export 8-frame sheet'}
      </button>
      <button
        type="button"
        className="secondary-button"
        onClick={onExportAudit}
        disabled={busy}
        data-testid="export__audit-sheet"
      >
        Export 16-phase audit
      </button>
    </div>
  </section>
);
