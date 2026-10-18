import fs from 'node:fs';
import crypto from 'node:crypto';
import { keyPlate, contactClassForPhase, minimumHamming, type KeyedPlate } from './acquisition/keying.js';
import type { CanvasSpec, FrameRegistry, KeyframeRecord } from '../src/shared/types.js';

const PERSONA_DIR = 'src/images/p2/sg-chinese-female';
const CANVAS: CanvasSpec = { widthPx: 256, heightPx: 320, groundY: 290 };
const KEY_PHASES = [0.0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875];
const HEIGHT_FRACTION_WINDOW = [0.4, 0.92] as const;
const WIDTH_RATIO_WINDOW = [0.22, 0.8] as const;
const MIN_DISTINCT_HASH_BITS = 6;

function keyPath(index: number, phase: number): string {
  return `${PERSONA_DIR}/key-${String(index + 1).padStart(2, '0')}-phi-${String(Math.round(phase * 1000)).padStart(3, '0')}.png`;
}

function buildKeyRecord(index: number, phase: number, plates: readonly KeyedPlate[]): KeyframeRecord {
  const plate = plates[index];
  const others = plates.filter((_, otherIndex) => otherIndex !== index).map((other) => other.dHash);
  const minHamming = Math.round(minimumHamming(plate.dHash, others));
  const reasons = collectFailureReasons(plate, minHamming);
  return {
    path: keyPath(index, phase),
    kind: 'key',
    canonicalPhase: phase,
    widthPx: plate.masked.width,
    heightPx: plate.masked.height,
    pixelSha256: crypto.createHash('sha256').update(fs.readFileSync(keyPath(index, phase))).digest('hex'),
    dHash64: plate.dHash,
    conformance: {
      heightFraction: round(plate.heightFraction),
      widthFraction: round(plate.widthFraction),
      minDHashHammingToOthers: minHamming,
      soleBaselineYInPlate: plate.soleY,
      contactClass: contactClassForPhase(phase),
      passed: reasons.length === 0,
      failureReasons: reasons,
    },
  };
}

function collectFailureReasons(plate: KeyedPlate, minHamming: number): string[] {
  const reasons: string[] = [];
  const aspect = plate.widthFraction / plate.heightFraction;
  if (plate.heightFraction < HEIGHT_FRACTION_WINDOW[0] || plate.heightFraction > HEIGHT_FRACTION_WINDOW[1]) {
    reasons.push(`heightFraction ${round(plate.heightFraction)} outside window`);
  }
  if (aspect < WIDTH_RATIO_WINDOW[0] || aspect > WIDTH_RATIO_WINDOW[1]) {
    reasons.push(`aspect ratio ${round(aspect)} outside window`);
  }
  if (minHamming < MIN_DISTINCT_HASH_BITS) {
    reasons.push(`pose too similar to another key (min hamming ${minHamming})`);
  }
  return reasons;
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function buildRegistry(plates: readonly KeyedPlate[], master: KeyedPlate): FrameRegistry {
  return {
    personaId: 'sg-chinese-female',
    canvas: CANVAS,
    masterPath: `${PERSONA_DIR}/00-master.png`,
    masterHeightFraction: round(master.heightFraction),
    keys: KEY_PHASES.map((phase, index) => buildKeyRecord(index, phase, plates)),
    generatedAtUtc: new Date().toISOString(),
  };
}

function main(): void {
  const startedAt = Date.now();
  const master = keyPlate(`${PERSONA_DIR}/00-master.png`);
  const plates = KEY_PHASES.map((phase, index) => keyPlate(keyPath(index, phase)));
  const registry = buildRegistry(plates, master);
  fs.writeFileSync(`${PERSONA_DIR}/registry.json`, JSON.stringify(registry, null, 2));
  for (const key of registry.keys) {
    const { heightFraction, minDHashHammingToOthers, contactClass, passed, failureReasons } = key.conformance;
    console.log(`[conform] phi=${key.canonicalPhase.toFixed(3)} hf=${heightFraction} hamming=${minDHashHammingToOthers} class=${contactClass} passed=${passed}${failureReasons.length > 0 ? ` reasons=${failureReasons.join('; ')}` : ''}`);
  }
  const passedCount = registry.keys.filter((key) => key.conformance.passed).length;
  console.log(`[conform] ${passedCount}/${registry.keys.length} keyframes conformant; master heightFraction=${registry.masterHeightFraction} (${Date.now() - startedAt}ms)`);
  if (passedCount < registry.keys.length) process.exitCode = 2;
}

main();
