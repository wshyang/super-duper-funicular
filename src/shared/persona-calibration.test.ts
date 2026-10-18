import { describe, expect, it } from 'vitest';
import { loadPersonaCalibration, validatePersonaCalibration, type PersonaCalibrationV1 } from './persona-calibration.ts';

const ROOT = new URL('../..', import.meta.url).pathname;

function loadValid(): PersonaCalibrationV1 {
  return loadPersonaCalibration(ROOT, 'photo-sg-chinese-female');
}

describe('persona-calibration.v1 schema & loader', () => {
  it('loads the committed athletic record without errors', () => {
    const record = loadValid();
    expect(validatePersonaCalibration(record)).toEqual([]);
    expect(record.parts.length).toBe(11);
    expect(record.provenance.masterSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('rejects a wrong schema tag', () => {
    const record = { ...loadValid(), schema: 'persona-calibration.v0' } as unknown as PersonaCalibrationV1;
    expect(validatePersonaCalibration(record)).toContain('schema must be persona-calibration.v1');
  });

  it('rejects parts without a scale source', () => {
    const record = loadValid();
    const broken: PersonaCalibrationV1 = {
      ...record,
      parts: record.parts.map((part) => (part.partId === 'head' ? { ...part, scale: undefined, srcDistal: undefined, dstDistal: undefined } : part)),
    };
    expect(validatePersonaCalibration(broken).join('; ')).toContain('head: needs srcDistal+dstDistal or scale');
  });

  it('rejects occluders that are cut later than the part that subtracts them', () => {
    const record = loadValid();
    const broken: PersonaCalibrationV1 = {
      ...record,
      parts: record.parts.map((part) => (part.partId === 'nearHand' ? { ...part, subtractOccluders: ['pelvis'] } : part)),
    };
    expect(validatePersonaCalibration(broken).join('; ')).toContain('occluder pelvis must be cut earlier');
  });

  it('rejects a malformed master hash', () => {
    const record = loadValid();
    const broken: PersonaCalibrationV1 = { ...record, provenance: { ...record.provenance, masterSha256: 'nope' } };
    expect(validatePersonaCalibration(broken).join('; ')).toContain('masterSha256');
  });
});
