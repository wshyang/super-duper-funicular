import { useCallback, useState } from 'react';
import type { BodyPartId, GaitSettings, PaletteId } from '../../shared/types.ts';
import { DEFAULT_GAIT } from '../../shared/constants.ts';
import { useAnimationClock, type AnimationClock } from './useAnimationClock.ts';
import { useSpriteData, type SpriteData } from './useSpriteData.ts';
import { useExports, type ExportController } from './useExports.ts';
import { useCalibration, type CalibrationState } from './useCalibration.ts';

export type TabId = 'studio' | 'inspector' | 'diagnostics' | 'gallery' | 'vectors' | 'parity';
export type OverlayKey = 'skeleton' | 'ground' | 'onion' | 'compare';
export type Overlays = Readonly<Record<OverlayKey, boolean>>;

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const INITIAL_OVERLAYS: Overlays = { skeleton: false, ground: true, onion: false, compare: true };

export interface Workspace {
  readonly settings: GaitSettings;
  readonly tab: TabId;
  readonly overlays: Overlays;
  readonly selectedPart: BodyPartId | 'all';
  readonly galleryPalette: PaletteId;
  readonly lightboxUrl: string | null;
  readonly clock: AnimationClock;
  readonly sprite: SpriteData;
  readonly exports: ExportController;
  readonly calibration: CalibrationState;
  readonly setTab: (tab: TabId) => void;
  readonly update: (patch: Partial<GaitSettings>) => void;
  readonly reset: () => void;
  readonly toggleOverlay: (key: OverlayKey) => void;
  readonly selectPart: (part: BodyPartId | 'all') => void;
  readonly setGalleryPalette: (palette: PaletteId) => void;
  readonly openLightbox: (url: string) => void;
  readonly closeLightbox: () => void;
}

interface SelectionState {
  readonly settings: GaitSettings;
  readonly galleryPalette: PaletteId;
  readonly update: (patch: Partial<GaitSettings>) => void;
  readonly reset: () => void;
  readonly setGalleryPalette: (palette: PaletteId) => void;
}

/** Settings + gallery selection move together: choosing a colourway updates both. */
const useSelection = (): SelectionState => {
  const [settings, setSettings] = useState<GaitSettings>(DEFAULT_GAIT);
  const [galleryPalette, setGalleryPalette] = useState<PaletteId>(DEFAULT_GAIT.palette);
  const update = useCallback((patch: Partial<GaitSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
    if (patch.palette) setGalleryPalette(patch.palette);
  }, []);
  const reset = useCallback(() => {
    setSettings(DEFAULT_GAIT);
    setGalleryPalette(DEFAULT_GAIT.palette);
  }, []);
  return { settings, galleryPalette, update, reset, setGalleryPalette };
};

/** The single place this screen's state transitions live; components only render. */
export const useWorkspace = (): Workspace => {
  const { settings, galleryPalette, update, reset, setGalleryPalette } = useSelection();
  const [tab, setTab] = useState<TabId>('studio');
  const [overlays, setOverlays] = useState<Overlays>(INITIAL_OVERLAYS);
  const [selectedPart, setSelectedPart] = useState<BodyPartId | 'all'>('all');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [reducedMotion] = useState(prefersReducedMotion);

  const sprite = useSpriteData();
  const clock = useAnimationClock({ cadence: settings.cadence, initialPlaying: !reducedMotion });
  const calibration = useCalibration();
  const exports = useExports(settings, calibration.calibration);

  const toggleOverlay = useCallback((key: OverlayKey) => {
    setOverlays((current) => ({ ...current, [key]: !current[key] }));
  }, []);

  const selectPart = useCallback((part: BodyPartId | 'all') => setSelectedPart(part), []);
  const openLightbox = useCallback((url: string) => setLightboxUrl(url), []);
  const closeLightbox = useCallback(() => setLightboxUrl(null), []);

  return {
    settings,
    tab,
    overlays,
    selectedPart,
    galleryPalette,
    lightboxUrl,
    clock,
    sprite,
    exports,
    calibration,
    setTab,
    update,
    reset,
    toggleOverlay,
    selectPart,
    setGalleryPalette,
    openLightbox,
    closeLightbox,
  };
};
