import { useEffect, useMemo, useState } from 'react';
import type {
  BackdropVariantId,
  GaitConfig,
  ImageCatalogManifest,
  RunnerPersonaId,
  RunnerVariantId,
  SpriteFlawAnalysisReport,
} from '../../shared/types.js';
import { DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC } from '../../runner/body-proportions.js';
import { normalizePhase, solveArticulatedPose } from '../../runner/gait.js';
import { RUNNER_PALETTES } from '../../runner/palette.js';
import { renderRunnerPoseToRaster } from '../../runner/rasterizer.js';
import { resolveRunnerSkin } from '../../runner/skin-registry.js';
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
  usePhotorealRigAssets,
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
  readonly photorealStatus: PhotorealLoadStatus;
}

function useDerivedRunnerModels(input: DerivedRunnerInput) {
  const { phase, variant, personaId, gaitConfig, photorealStatus } = input;
  const activePersonaSkin = useMemo(() => resolveRunnerSkin(personaId), [personaId]);
  const currentPose = useMemo(
    () => solveArticulatedPose(phase, gaitConfig, DEFAULT_RIG_SPEC),
    [phase, gaitConfig],
  );
  const previousPose = useMemo(
    () => solveArticulatedPose(normalizePhase(phase - 0.125), gaitConfig, DEFAULT_RIG_SPEC),
    [phase, gaitConfig],
  );
  const palette = RUNNER_PALETTES[variant];
  const currentRaster = useMemo(
    () => renderRunnerPoseToRaster({ pose: currentPose, palette, pixelScale: gaitConfig.pixelScale, personaId }),
    [currentPose, palette, gaitConfig.pixelScale, personaId, photorealStatus],
  );
  const previousRaster = useMemo(
    () => renderRunnerPoseToRaster({ pose: previousPose, palette, pixelScale: gaitConfig.pixelScale, personaId }),
    [previousPose, palette, gaitConfig.pixelScale, personaId, photorealStatus],
  );
  const filmstripCards = useMemo(
    () => buildFilmstripCards(variant, currentPose.canonicalFrameIndex, personaId),
    [variant, currentPose.canonicalFrameIndex, personaId],
  );
  const poseSummary = useMemo(() => buildFormattedPoseSummary(currentPose), [currentPose]);
  const sliderLabels = useMemo(
    () => buildFormattedSliderLabels(phase, gaitConfig),
    [phase, gaitConfig],
  );
  const partReadouts = useMemo(() => buildArticulatedPartReadouts(currentPose, personaId), [currentPose, personaId]);
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

export function useRunnerStudio() {
  const [activeTab, setActiveTab] = useState<StudioTabId>('all-in-one');
  const [personaId, setPersonaId] = useState<RunnerPersonaId>('photo-sg-chinese-female');
  const [variant, setVariant] = useState<RunnerVariantId>('red');
  const [backdrop, setBackdrop] = useState<BackdropVariantId>('stadium-day');
  const [gaitConfig, setGaitConfig] = useState<GaitConfig>(DEFAULT_GAIT_CONFIG);
  const photorealStatus = usePhotorealRigAssets();
  const playback = usePlaybackPhase(gaitConfig.cadenceHz);
  const overlays = useOverlayControls();
  const diagnostics = useDiagnosticsData();
  const derived = useDerivedRunnerModels({
    phase: playback.phase, variant, personaId, gaitConfig, photorealStatus,
  });

  const selectCanonicalFrame = (idx: number) => {
    playback.setPlaybackMode('paused');
    playback.setPhase(normalizePhase(idx / 8));
  };
  const stepFrame = (delta: number) =>
    selectCanonicalFrame((derived.currentPose.canonicalFrameIndex + delta + 8) % 8);
  const updateGaitParameter = <K extends keyof GaitConfig>(key: K, value: GaitConfig[K]) =>
    setGaitConfig((prev) => ({ ...prev, [key]: value }));
  const activeExtractedFrameUrl =
    derived.filmstripCards[derived.currentPose.canonicalFrameIndex]?.extractedUrl ??
    `/sprites/extracted/${variant}/frame-01.png`;

  return {
    activeTab, setActiveTab, personaId, setPersonaId,
    playbackMode: playback.playbackMode, togglePlayback: playback.togglePlayback,
    phase: playback.phase, scrubPhase: playback.scrubPhase, stepFrame, selectCanonicalFrame,
    variant, setVariant, backdrop, setBackdrop, gaitConfig, updateGaitParameter,
    activeExtractedFrameUrl, ...overlays, ...derived, ...diagnostics,
  };
}
