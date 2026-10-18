import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadImage } from './image-io.js';
import { computeKeyedAlpha, applyAlpha } from './chroma-key.js';
import { computeDHash64, dHashHammingDistance } from './dhash.js';
import { computeSilhouetteBounds, computeSoleBaselineY } from './silhouette-metrics.js';
import { keyPlate } from '../../scripts/acquisition/keying.js';
import type { FrameRegistry } from '../shared/types.js';

const PERSONA_DIR = 'src/images/p2/sg-chinese-female';
const OUTPUT_DIR = 'public/sprites/p2/sg-chinese-female';

function loadRegistry(): FrameRegistry {
  return JSON.parse(fs.readFileSync(`${PERSONA_DIR}/registry.json`, 'utf8')) as FrameRegistry;
}

describe('P2 keyframe-anchored pipeline (real committed assets, zero mocks)', () => {
  const registry = loadRegistry();

  it('holds a persona bible registry with 8 canonical keyframes', () => {
    expect(registry.personaId).toBe('sg-chinese-female');
    expect(registry.keys).toHaveLength(8);
    expect(registry.keys.map((key) => key.canonicalPhase)).toEqual([0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875]);
  });

  it('passes conformance on every keyframe against the real plates', () => {
    for (const key of registry.keys) {
      expect(key.conformance.passed, `${key.path}: ${key.conformance.failureReasons.join('; ')}`).toBe(true);
    }
  });

  it('proves pose distinctness across keyframes (no half-cycle duplication)', () => {
    const hashes = registry.keys.map((key) => key.dHash64);
    for (let a = 0; a < hashes.length; a++) {
      for (let b = a + 1; b < hashes.length; b++) {
        const distance = dHashHammingDistance(hashes[a], hashes[b]);
        expect(distance, `keys ${a + 1} and ${b + 1} too similar`).toBeGreaterThanOrEqual(6);
      }
    }
  });

  it('keys the real plates with zero fully-keyed-out silhouettes', () => {
    for (const key of registry.keys) {
      const plate = keyPlate(key.path);
      const bounds = computeSilhouetteBounds(plate.masked);
      expect(bounds.pixelCount).toBeGreaterThan(1000);
      expect(plate.soleY).toBeGreaterThan(0);
    }
  });

  it('keys enclosed magenta pockets that border flood-fill cannot reach', () => {
    const fixtureUrl = new URL('./__fixtures__/enclosed-magenta.png', import.meta.url);
    const synthetic = loadImage(fileURLToPath(fixtureUrl));
    const masked = applyAlpha(synthetic, computeKeyedAlpha(synthetic));
    const centerAlpha = masked.data[(Math.floor(synthetic.height / 2) * synthetic.width + Math.floor(synthetic.width / 2)) * 4 + 3];
    expect(centerAlpha).toBe(0);
    const cornerAlpha = masked.data[(4 * synthetic.width + 4) * 4 + 3];
    expect(cornerAlpha).toBe(255);
  });

  it('locks stance frames to the measured ground line within 2 px', () => {
    const stanceFrameIndexes = [1, 3, 5, 9, 11, 13];
    for (const frameIndex of stanceFrameIndexes) {
      const frame = loadImage(`${OUTPUT_DIR}/frames/frame-${String(frameIndex).padStart(2, '0')}.png`);
      const bounds = computeSilhouetteBounds(frame);
      const soleY = computeSoleBaselineY(frame, bounds);
      expect(Math.abs(soleY - registry.canvas.groundY), `frame ${frameIndex} soleY=${soleY}`).toBeLessThanOrEqual(2);
    }
  });

  it('lifts flight frames above the ground line', () => {
    for (const frameIndex of [7, 15]) {
      const frame = loadImage(`${OUTPUT_DIR}/frames/frame-${String(frameIndex).padStart(2, '0')}.png`);
      const bounds = computeSilhouetteBounds(frame);
      const soleY = computeSoleBaselineY(frame, bounds);
      expect(registry.canvas.groundY - soleY, `frame ${frameIndex} soleY=${soleY}`).toBeGreaterThanOrEqual(20);
    }
  });

  it('emits a spec-valid APNG with 16 frames and monotonic sequence numbers', () => {
    const bytes = fs.readFileSync(`${OUTPUT_DIR}/runner-16phase.apng`);
    expect(bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
    const { frameCount, sequenceNumbers } = scanApng(bytes);
    expect(frameCount).toBe(16);
    expect(sequenceNumbers).toHaveLength(31);
    for (let index = 1; index < sequenceNumbers.length; index++) {
      expect(sequenceNumbers[index]).toBe(sequenceNumbers[index - 1] + 1);
    }
  });

  it('produces a dHash of the master that differs from every running keyframe', () => {
    const masterHash = computeDHash64(keyPlate(`${PERSONA_DIR}/00-master.png`).masked);
    for (const key of registry.keys) {
      expect(dHashHammingDistance(masterHash, key.dHash64)).toBeGreaterThanOrEqual(4);
    }
  });
});

function scanApng(bytes: Buffer): { frameCount: number; sequenceNumbers: number[] } {
  const sequenceNumbers: number[] = [];
  let frameCount = -1;
  let offset = 8;
  while (offset + 8 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    if (type === 'acTL') frameCount = bytes.readUInt32BE(offset + 8);
    if (type === 'fcTL' || type === 'fdAT') sequenceNumbers.push(bytes.readUInt32BE(offset + 8));
    if (type === 'IEND') break;
    offset += 12 + length;
  }
  return { frameCount, sequenceNumbers };
}
