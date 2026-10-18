import type {
  GaitSettings,
  JointStyle,
  MotionId,
  PaletteId,
  PersonaId,
} from '../../shared/types.ts';
import { JOINT_STYLES, MOTIONS, PALETTES, PERSONAS } from '../../shared/constants.ts';
import type { OverlayKey, Overlays } from '../hooks/useWorkspace.ts';
import { Slider } from './Slider.tsx';

const formatCadence = (value: number): string => `${value.toFixed(2)} cyc/s`;
const formatPercent = (value: number): string => `${(value * 100).toFixed(0)}%`;

export interface ControlsProps {
  readonly settings: GaitSettings;
  readonly onChange: (patch: Partial<GaitSettings>) => void;
  readonly onReset: () => void;
}

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

const JointChoices = ({ settings, onChange }: ControlsProps): React.JSX.Element => (
  <div className="segmented" role="group" aria-label="Joint style">
    {JOINT_STYLES.map((style) => {
      const active = settings.jointStyle === style.id;
      return (
        <button
          key={style.id}
          type="button"
          className={active ? 'segmented__option segmented__option--active' : 'segmented__option'}
          onClick={() => onChange({ jointStyle: style.id as JointStyle })}
          data-testid={`joints__option-${style.id}`}
          aria-pressed={active}
          title={style.description}
        >
          {style.label}
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
    <h3 className="control-label">Joints</h3>
    <JointChoices {...props} />
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
