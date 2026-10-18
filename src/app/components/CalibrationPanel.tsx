import type { Calibration } from '../../shared/types.ts';
import { CALIBRATION_LIMIT, CALIBRATION_STEP } from '../../shared/calibration.ts';
import type {
  CalibrationAxis,
  CalibrationJoint,
  CalibrationState,
} from '../hooks/useCalibration.ts';

export interface CalibrationPanelProps {
  readonly state: CalibrationState;
  readonly busy: boolean;
  readonly onExportJson: () => void;
  readonly onExportSheet: () => void;
}

interface JointSliderProps {
  readonly joint: CalibrationJoint;
  readonly axis: CalibrationAxis;
  readonly label: string;
  readonly value: number;
  readonly onChange: (joint: CalibrationJoint, axis: CalibrationAxis, value: number) => void;
}

const display = (value: number): string => `${value > 0 ? '+' : ''}${value.toFixed(1)} px`;

const JointSlider = ({
  joint,
  axis,
  label,
  value,
  onChange,
}: JointSliderProps): React.JSX.Element => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    onChange(joint, axis, Number.parseFloat(event.target.value));
  };
  return (
    <label className="slider">
      <span className="slider__label">
        {label}
        <output className="slider__value">{display(value)}</output>
      </span>
      <input
        type="range"
        min={-CALIBRATION_LIMIT}
        max={CALIBRATION_LIMIT}
        step={CALIBRATION_STEP}
        value={value}
        onChange={handleChange}
        data-testid={`calibration__${joint}-${axis}`}
      />
    </label>
  );
};

const JointRow = ({
  joint,
  label,
  offsets,
  onChange,
}: {
  joint: CalibrationJoint;
  label: string;
  offsets: Calibration['hip'];
  onChange: (joint: CalibrationJoint, axis: CalibrationAxis, value: number) => void;
}): React.JSX.Element => (
  <fieldset className="calibration__row">
    <legend>{label}</legend>
    <JointSlider joint={joint} axis="x" label="X" value={offsets.x} onChange={onChange} />
    <JointSlider joint={joint} axis="y" label="Y" value={offsets.y} onChange={onChange} />
  </fieldset>
);

const CalibrationActions = ({
  busy,
  onExportJson,
  onExportSheet,
}: {
  busy: boolean;
  onExportJson: () => void;
  onExportSheet: () => void;
}): React.JSX.Element => (
  <div className="export-row">
    <button
      type="button"
      className="secondary-button"
      onClick={onExportJson}
      data-testid="calibration__export-json"
    >
      Export calibration JSON
    </button>
    <button
      type="button"
      className="secondary-button"
      onClick={onExportSheet}
      disabled={busy}
      data-testid="calibration__export-sheet"
    >
      {busy ? 'Rendering…' : 'Export calibrated sheet'}
    </button>
  </div>
);

export const CalibrationPanel = ({
  state,
  busy,
  onExportJson,
  onExportSheet,
}: CalibrationPanelProps): React.JSX.Element => {
  const { calibration, setOffset, reset } = state;
  const { hip, shoulder, head } = calibration;
  return (
    <section className="panel" aria-label="Joint calibration">
      <div className="panel-head">
        <h2 className="panel-title">Joint calibration</h2>
        <button
          type="button"
          className="ghost-button"
          onClick={reset}
          data-testid="calibration__reset"
        >
          Reset offsets
        </button>
      </div>
      <p className="panel-hint">
        Nudge the pelvis, shoulder socket or head by up to ±{CALIBRATION_LIMIT} px. Leg roots stay
        on the uncalibrated pelvis, so no hip nudge can stretch a limb chain. Exports record the
        exact offsets alongside the pixels.
      </p>
      <div className="calibration__grid">
        <JointRow joint="hip" label="Pelvis / hip anchor" offsets={hip} onChange={setOffset} />
        <JointRow
          joint="shoulder"
          label="Shoulder socket"
          offsets={shoulder}
          onChange={setOffset}
        />
        <JointRow joint="head" label="Head" offsets={head} onChange={setOffset} />
      </div>
      <CalibrationActions busy={busy} onExportJson={onExportJson} onExportSheet={onExportSheet} />
      <p className="panel-hint">
        Registered pairs: <code>*-8frame-calibrated.png</code> + <code>*-calibration.json</code>.
        The JSON carries the schema, canvas size, settings and clamped offsets, so the PNG is
        reproducible.
      </p>
    </section>
  );
};
