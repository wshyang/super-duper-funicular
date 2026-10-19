import { useEffect, useMemo, useState } from 'react';
import type {
  ArmSwingStyleId,
  BackdropVariantId,
  GaitConfig,
  ImageCatalogManifest,
  LocomotionModeId,
  PhotorealAssetTuningSpec,
  PhotorealPersonaId,
  RunnerPersonaId,
  RunnerVariantId,
  SpriteFlawAnalysisReport,
} from '../../shared/types.js';
import {
  applyAssetTuningToRigSpec,
  ARM_SWING_PRESETS,
  createInitialAssetTuningMap,
  createInitialLocomotionConfigMap,
  DEFAULT_RIG_SPEC,
  type LocomotionConfigMap,
  PHOTOREAL_ASSET_TUNING_DEFAULTS,
  type PhotorealAssetTuningMap,
  resetActiveLocomotionProfile,
} from '../../runner/body-proportions.js';
import { normalizePhase, solveArticulatedPose } from '../../runner/gait.js';
import { RUNNER_PALETTES } from '../../runner/palette.js';
import { renderRunnerPoseToRaster } from '../../runner/rasterizer.js';
import { isPhotorealPersona, resolveRunnerSkin } from '../../runner/skin-registry.js';
import {
  formatCatalogToRows,
  formatReportToRows,
  INITIAL_CATALOG_ROWS,
  INITIAL_FLAW_CARDS,
  INITIAL_HALF_CYCLE_ROWS,
} from './static-diagnostics-data.js';
import {
  buildArticulatedPartReadouts,
  buildFilmstripCards,
  buildFormattedPoseSummary,
  buildFormattedSliderLabels,
  type OverlayVisibility,
  type StudioTabId,
  sampleFootOrbitTrail,
} from './studio-view-model.js';
import {
  type PhotorealLoadStatus,
  usePhotorealRigAssetsWithRetry,
} from './usePhotorealRigAssets.js';

export type PlaybackMode = 'playing' | 'paused';

function usePlaybackPhase(cadenceHz: number) {
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('playing');
  const [phase, setPhase] = useState<number>(0);

  useEffect(() => {
    if (playbackMode !== 'playing') {
      return undefined;
    }
    let lastTime = performance.now();
    let rafId = 0;
    const tick = (now: number) => {
      const dtSec = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      setPhase((prev) => normalizePhase(prev + dtSec * cadenceHz));
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [playbackMode, cadenceHz]);

  const togglePlayback = () =>
    setPlaybackMode((prev) => (prev === 'playing' ? 'paused' : 'playing'));
  const scrubPhase = (nextPhase: number) => {
    setPlaybackMode('paused');
    setPhase(normalizePhase(nextPhase));
  };
  return { playbackMode, setPlaybackMode, phase, setPhase, togglePlayback, scrubPhase };
}

function useDiagnosticsData() {
  const [flawCards, setFlawCards] = useState(INITIAL_FLAW_CARDS);
  const [halfCycleRows, setHalfCycleRows] = useState(INITIAL_HALF_CYCLE_ROWS);
  const [catalogRows, setCatalogRows] = useState(INITIAL_CATALOG_ROWS);

  useEffect(() => {
    if (typeof fetch !== 'function') {
      return;
    }
    fetch('/sprites/extracted/analysis.json')
      .then((r) => (r.ok ? (r.json() as Promise<SpriteFlawAnalysisReport>) : null))
      .then((report) => {
        if (report) {
          const formatted = formatReportToRows(report);
          setFlawCards(formatted.flawCards);
          setHalfCycleRows(formatted.halfCycleRows);
        }
      })
      .catch(() => undefined);
    fetch('/sprites/catalog.json')
      .then((r) => (r.ok ? (r.json() as Promise<ImageCatalogManifest>) : null))
      .then((cat) => {
        if (cat) setCatalogRows(formatCatalogToRows(cat));
      })
      .catch(() => undefined);
  }, []);

  return { flawCards, halfCycleRows, catalogRows };
}

function useOverlayControls() {
  const [skeletonOverlay, setSkeletonOverlay] = useState<OverlayVisibility>('visible');
  const [orbitTrailOverlay, setOrbitTrailOverlay] = useState<OverlayVisibility>('visible');
  const [onionSkinOverlay, setOnionSkinOverlay] = useState<OverlayVisibility>('hidden');

  const toggleSkeletonOverlay = () =>
    setSkeletonOverlay((prev) => (prev === 'visible' ? 'hidden' : 'visible'));
  const toggleOrbitTrailOverlay = () =>
    setOrbitTrailOverlay((prev) => (prev === 'visible' ? 'hidden' : 'visible'));
  const toggleOnionSkinOverlay = () =>
    setOnionSkinOverlay((prev) => (prev === 'visible' ? 'hidden' : 'visible'));

  return {
    skeletonOverlay,
    toggleSkeletonOverlay,
    orbitTrailOverlay,
    toggleOrbitTrailOverlay,
    onionSkinOverlay,
    toggleOnionSkinOverlay,
  };
}

interface DerivedRunnerInput {
  readonly phase: number;
  readonly variant: RunnerVariantId;
  readonly personaId: RunnerPersonaId;
  readonly gaitConfig: GaitConfig;
  readonly activeAssetTuning: PhotorealAssetTuningSpec;
  readonly photorealStatus: PhotorealLoadStatus;
}

function useRunnerRasters(input: DerivedRunnerInput) {
  const { phase, variant, personaId, gaitConfig, activeAssetTuning, photorealStatus } = input;
  const tunedRigSpec = useMemo(
    () =>
      isPhotorealPersona(personaId)
        ? applyAssetTuningToRigSpec(DEFAULT_RIG_SPEC, activeAssetTuning)
        : DEFAULT_RIG_SPEC,
    [personaId, activeAssetTuning],
  );
  const currentPose = useMemo(
    () => solveArticulatedPose(phase, gaitConfig, tunedRigSpec),
    [phase, gaitConfig, tunedRigSpec],
  );
  const previousPose = useMemo(
    () => solveArticulatedPose(normalizePhase(phase - 0.125), gaitConfig, tunedRigSpec),
    [phase, gaitConfig, tunedRigSpec],
  );
  const palette = RUNNER_PALETTES[variant];
  const currentRaster = useMemo(
    () =>
      renderRunnerPoseToRaster({
        pose: currentPose,
        palette,
        pixelScale: gaitConfig.pixelScale,
        personaId,
        assetTuning: activeAssetTuning,
      }),
    [currentPose, palette, gaitConfig.pixelScale, personaId, activeAssetTuning, photorealStatus],
  );
  const previousRaster = useMemo(
    () =>
      renderRunnerPoseToRaster({
        pose: previousPose,
        palette,
        pixelScale: gaitConfig.pixelScale,
        personaId,
        assetTuning: activeAssetTuning,
      }),
    [previousPose, palette, gaitConfig.pixelScale, personaId, activeAssetTuning, photorealStatus],
  );
  return { currentPose, currentRaster, previousRaster };
}

function useDerivedRunnerModels(input: DerivedRunnerInput) {
  const { phase, variant, personaId, gaitConfig, activeAssetTuning } = input;
  const activePersonaSkin = useMemo(() => resolveRunnerSkin(personaId), [personaId]);
  const { currentPose, currentRaster, previousRaster } = useRunnerRasters(input);
  const filmstripCards = useMemo(
    () => buildFilmstripCards(variant, currentPose.canonicalFrameIndex, personaId),
    [variant, currentPose.canonicalFrameIndex, personaId],
  );
  const poseSummary = useMemo(() => buildFormattedPoseSummary(currentPose), [currentPose]);
  const sliderLabels = useMemo(
    () => buildFormattedSliderLabels(phase, gaitConfig, activeAssetTuning),
    [phase, gaitConfig, activeAssetTuning],
  );
  const partReadouts = useMemo(
    () => buildArticulatedPartReadouts(currentPose, personaId),
    [currentPose, personaId],
  );
  const footOrbitSamples = useMemo(() => sampleFootOrbitTrail(gaitConfig), [gaitConfig]);
  return {
    activePersonaSkin,
    currentPose,
    currentRaster,
    previousRaster,
    filmstripCards,
    poseSummary,
    sliderLabels,
    partReadouts,
    footOrbitSamples,
  };
}

function useLocomotionProfileSettings() {
  const [activeMode, setActiveMode] = useState<LocomotionModeId>('run');
  const [configByMode, setConfigByMode] = useState<LocomotionConfigMap>(
    createInitialLocomotionConfigMap,
  );
  const gaitConfig = configByMode[activeMode];
  const patchMode = (patch: Partial<GaitConfig>) =>
    setConfigByMode((prev) => ({
      ...prev,
      [activeMode]: { ...prev[activeMode], ...patch },
    }));
  const updateGaitParameter = <K extends keyof GaitConfig>(key: K, value: GaitConfig[K]) => {
    if (key === 'locomotionMode' && typeof value === 'string') {
      setActiveMode(value as LocomotionModeId);
      return;
    }
    patchMode({ [key]: value });
  };
  const applyArmSwingPreset = (presetId: ArmSwingStyleId) => {
    const preset = ARM_SWING_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      patchMode({
        armSwingScale: preset.armSwingScale,
        armCarryFlexDeg: preset.armCarryFlexDeg,
        armChestBiasDeg: preset.armChestBiasDeg,
      });
    }
  };
  const applyPersonaMotionDefaults = (tuning: PhotorealAssetTuningSpec) =>
    patchMode({
      armCarryFlexDeg: tuning.defaultArmCarryFlexDeg,
      armChestBiasDeg: tuning.defaultArmChestBiasDeg,
      hairStyleMode: tuning.defaultHairStyleMode,
    });
  const resetGaitProfile = () =>
    setConfigByMode((prev) => resetActiveLocomotionProfile(prev, activeMode));
  return {
    gaitConfig,
    updateGaitParameter,
    applyArmSwingPreset,
    applyPersonaMotionDefaults,
    resetGaitProfile,
  };
}

function usePhotorealAssetTuningState(personaId: RunnerPersonaId) {
  const [tuningByPersona, setTuningByPersona] = useState<PhotorealAssetTuningMap>(
    createInitialAssetTuningMap,
  );
  const activePhotorealId: PhotorealPersonaId = isPhotorealPersona(personaId)
    ? personaId
    : 'photo-sg-chinese-female';
  const activeAssetTuning = tuningByPersona[activePhotorealId];

  const updateAssetTuning = <K extends keyof PhotorealAssetTuningSpec>(
    key: K,
    value: PhotorealAssetTuningSpec[K],
  ) => {
    setTuningByPersona((prev) => ({
      ...prev,
      [activePhotorealId]: { ...prev[activePhotorealId], [key]: value },
    }));
  };

  const resetAssetTuning = () => {
    setTuningByPersona((prev) => ({
      ...prev,
      [activePhotorealId]: { ...PHOTOREAL_ASSET_TUNING_DEFAULTS[activePhotorealId] },
    }));
  };

  return { tuningByPersona, activeAssetTuning, updateAssetTuning, resetAssetTuning };
}

export function useRunnerStudio() {
  const [activeTab, setActiveTab] = useState<StudioTabId>('all-in-one');
  const [personaId, setPersonaIdState] = useState<RunnerPersonaId>('photo-sg-chinese-female');
  const [variant, setVariant] = useState<RunnerVariantId>('red');
  const [backdrop, setBackdrop] = useState<BackdropVariantId>('stadium-day');
  const loc = useLocomotionProfileSettings();
  const tuningState = usePhotorealAssetTuningState(personaId);
  const { status: photorealStatus, retryPhotorealAssets } = usePhotorealRigAssetsWithRetry();
  const playback = usePlaybackPhase(loc.gaitConfig.cadenceHz);
  const overlays = useOverlayControls();
  const diagnostics = useDiagnosticsData();
  const derived = useDerivedRunnerModels({
    phase: playback.phase, variant, personaId, gaitConfig: loc.gaitConfig,
    activeAssetTuning: tuningState.activeAssetTuning, photorealStatus,
  });
  const setPersonaId = (nextPersonaId: RunnerPersonaId) => {
    setPersonaIdState(nextPersonaId);
    if (isPhotorealPersona(nextPersonaId)) {
      loc.applyPersonaMotionDefaults(tuningState.tuningByPersona[nextPersonaId]);
    }
  };
  const selectCanonicalFrame = (idx: number) => {
    playback.setPlaybackMode('paused');
    playback.setPhase(normalizePhase(idx / 8));
  };
  const stepFrame = (delta: number) =>
    selectCanonicalFrame((derived.currentPose.canonicalFrameIndex + delta + 8) % 8);
  const activeExtractedFrameUrl =
    derived.filmstripCards[derived.currentPose.canonicalFrameIndex]?.extractedUrl ??
    `/sprites/extracted/${variant}/frame-01.png`;
  return {
    activeTab, setActiveTab, personaId, setPersonaId,
    playbackMode: playback.playbackMode, togglePlayback: playback.togglePlayback,
    phase: playback.phase, scrubPhase: playback.scrubPhase, stepFrame, selectCanonicalFrame,
    variant, setVariant, backdrop, setBackdrop,
    gaitConfig: loc.gaitConfig, updateGaitParameter: loc.updateGaitParameter,
    applyArmSwingPreset: loc.applyArmSwingPreset, resetGaitProfile: loc.resetGaitProfile,
    activeAssetTuning: tuningState.activeAssetTuning,
    updateAssetTuning: tuningState.updateAssetTuning,
    resetAssetTuning: tuningState.resetAssetTuning,
    photorealStatus, retryPhotorealAssets,
    activeExtractedFrameUrl, ...overlays, ...derived, ...diagnostics,
  };
}
