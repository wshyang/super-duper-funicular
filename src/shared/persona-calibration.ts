import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface Point2 {
  readonly x: number;
  readonly y: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface PartCalibration {
  readonly partId: string;
  readonly kind: 'head' | 'neck' | 'torso' | 'pelvis' | 'arm' | 'hand' | 'leg' | 'foot' | 'hair';
  readonly window: Rect;
  readonly srcProximal: Point2;
  readonly dstProximal: Point2;
  readonly srcDistal?: Point2;
  readonly dstDistal?: Point2;
  readonly scale?: number;
  readonly capRadius: number;
  readonly luminanceBand?: readonly [number, number];
  readonly expectedLowestRow?: number;
  readonly orientationProbe?: { readonly front: Rect; readonly back: Rect };
  readonly subtractOccluders?: readonly string[];
}

export interface PersonaCalibrationV1 {
  readonly schema: 'persona-calibration.v1';
  readonly personaId: string;
  readonly bodyPlanId: string;
  readonly masterPose: string;
  readonly revision: number;
  readonly provenance: {
    readonly masterSha256: string;
    readonly masterPath: string;
    readonly promptLogRefs: string;
    readonly measuredBy: string;
  };
  readonly groundY: number;
  readonly stripeOwner: string;
  readonly landmarks: Record<string, Point2>;
  readonly boneLengthsPx: Record<string, number>;
  readonly planRatios: { readonly armLeg: readonly [number, number] };
  readonly parts: PartCalibration[];
}

export function validatePersonaCalibration(record: PersonaCalibrationV1): string[] {
  const errors: string[] = [];
  if (record.schema !== 'persona-calibration.v1') errors.push('schema must be persona-calibration.v1');
  if (!record.personaId) errors.push('personaId required');
  if (!record.bodyPlanId) errors.push('bodyPlanId required');
  if (!Number.isInteger(record.revision) || record.revision < 1) errors.push('revision must be a positive integer');
  if (!/^[0-9a-f]{64}$/.test(record.provenance.masterSha256)) errors.push('provenance.masterSha256 must be 64 hex chars');
  if (record.parts.length === 0) errors.push('parts must not be empty');
  for (const part of record.parts) {
    if (part.window.w <= 0 || part.window.h <= 0) errors.push(`${part.partId}: window must be positive`);
    if (part.capRadius <= 0) errors.push(`${part.partId}: capRadius must be positive`);
    const hasDistal = part.srcDistal !== undefined && part.dstDistal !== undefined;
    const hasScale = part.scale !== undefined;
    if (!hasDistal && !hasScale) errors.push(`${part.partId}: needs srcDistal+dstDistal or scale`);
  }
  record.parts.forEach((part, index) => {
    for (const occluder of part.subtractOccluders ?? []) {
      const earlier = record.parts.slice(0, index).some((prior) => prior.partId === occluder);
      if (!earlier) errors.push(`${part.partId}: occluder ${occluder} must be cut earlier (parts order is front-to-back)`);
    }
  });
  return errors;
}

export function loadPersonaCalibration(rootDir: string, personaId: string): PersonaCalibrationV1 {
  const path = join(rootDir, 'src', 'shared', 'personas', `${personaId}.json`);
  const record = JSON.parse(readFileSync(path, 'utf8')) as PersonaCalibrationV1;
  const errors = validatePersonaCalibration(record);
  if (errors.length > 0) throw new Error(`invalid calibration ${personaId}: ${errors.join('; ')}`);
  return record;
}
