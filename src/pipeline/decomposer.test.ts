import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildCutoutContext, masterRatioCheck } from '../../scripts/decompose-and-bake.ts';
import { decodePngBuffer, sha256Buffer, sha256Image } from './image-io.ts';
import { decomposeMaster } from './decomposer.ts';
import { buildGoldenManifest } from './golden-baker.ts';
import { contractPassed, evaluatePartContract } from './part-contract.ts';
import { loadPersonaCalibration } from '../shared/persona-calibration.ts';

const ROOT = new URL('../..', import.meta.url).pathname;
const PERSONA = 'photo-sg-chinese-female';

function loadMaster() {
  const record = loadPersonaCalibration(ROOT, PERSONA);
  const buffer = readFileSync(join(ROOT, record.provenance.masterPath));
  return { record, buffer, master: decodePngBuffer(buffer) };
}

describe('Single-master deterministic decomposer (real asset)', () => {
  it('files the master under the recorded SHA-256', () => {
    const { record, buffer } = loadMaster();
    expect(sha256Buffer(buffer)).toBe(record.provenance.masterSha256);
  });

  it('keeps the measured arm/leg ratio inside the body-plan table (PC-10 data)', () => {
    const { record } = loadMaster();
    const ratio = masterRatioCheck(record);
    expect(ratio.measured).toBeGreaterThanOrEqual(ratio.min);
    expect(ratio.measured).toBeLessThanOrEqual(ratio.max);
  });

  it('is byte-deterministic across runs (PC-12)', () => {
    const { record, master } = loadMaster();
    const first = decomposeMaster(master, record).parts;
    const second = decomposeMaster(master, record).parts;
    for (const id of Object.keys(first)) {
      expect(sha256Image(second[id] as never), id).toBe(sha256Image(first[id] as never));
    }
  });

  it('passes the Part Contract for every decomposed part', () => {
    const { record, master } = loadMaster();
    const { parts, occluderCanvases } = decomposeMaster(master, record);
    for (const part of record.parts) {
      const cutout = parts[part.partId];
      if (cutout === undefined) throw new Error(`missing ${part.partId}`);
      const ctx = buildCutoutContext(master, record, part, parts, occluderCanvases[part.partId]);
      const checks = evaluatePartContract(cutout, ctx);
      const failed = checks.filter((c) => c.applicable && !c.passed);
      expect(failed, `${part.partId}: ${failed.map((f) => f.pcId).join(',')}`).toEqual([]);
      expect(contractPassed(checks)).toBe(true);
    }
  });

  it('matches the committed golden manifest (regression baseline)', () => {
    const { record, master } = loadMaster();
    const { parts } = decomposeMaster(master, record);
    const manifest = buildGoldenManifest(PERSONA, record.provenance.masterSha256, record.revision, parts);
    const committed = JSON.parse(readFileSync(join(ROOT, 'docs', 'audit-golden', PERSONA, 'golden-manifest.json'), 'utf8'));
    expect(manifest).toEqual(committed);
  });
});
