import fs from 'node:fs';
import { loadImage, saveImage } from '../src/pipeline/image-io.js';
import { composeFrameAtPhase, renderKeyToCanvas, cloneImage } from '../src/pipeline/composer.js';
import { buildContactSheet } from '../src/pipeline/contact-sheet.js';
import { buildHorizontalStrip } from '../src/pipeline/spritesheet.js';
import { encodeApng } from '../src/pipeline/apng.js';
import { computeSilhouetteBounds, computeSoleBaselineY } from '../src/pipeline/silhouette-metrics.js';
import { keyPlate } from './acquisition/keying.js';
import type { CanvasSpec, ComposedFrameRecord, FrameRegistry, KeyframeRecord, RasterImage } from '../src/shared/types.js';

const PERSONA_DIR = 'src/images/p2/sg-chinese-female';
const OUTPUT_DIR = 'public/sprites/p2/sg-chinese-female';
const OUTPUT_PHASES = Array.from({ length: 16 }, (_, index) => index / 16);

function loadRegistry(): FrameRegistry {
  return JSON.parse(fs.readFileSync(`${PERSONA_DIR}/registry.json`, 'utf8')) as FrameRegistry;
}

function renderAllKeys(registry: FrameRegistry): Map<number, RasterImage> {
  const rendered = new Map<number, RasterImage>();
  for (const key of registry.keys) {
    const plate = keyPlate(key.path);
    rendered.set(
      key.canonicalPhase,
      renderKeyToCanvas(key, plate.masked, plate.soleY, plate.centroidX, registry.canvas),
    );
  }
  return rendered;
}

function composeAllPhases(registry: FrameRegistry, rendered: ReadonlyMap<number, RasterImage>): { image: RasterImage; record: ComposedFrameRecord }[] {
  return OUTPUT_PHASES.map((phase) => {
    const composed = composeFrameAtPhase(phase, registry.keys, registry.masterHeightFraction, rendered, registry.canvas);
    return composed;
  });
}

function writeFrames(composed: readonly { image: RasterImage; record: ComposedFrameRecord }[]): void {
  composed.forEach((frame, index) => {
    saveImage(`${OUTPUT_DIR}/frames/frame-${String(index + 1).padStart(2, '0')}.png`, frame.image);
  });
}

function measureGroundAdherence(composed: readonly { image: RasterImage; record: ComposedFrameRecord }[], canvas: CanvasSpec): unknown[] {
  return composed.map((frame, index) => {
    const bounds = computeSilhouetteBounds(frame.image);
    const soleY = bounds.pixelCount === 0 ? -1 : computeSoleBaselineY(frame.image, bounds);
    return {
      frameIndex: index + 1,
      phase: frame.record.phase,
      soleY,
      groundDeltaPx: soleY - canvas.groundY,
      liftPx: Math.round(frame.record.liftPx),
      baseKeyPhase: frame.record.baseKeyPhase,
      blendKeyPhase: frame.record.blendKeyPhase,
      blendWeight: Math.round(frame.record.blendWeight * 1000) / 1000,
    };
  });
}

function orderedRenderedKeys(registry: FrameRegistry, rendered: ReadonlyMap<number, RasterImage>): RasterImage[] {
  return [...registry.keys]
    .sort((a, b) => a.canonicalPhase - b.canonicalPhase)
    .map((key) => {
      const image = rendered.get(key.canonicalPhase);
      if (image === undefined) throw new Error(`Missing rendered key ${key.canonicalPhase}`);
      return image;
    });
}

function main(): void {
  const startedAt = Date.now();
  const registry = loadRegistry();
  const nonConformant = registry.keys.filter((key) => !key.conformance.passed);
  if (nonConformant.length > 0) {
    console.error(`[compose] refusing to compose: ${nonConformant.length} keyframes failed conformance`);
    process.exitCode = 2;
    return;
  }
  fs.mkdirSync(`${OUTPUT_DIR}/frames`, { recursive: true });
  const rendered = renderAllKeys(registry);
  const composed = composeAllPhases(registry, rendered);
  writeFrames(composed);
  saveImage(`${OUTPUT_DIR}/contact-sheet-16frame-1x.png`, buildContactSheet(composed.map((frame) => frame.image), 4, registry.canvas));
  saveImage(`${OUTPUT_DIR}/spritesheet-8frame.png`, buildHorizontalStrip(orderedRenderedKeys(registry, rendered)));
  fs.writeFileSync(`${OUTPUT_DIR}/runner-16phase.apng`, encodeApng(composed.map((frame) => frame.image)));
  const report = {
    personaId: registry.personaId,
    outputPhases: OUTPUT_PHASES,
    canvas: registry.canvas,
    groundAdherence: measureGroundAdherence(composed, registry.canvas),
    composedAtUtc: new Date().toISOString(),
  };
  fs.writeFileSync(`${OUTPUT_DIR}/compose-report.json`, JSON.stringify(report, null, 2));
  fs.writeFileSync('src/app/data/compose-report.json', JSON.stringify(report, null, 2));
  console.log(`[compose] wrote ${composed.length} frames + sheet + report (${Date.now() - startedAt}ms)`);
}

main();
