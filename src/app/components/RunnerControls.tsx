import React from 'react';
import type {
  ArmSwingStyleId,
  BackdropVariantId,
  GaitConfig,
  HairStyleMode,
  LocomotionModeId,
  PhotorealAssetTuningSpec,
  RunnerPersonaId,
  RunnerVariantId,
} from '../../shared/types.js';
import { ARM_SWING_PRESETS } from '../../runner/body-proportions.js';
import type { RunnerSkinDefinition } from '../../runner/skin-registry.js';
import {
  BACKDROP_OPTIONS,
  type FormattedSliderLabels,
  type OverlayVisibility,
  PERSONA_OPTIONS,
  VARIANT_OPTIONS,
} from '../hooks/studio-view-model.js';
import type { PlaybackMode } from '../hooks/useRunnerStudio.js';

export interface RunnerControlsProps {
  readonly playbackMode: PlaybackMode;
  readonly onTogglePlayback: () => void;
  readonly phase: number;
  readonly sliderLabels: FormattedSliderLabels;
  readonly onScrubPhase: (phase: number) => void;
  readonly onStepFrame: (delta: number) => void;
  readonly personaId: RunnerPersonaId;
  readonly activePersonaSkin: RunnerSkinDefinition;
  readonly onSelectPersona: (personaId: RunnerPersonaId) => void;
  readonly variant: RunnerVariantId;
  readonly onSelectVariant: (variant: RunnerVariantId) => void;
  readonly backdrop: BackdropVariantId;
  readonly onSelectBackdrop: (backdrop: BackdropVariantId) => void;
  readonly gaitConfig: GaitConfig;
  readonly onUpdateGait: <K extends keyof GaitConfig>(key: K, value: GaitConfig[K]) => void;
  readonly onApplyArmSwingPreset?: (presetId: ArmSwingStyleId) => void;
  readonly onResetGaitProfile?: () => void;
  readonly activeAssetTuning?: PhotorealAssetTuningSpec;
  readonly onUpdateAssetTuning?: <K extends keyof PhotorealAssetTuningSpec>(
    key: K,
    value: PhotorealAssetTuningSpec[K],
  ) => void;
  readonly onResetAssetTuning?: () => void;
  readonly skeletonOverlay: OverlayVisibility;
  readonly onToggleSkeleton: () => void;
  readonly orbitTrailOverlay: OverlayVisibility;
  readonly onToggleOrbitTrail: () => void;
  readonly onionSkinOverlay: OverlayVisibility;
  readonly onToggleOnionSkin: () => void;
}

export function RunnerControls({
  props,
}: {
  readonly props: RunnerControlsProps;
}): React.ReactElement {
  return (
    <aside className="studio-controls-panel" data-testid="runner-controls-panel">
      <PersonaSelectorSection props={props} />
      <LocomotionModeSection props={props} />
      <HairDynamicsSection props={props} />
      <ArmSwingControlsSection props={props} />
      <AssetTuningControlsSection props={props} />
      <PlaybackTransportSection props={props} />
      <TeamVariantSelectorSection props={props} />
      <BackdropSelectorSection props={props} />
      <GaitSlidersSection props={props} />
      <OverlayTogglesSection props={props} />
    </aside>
  );
}

const LOCOMOTION_MODES: readonly {
  readonly id: LocomotionModeId;
  readonly label: string;
  readonly sub: string;
}[] = [
  { id: 'run', label: 'Running', sub: 'Flight + Midfoot Roll' },
  { id: 'walk', label: 'Walking', sub: 'Double Support (No Flight)' },
  { id: 'brisk-walk', label: 'Brisk Walk', sub: 'Fast Cadence (No Flight)' },
];

const HAIR_STYLE_MODES: readonly {
  readonly id: HairStyleMode;
  readonly label: string;
  readonly sub: string;
}[] = [
  { id: 'ponytail', label: 'Sporty Ponytail', sub: 'High Occipital Tie & Bounce' },
  { id: 'long-flowing', label: 'Long Flowing Hair', sub: '2-Wave Shoulder & Back Swing' },
  { id: 'none', label: 'No Ponytail / Tucked', sub: 'Optional Hair Plume Off' },
];

function LocomotionModeSection({
  props,
}: {
  readonly props: RunnerControlsProps;
}): React.ReactElement {
  const activeMode = props.gaitConfig.locomotionMode ?? 'run';
  return (
    <div className="control-card" data-testid="locomotion-mode-section">
      <h3 className="control-card-title">Locomotion Profile</h3>
      <div className="persona-toggle-grid">
        {LOCOMOTION_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={
              activeMode === m.id
                ? 'persona-btn persona-btn--active'
                : 'persona-btn'
            }
            onClick={() => props.onUpdateGait('locomotionMode', m.id)}
            data-testid={`runner-controls__locomotion-${m.id}`}
          >
            <span className="persona-btn-title">{m.label}</span>
            <span className="persona-btn-subtitle">{m.sub}</span>
          </button>
        ))}
      </div>
      {props.onResetGaitProfile && (
        <button
          type="button"
          className="btn-secondary"
          onClick={props.onResetGaitProfile}
          data-testid="runner-controls__reset-profile"
        >
          ↺ Reset Active Profile Defaults
        </button>
      )}
    </div>
  );
}

function HairDynamicsSection({
  props,
}: {
  readonly props: RunnerControlsProps;
}): React.ReactElement {
  const activeHair = props.gaitConfig.hairStyleMode ?? 'ponytail';
  const hairSwing = props.gaitConfig.hairSwingScale ?? 1.0;
  return (
    <div className="control-card" data-testid="hair-dynamics-section">
      <h3 className="control-card-title">Hair Style & Swinging Dynamics</h3>
      <div className="persona-toggle-grid">
        {HAIR_STYLE_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={
              activeHair === mode.id
                ? 'persona-btn persona-btn--active'
                : 'persona-btn'
            }
            onClick={() => props.onUpdateGait('hairStyleMode', mode.id)}
            data-testid={`hair-mode-${mode.id}`}
          >
            <span className="persona-btn-title">{mode.label}</span>
            <span className="persona-btn-subtitle">{mode.sub}</span>
          </button>
        ))}
      </div>
      <SliderControl
        label="Hair Swing / Wave Amplitude"
        displayValue={props.sliderLabels.hairSwingLabel}
        min={0}
        max={1.6}
        step={0.05}
        value={hairSwing}
        onChange={(v) => props.onUpdateGait('hairSwingScale', v)}
      />
    </div>
  );
}

function ArmSwingControlsSection({
  props,
}: {
  readonly props: RunnerControlsProps;
}): React.ReactElement {
  const { gaitConfig, onUpdateGait, sliderLabels, onApplyArmSwingPreset } = props;
  return (
    <div className="control-card" data-testid="arm-swing-section">
      <h3 className="control-card-title">Arm-Swing Motion & Chest Carry</h3>
      {onApplyArmSwingPreset && (
        <div className="persona-toggle-grid">
          {ARM_SWING_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="persona-btn"
              onClick={() => onApplyArmSwingPreset(preset.id)}
              data-testid={`arm-preset-${preset.id}`}
            >
              <span className="persona-btn-title">{preset.label}</span>
              <span className="persona-btn-subtitle">{preset.sub}</span>
            </button>
          ))}
        </div>
      )}
      <SliderControl
        label="Arm Swing Amplitude"
        displayValue={sliderLabels.armSwingLabel}
        min={0.25}
        max={1.5}
        step={0.05}
        value={gaitConfig.armSwingScale}
        onChange={(v) => onUpdateGait('armSwingScale', v)}
      />
      <SliderControl
        label="Elbow Flexion (Chest Tuck)"
        displayValue={sliderLabels.armCarryFlexLabel}
        min={45}
        max={125}
        step={1}
        value={gaitConfig.armCarryFlexDeg ?? 84}
        onChange={(v) => onUpdateGait('armCarryFlexDeg', v)}
      />
      <SliderControl
        label="Chest Carry Height Bias"
        displayValue={sliderLabels.armChestBiasLabel}
        min={-10}
        max={28}
        step={1}
        value={gaitConfig.armChestBiasDeg ?? 4}
        onChange={(v) => onUpdateGait('armChestBiasDeg', v)}
      />
    </div>
  );
}

function AssetTuningControlsSection({
  props,
}: {
  readonly props: RunnerControlsProps;
}): React.ReactElement {
  const { activeAssetTuning, onUpdateAssetTuning, onResetAssetTuning, sliderLabels } = props;
  if (!activeAssetTuning || !onUpdateAssetTuning) {
    return <div data-testid="asset-tuning-empty" />;
  }
  return (
    <div className="control-card" data-testid="asset-tuning-section">
      <h3 className="control-card-title">Per-Asset-Set Body Proportion Tuning</h3>
      <p className="persona-description">{activeAssetTuning.buildLabel}</p>
      <SliderControl
        label="Upper Arm Length Scale"
        displayValue={sliderLabels.upperArmLenLabel}
        min={0.75}
        max={1.25}
        step={0.02}
        value={activeAssetTuning.upperArmLengthScale}
        onChange={(v) => onUpdateAssetTuning('upperArmLengthScale', v)}
      />
      <SliderControl
        label="Forearm Length Scale"
        displayValue={sliderLabels.forearmLenLabel}
        min={0.75}
        max={1.25}
        step={0.02}
        value={activeAssetTuning.forearmLengthScale}
        onChange={(v) => onUpdateAssetTuning('forearmLengthScale', v)}
      />
      <AssetBodyWidthsSliders
        tuning={activeAssetTuning}
        labels={sliderLabels}
        onUpdate={onUpdateAssetTuning}
      />
      {onResetAssetTuning && (
        <button
          type="button"
          className="btn-secondary"
          onClick={onResetAssetTuning}
          data-testid="runner-controls__reset-asset-tuning"
        >
          ↺ Reset Asset-Set Proportions
        </button>
      )}
    </div>
  );
}

function AssetBodyWidthsSliders({
  tuning,
  labels,
  onUpdate,
}: {
  readonly tuning: PhotorealAssetTuningSpec;
  readonly labels: FormattedSliderLabels;
  readonly onUpdate: <K extends keyof PhotorealAssetTuningSpec>(
    key: K,
    value: PhotorealAssetTuningSpec[K],
  ) => void;
}): React.ReactElement {
  return (
    <>
      <SliderControl
        label="Arm Width (Half-Span)"
        displayValue={labels.armWidthLabel}
        min={13}
        max={24}
        step={0.5}
        value={tuning.upperArmWidthPx}
        onChange={(v) => {
          onUpdate('upperArmWidthPx', v);
          onUpdate('forearmWidthPx', v - 1.0);
        }}
      />
      <SliderControl
        label="Torso / Waist Width"
        displayValue={labels.torsoWidthLabel}
        min={32}
        max={48}
        step={0.5}
        value={tuning.torsoWidthPx}
        onChange={(v) => onUpdate('torsoWidthPx', v)}
      />
      <SliderControl
        label="Pelvis / Hip Width"
        displayValue={labels.pelvisWidthLabel}
        min={24}
        max={36}
        step={0.5}
        value={tuning.pelvisWidthPx}
        onChange={(v) => onUpdate('pelvisWidthPx', v)}
      />
      <SliderControl
        label="Thigh / Calf Width"
        displayValue={labels.thighWidthLabel}
        min={23}
        max={35}
        step={0.5}
        value={tuning.thighWidthPx}
        onChange={(v) => {
          onUpdate('thighWidthPx', v);
          onUpdate('shinWidthPx', v - 1.5);
        }}
      />
    </>
  );
}

function PersonaSelectorSection({
  props,
}: {
  readonly props: RunnerControlsProps;
}): React.ReactElement {
  return (
    <div className="control-card persona-card" data-testid="persona-selector-section">
      <h3 className="control-card-title">Runner Persona (Body-Positive Rig)</h3>
      <div className="persona-toggle-grid">
        {PERSONA_OPTIONS.map((skin) => (
          <button
            key={skin.id}
            type="button"
            className={
              props.personaId === skin.id
                ? 'persona-btn persona-btn--active'
                : 'persona-btn'
            }
            onClick={() => props.onSelectPersona(skin.id)}
            data-testid={`persona-toggle-${skin.id}`}
          >
            <span className="persona-btn-title">{skin.title}</span>
            <span className="persona-btn-subtitle">{skin.badgeLabel}</span>
          </button>
        ))}
      </div>
      <p className="persona-description" data-testid="active-persona-description">
        {props.activePersonaSkin.subtitle}
      </p>
    </div>
  );
}

function PlaybackTransportSection({
  props,
}: {
  readonly props: RunnerControlsProps;
}): React.ReactElement {
  return (
    <div className="control-card">
      <h3 className="control-card-title">Stride Cycle Transport</h3>
      <div className="transport-button-row">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => props.onStepFrame(-1)}
          data-testid="step-prev-frame-btn"
        >
          ◀ Prev Frame
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={props.onTogglePlayback}
          data-testid="toggle-playback-btn"
        >
          {props.playbackMode === 'playing' ? '⏸ Pause Cycle' : '▶ Play Cycle'}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => props.onStepFrame(1)}
          data-testid="step-next-frame-btn"
        >
          Next Frame ▶
        </button>
      </div>
      <label className="slider-label">
        <span>Continuous Stride Phase</span>
        <strong>{props.sliderLabels.phasePctText}</strong>
      </label>
      <input
        type="range"
        min={0}
        max={0.99}
        step={0.005}
        value={props.phase}
        onChange={(e) => props.onScrubPhase(Number(e.target.value))}
        className="studio-slider"
        data-testid="phase-scrub-slider"
      />
    </div>
  );
}

function TeamVariantSelectorSection({
  props,
}: {
  readonly props: RunnerControlsProps;
}): React.ReactElement {
  return (
    <div className="control-card">
      <h3 className="control-card-title">Team Jersey Palette (6 Variants)</h3>
      <div className="swatch-grid">
        {VARIANT_OPTIONS.map((palette) => (
          <button
            key={palette.id}
            type="button"
            className={
              props.variant === palette.id
                ? 'swatch-btn swatch-btn--active'
                : 'swatch-btn'
            }
            onClick={() => props.onSelectVariant(palette.id)}
            data-testid={`variant-swatch-${palette.id}`}
          >
            <span
              className="swatch-dot"
              style={{ backgroundColor: palette.jerseyMain }}
            />
            <span>{palette.id.toUpperCase()}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BackdropSelectorSection({
  props,
}: {
  readonly props: RunnerControlsProps;
}): React.ReactElement {
  return (
    <div className="control-card">
      <h3 className="control-card-title">Backdrop & Chroma Key Stage</h3>
      <select
        value={props.backdrop}
        onChange={(e) => props.onSelectBackdrop(e.target.value as BackdropVariantId)}
        className="studio-select"
        data-testid="backdrop-select"
      >
        {BACKDROP_OPTIONS.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function GaitSlidersSection({
  props,
}: {
  readonly props: RunnerControlsProps;
}): React.ReactElement {
  const { gaitConfig, onUpdateGait, sliderLabels } = props;
  return (
    <div className="control-card">
      <h3 className="control-card-title">Biomechanical & IK Parameters</h3>
      <SliderControl
        label="Cadence (Cycles/s)"
        displayValue={sliderLabels.cadenceLabel}
        min={0.4}
        max={2.6}
        step={0.05}
        value={gaitConfig.cadenceHz}
        onChange={(v) => onUpdateGait('cadenceHz', v)}
      />
      <SliderControl
        label="Forward-Fall Lean"
        displayValue={sliderLabels.leanLabel}
        min={8}
        max={30}
        step={1}
        value={gaitConfig.forwardLeanDeg}
        onChange={(v) => onUpdateGait('forwardLeanDeg', v)}
      />
      <SliderControl
        label="Neck Articulation"
        displayValue={sliderLabels.neckLabel}
        min={0}
        max={1.6}
        step={0.05}
        value={gaitConfig.neckMotionScale}
        onChange={(v) => onUpdateGait('neckMotionScale', v)}
      />
      <SliderControl
        label="Foot Roll (Midfoot → Toe)"
        displayValue={sliderLabels.footRollLabel}
        min={0.4}
        max={1.5}
        step={0.05}
        value={gaitConfig.footRollScale}
        onChange={(v) => onUpdateGait('footRollScale', v)}
      />
      <SliderControl
        label="Stride Reach Scale"
        displayValue={sliderLabels.strideLabel}
        min={0.65}
        max={1.35}
        step={0.05}
        value={gaitConfig.strideLengthScale}
        onChange={(v) => onUpdateGait('strideLengthScale', v)}
      />
    </div>
  );
}

interface SliderControlSpec {
  readonly label: string;
  readonly displayValue: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly value: number;
  readonly onChange: (val: number) => void;
}

function SliderControl(spec: SliderControlSpec): React.ReactElement {
  return (
    <div className="slider-row">
      <label className="slider-label">
        <span>{spec.label}</span>
        <strong>{spec.displayValue}</strong>
      </label>
      <input
        type="range"
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={spec.value}
        onChange={(e) => spec.onChange(Number(e.target.value))}
        className="studio-slider"
      />
    </div>
  );
}

function OverlayTogglesSection({
  props,
}: {
  readonly props: RunnerControlsProps;
}): React.ReactElement {
  return (
    <div className="control-card">
      <h3 className="control-card-title">Diagnostic Overlays & Pixel Scale</h3>
      <div className="toggle-list">
        <button
          type="button"
          className={
            props.skeletonOverlay === 'visible' ? 'chip-btn chip-btn--on' : 'chip-btn'
          }
          onClick={props.onToggleSkeleton}
          data-testid="toggle-skeleton-btn"
        >
          2-Bone IK + Neck + Foot Roll Overlay
        </button>
        <button
          type="button"
          className={
            props.orbitTrailOverlay === 'visible' ? 'chip-btn chip-btn--on' : 'chip-btn'
          }
          onClick={props.onToggleOrbitTrail}
          data-testid="toggle-orbit-btn"
        >
          Ball-of-Foot Closed Orbit Trail
        </button>
        <button
          type="button"
          className={
            props.onionSkinOverlay === 'visible' ? 'chip-btn chip-btn--on' : 'chip-btn'
          }
          onClick={props.onToggleOnionSkin}
          data-testid="toggle-onion-btn"
        >
          Previous Frame Onion-Skin
        </button>
      </div>
    </div>
  );
}
