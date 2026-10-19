// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RunnerControls, type RunnerControlsProps } from './components/RunnerControls.js';
import {
  DEFAULT_GAIT_CONFIG,
  PHOTOREAL_ASSET_TUNING_DEFAULTS,
} from '../runner/body-proportions.js';
import { PERSONA_SKINS } from '../runner/skin-registry.js';
import { buildFormattedSliderLabels, BACKDROP_OPTIONS } from './hooks/studio-view-model.js';

function createControlProps(): RunnerControlsProps {
  const gaitConfig = { ...DEFAULT_GAIT_CONFIG };
  const tuning = PHOTOREAL_ASSET_TUNING_DEFAULTS['photo-sg-chinese-female'];
  return {
    playbackMode: 'paused',
    onTogglePlayback: vi.fn(),
    phase: 0,
    sliderLabels: buildFormattedSliderLabels(0, gaitConfig, tuning),
    onScrubPhase: vi.fn(),
    onStepFrame: vi.fn(),
    personaId: 'photo-sg-chinese-female',
    activePersonaSkin: PERSONA_SKINS.find((skin) => skin.id === 'photo-sg-chinese-female')!,
    onSelectPersona: vi.fn(),
    variant: 'red',
    onSelectVariant: vi.fn(),
    backdrop: BACKDROP_OPTIONS[0]!.id,
    onSelectBackdrop: vi.fn(),
    gaitConfig,
    onUpdateGait: vi.fn(),
    onApplyArmSwingPreset: vi.fn(),
    onResetGaitProfile: vi.fn(),
    activeAssetTuning: tuning,
    onUpdateAssetTuning: vi.fn(),
    onResetAssetTuning: vi.fn(),
    skeletonOverlay: 'hidden',
    onToggleSkeleton: vi.fn(),
    orbitTrailOverlay: 'hidden',
    onToggleOrbitTrail: vi.fn(),
    onionSkinOverlay: 'hidden',
    onToggleOnionSkin: vi.fn(),
  };
}

describe('Per-persona body tuning controls', () => {
  it('keeps advanced sliders folded until explicitly expanded', () => {
    render(<RunnerControls props={createControlProps()} />);
    const tuningSection = screen.getByTestId('asset-tuning-section');
    expect(tuningSection).not.toHaveAttribute('open');
    expect(screen.getByText('Torso / Waist Width')).not.toBeVisible();
    fireEvent.click(screen.getByTestId('runner-controls__asset-tuning-toggle'));
    expect(tuningSection).toHaveAttribute('open');
    expect(screen.getByText('Torso / Waist Width')).toBeVisible();
  });

  it('explains arm carry bias as an angle coupled to swing, not a height control', () => {
    render(<RunnerControls props={createControlProps()} />);
    const explanations = screen.getAllByTestId('arm-carry-bias-help');
    expect(explanations.length).toBeGreaterThan(0);
    for (const explanation of explanations) {
      expect(explanation).toHaveTextContent('Angular shoulder bias within the arm-swing cycle');
      expect(explanation).toHaveTextContent('not a fixed vertical-height offset');
    }
  });
});
