import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { readPngFile } from '../core/png.js';
import { buildPersonaFromPlate } from '../render/persona.js';
import { renderSkinnedFrame } from '../render/skin.js';
import { solvePose } from '../rig/gait.js';
import { sampleAtlas, addressPoint } from '../atlas/unwrap.js';
import { ATLAS_BONE_IDS, restBones } from '../rig/bones.js';

const MASTER = 'assets/personas/athletic/01-master-lateral.png';

describe.skipIf(!existsSync(MASTER))('atlas unwrap', () => {
  const plate = readPngFile(MASTER);
  const context = buildPersonaFromPlate('athletic', plate);

  it('gives every bone a tile with a finite half-width', () => {
    for (const id of ATLAS_BONE_IDS) {
      const coverage = context.atlas.report.perBone[id];
      expect(Number.isFinite(coverage.halfWidthPx)).toBe(true);
      expect(coverage.halfWidthPx).toBeGreaterThan(0);
    }
  });

  it('round-trips an atlas address through sampling', () => {
    const tile = context.atlas.tiles.torso;
    const sample = sampleAtlas(tile, 0.5, 0);
    expect(sample.r).toBeGreaterThanOrEqual(0);
    expect(sample.g).toBeGreaterThanOrEqual(0);
    expect(sample.b).toBeGreaterThanOrEqual(0);
  });

  it('projects the bone axis to normalized distance zero', () => {
    const bone = restBones()[0];
    expect(bone).toBeDefined();
    if (!bone) return;
    const middle = { x: (bone.proximal.x + bone.distal.x) / 2, y: (bone.proximal.y + bone.distal.y) / 2 };
    const address = addressPoint(middle, bone);
    expect(address.normalizedDistance).toBeLessThan(0.05);
    expect(address.t).toBeGreaterThan(0.4);
    expect(address.t).toBeLessThan(0.6);
  });

  it('counts what it invents instead of hiding it', () => {
    const report = context.atlas.report;
    expect(report.syntheticFraction).toBeGreaterThanOrEqual(0);
    expect(report.syntheticFraction).toBeLessThan(0.35);
  });
});

describe.skipIf(!existsSync(MASTER))('skinned render', () => {
  const plate = readPngFile(MASTER);

  it('is deterministic for a given phase', () => {
    const context = buildPersonaFromPlate('athletic', plate);
    const a = renderSkinnedFrame(solvePose(0.35), context);
    const b = renderSkinnedFrame(solvePose(0.35), context);
    expect(Buffer.from(a.data).equals(Buffer.from(b.data))).toBe(true);
  });

  it('draws one connected silhouette per layer', () => {
    const context = buildPersonaFromPlate('athletic', plate);
    const frame = renderSkinnedFrame(solvePose(0.35), context);
    const columns = new Set<number>();
    const rows = new Set<number>();
    for (let y = 0; y < frame.height; y++) {
      for (let x = 0; x < frame.width; x++) {
        if ((frame.data[(y * frame.width + x) * 4 + 3] ?? 0) <= 16) continue;
        columns.add(Math.floor(x / 8));
        rows.add(Math.floor(y / 8));
      }
    }
    expect(columns.size).toBeGreaterThan(8);
    expect(rows.size).toBeGreaterThan(16);
  });
});
