import type { MotionId, PersonaId, Pose } from '../../shared/types.ts';
import { MOTION_PROFILES, PERSONAS } from '../../lib/rig/body.ts';
import { solvePose } from '../../lib/gait/pose.ts';
import { fract } from '../../lib/geometry/vec.ts';
import type { Transform } from '../../lib/render/paint-ops.ts';

export interface StageSettings {
  readonly motion: MotionId;
  readonly persona: PersonaId;
  readonly speed: number;
  readonly playing: boolean;
  readonly phase: number;
  readonly skeleton: boolean;
  readonly onion: boolean;
}

export const DEFAULT_SETTINGS: StageSettings = {
  motion: 'run',
  persona: 'wei-ming',
  speed: 1,
  playing: true,
  phase: 0,
  skeleton: false,
  onion: false,
};

export const SPEEDS = [0.25, 0.5, 1, 2] as const;
export const PHASE_STEPS = 8;

export const withMotion = (s: StageSettings, motion: MotionId): StageSettings => ({ ...s, motion });
export const withPersona = (s: StageSettings, persona: PersonaId): StageSettings => ({ ...s, persona });
export const withSpeed = (s: StageSettings, speed: number): StageSettings => ({ ...s, speed });
export const withPhase = (s: StageSettings, phase: number): StageSettings => ({ ...s, phase: fract(phase) });
export const togglePlaying = (s: StageSettings): StageSettings => ({ ...s, playing: !s.playing });
export const toggleSkeleton = (s: StageSettings): StageSettings => ({ ...s, skeleton: !s.skeleton });
export const toggleOnion = (s: StageSettings): StageSettings => ({ ...s, onion: !s.onion });
export const resetSettings = (s: StageSettings): StageSettings => ({ ...DEFAULT_SETTINGS, persona: s.persona });

export const stepPhase = (s: StageSettings, direction: 1 | -1): StageSettings =>
  withPhase(s, s.phase + direction / PHASE_STEPS);

/** Real-time advance: cadence steps/min ⇒ cycles/s = cadence/120. */
export function advancePhase(s: StageSettings, deltaSeconds: number): StageSettings {
  if (!s.playing) return s;
  const cyclesPerSecond = MOTION_PROFILES[s.motion].cadenceStepsPerMin / 120;
  return withPhase(s, s.phase + deltaSeconds * cyclesPerSecond * s.speed);
}

export const poseFor = (s: StageSettings): Pose => solvePose(s.phase, MOTION_PROFILES[s.motion]);

export const personaOf = (s: StageSettings) => PERSONAS[s.persona];
export const profileOf = (s: StageSettings) => MOTION_PROFILES[s.motion];

export function supportLabel(pose: Pose): string {
  switch (pose.support) {
    case 'near-stance':
      return 'Near foot supported';
    case 'far-stance':
      return 'Far foot supported';
    case 'double-support':
      return 'Double support';
    case 'flight':
      return 'Flight (airborne)';
  }
}

export const phaseLabel = (pose: Pose): string => `φ ${pose.phase.toFixed(3)} · ${pose.motion}`;

/** Rig space (ground y=0) → pixel space for a canvas of the given size. */
export function viewTransform(width: number, height: number): Transform {
  return { scale: Math.min(width / 160, height / 150), offsetX: width / 2, offsetY: height * 0.84 };
}

export const onionPhasesFor = (s: StageSettings): number[] =>
  s.onion ? [-2, -1, 1, 2].map((k) => fract(s.phase + k / 8)) : [];
