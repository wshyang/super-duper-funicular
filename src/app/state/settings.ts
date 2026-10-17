import { COLORWAYS, type Colorway } from "../../lib/rig/palette.ts";
import { findRunnerOption, lookFor, type SpriteLook } from "../../lib/rig/persona.ts";
import { DEFAULT_CONTROLS, GAIT_LIMITS, type GaitControls } from "../../lib/gait/gait.ts";

export interface DisplayOptions {
  readonly showSkeleton: boolean;
  readonly showTrail: boolean;
  readonly showShadow: boolean;
  readonly showGroundMarkers: boolean;
}

export interface AppSettings {
  readonly personaId: string;
  readonly colorwayId: string;
  readonly gait: GaitControls;
  readonly display: DisplayOptions;
  readonly playbackRate: number;
  readonly paused: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  personaId: "sg-chinese-male",
  colorwayId: "red",
  gait: DEFAULT_CONTROLS,
  display: {
    showSkeleton: false,
    showTrail: true,
    showShadow: true,
    showGroundMarkers: true,
  },
  playbackRate: 1,
  paused: false,
};

export const PLAYBACK_LIMITS = { min: 0.05, max: 1.5 } as const;

export type Listener = (settings: AppSettings) => void;

export interface SettingsStore {
  get(): AppSettings;
  update(change: (current: AppSettings) => AppSettings): void;
  subscribe(listener: Listener): () => void;
}

/** A single immutable settings object behind a function boundary. */
export function createSettingsStore(initial: AppSettings = DEFAULT_SETTINGS): SettingsStore {
  let current = initial;
  const listeners = new Set<Listener>();
  return {
    get: () => current,
    update: (change) => {
      const next = change(current);
      if (next === current) return;
      current = next;
      listeners.forEach((listener) => listener(current));
    },
    subscribe: (listener) => {
      listeners.add(listener);
      listener(current);
      return () => listeners.delete(listener);
    },
  };
}

/** Personas carry their own default kit, so switching one is visibly different. */
export const withPersona = (settings: AppSettings, personaId: string): AppSettings => {
  const persona = findRunnerOption(personaId);
  return {
    ...settings,
    personaId,
    colorwayId: persona.kind === "vector" ? persona.skin.defaultColorwayId : settings.colorwayId,
  };
};

/** Photo personas render from a bitmap rig; the vector look would throw. */
export const isPhotoSettings = (settings: AppSettings): boolean =>
  findRunnerOption(settings.personaId).kind === "photo";

export const colorwayFor = (settings: AppSettings): Colorway =>
  COLORWAYS.find((candidate) => candidate.id === settings.colorwayId) ?? (COLORWAYS[0] as Colorway);

export const lookForSettings = (settings: AppSettings): SpriteLook =>
  lookFor(settings.personaId, settings.colorwayId);

export const withGaitValue = (
  settings: AppSettings,
  key: keyof GaitControls,
  value: number,
): AppSettings => ({
  ...settings,
  gait: { ...settings.gait, [key]: clampToLimits(key, value) },
});

function clampToLimits(key: keyof GaitControls, value: number): number {
  const limits = GAIT_LIMITS[key];
  return Math.min(limits.max, Math.max(limits.min, value));
}
