import { CANVAS } from '../shared/constants.ts';
import type { Persona } from '../shared/types.ts';

/** Anthropometric rig metrics in canonical canvas pixels (240 x 300). */
export interface RigMetrics {
  readonly thigh: number;
  readonly shin: number;
  readonly ankleHeight: number;
  readonly torso: number;
  readonly neck: number;
  readonly headRadiusX: number;
  readonly headRadiusY: number;
  readonly upperArm: number;
  readonly forearm: number;
  readonly handRadius: number;
  readonly hipCenterY: number;
  readonly hipWidth: number;
  readonly pelvisHeight: number;
  readonly shoulderDrop: number;
  readonly footLength: number;
  readonly nearLimbWidth: number;
  readonly farLimbWidth: number;
}

const BASE_RIG = {
  thigh: 82,
  shin: 80,
  ankleHeight: 15,
  torso: 74,
  neck: 19,
  headRadiusX: 18.5,
  headRadiusY: 21.5,
  upperArm: 53,
  forearm: 46,
  handRadius: 7.6,
  hipCenterY: 154,
  hipWidth: 19,
  pelvisHeight: 31,
  shoulderDrop: 13,
  footLength: 31,
  nearLimbWidth: 10.4,
  farLimbWidth: 9.7,
} as const;

/**
 * The rig keeps the figure inside the canvas with a margin: hip height is the
 * standing height at a natural (not locked) knee bend, and the upper body is
 * sized against the remaining headroom.
 */
export const rigForPersona = (persona: Persona): RigMetrics => {
  const scale = persona.scale;
  return {
    ...BASE_RIG,
    thigh: BASE_RIG.thigh * scale,
    shin: BASE_RIG.shin * scale,
    torso: BASE_RIG.torso * scale,
    neck: BASE_RIG.neck * scale,
    upperArm: BASE_RIG.upperArm * scale,
    forearm: BASE_RIG.forearm * scale,
    hipWidth: BASE_RIG.hipWidth * scale,
    pelvisHeight: BASE_RIG.pelvisHeight * scale,
    hipCenterY:
      CANVAS.groundY - BASE_RIG.ankleHeight - (BASE_RIG.thigh + BASE_RIG.shin) * 0.97 * scale,
  };
};
