import { renderImageAt } from './normalize-frame.js';
import { createImage } from './image-io.js';
import type { CanvasSpec, ComposedFrameRecord, KeyframeRecord, RasterImage } from '../shared/types.js';

const FLIGHT_PHASES = [0.375, 0.875] as const;
const FLIGHT_LIFT_PX = 26;

export function flightLiftPx(phase: number, canvasHeightPx: number): number {
  const peak = (FLIGHT_LIFT_PX / 300) * canvasHeightPx;
  return FLIGHT_PHASES.reduce((maximum, center) => {
    const distance = cyclicDistance(phase, center);
    const bump = distance > 0.125 ? 0 : peak * (0.5 + 0.5 * Math.cos((Math.PI * distance) / 0.125));
    return Math.max(maximum, bump);
  }, 0);
}

function cyclicDistance(a: number, b: number): number {
  const raw = Math.abs(a - b) % 1;
  return Math.min(raw, 1 - raw);
}

export interface ComposedFrame {
  readonly image: RasterImage;
  readonly record: ComposedFrameRecord;
}

export function composeFrameAtPhase(
  phase: number,
  keys: readonly KeyframeRecord[],
  masterHeightFraction: number,
  renderedKeys: ReadonlyMap<number, RasterImage>,
  canvas: CanvasSpec,
): ComposedFrame {
  const { base, blend, blendWeight } = selectBracketingKeys(phase, keys);
  const composited = blend === null
    ? cloneImage(requireRendered(renderedKeys, base.canonicalPhase))
    : blendRenderedKeys(
        requireRendered(renderedKeys, base.canonicalPhase),
        requireRendered(renderedKeys, blend.canonicalPhase),
        blendWeight,
      );
  const record: ComposedFrameRecord = {
    phase,
    baseKeyPhase: base.canonicalPhase,
    blendKeyPhase: blend === null ? null : blend.canonicalPhase,
    blendWeight,
    liftPx: flightLiftPx(phase, canvas.heightPx),
  };
  return { image: composited, record };
}

function requireRendered(rendered: ReadonlyMap<number, RasterImage>, phase: number): RasterImage {
  const image = rendered.get(phase);
  if (image === undefined) throw new Error(`No rendered keyframe for phase ${phase}`);
  return image;
}

export function selectBracketingKeys(phase: number, keys: readonly KeyframeRecord[]): {
  base: KeyframeRecord;
  blend: KeyframeRecord | null;
  blendWeight: number;
} {
  const ordered = [...keys].sort((a, b) => a.canonicalPhase - b.canonicalPhase);
  const nextIndex = ordered.findIndex((key) => key.canonicalPhase > phase + 1e-9);
  const next = nextIndex === -1 ? ordered[0] : ordered[nextIndex];
  const previousIndex = (nextIndex === -1 ? ordered.length : nextIndex) - 1;
  const previous = previousIndex < 0 ? ordered[ordered.length - 1] : ordered[previousIndex];
  if (isExactKeyPhase(phase, ordered)) {
    const exact = ordered.find((key) => Math.abs(key.canonicalPhase - phase) < 1e-6);
    return { base: exact ?? previous, blend: null, blendWeight: 0 };
  }
  const span = cyclicDistance(previous.canonicalPhase, next.canonicalPhase);
  const into = cyclicDistance(previous.canonicalPhase, phase);
  return { base: previous, blend: next, blendWeight: smoothHold(into / span) };
}

function isExactKeyPhase(phase: number, keys: readonly KeyframeRecord[]): boolean {
  return keys.some((key) => Math.abs(key.canonicalPhase - phase) < 1e-6);
}

function smoothHold(t: number): number {
  return t * t * (3 - 2 * t);
}

export function blendRenderedKeys(a: RasterImage, b: RasterImage, weight: number): RasterImage {
  const output = createImage(a.width, a.height);
  for (let index = 0; index < a.data.length; index += 4) {
    const alphaA = a.data[index + 3];
    const alphaB = b.data[index + 3];
    const coverage = blendCoverage(alphaA, alphaB, weight);
    for (let channel = 0; channel < 3; channel++) {
      output.data[index + channel] = blendChannel(
        a.data[index + channel], alphaA,
        b.data[index + channel], alphaB,
        weight,
      );
    }
    output.data[index + 3] = Math.round(coverage * 255);
  }
  return output;
}

function blendCoverage(alphaA: number, alphaB: number, weight: number): number {
  const coverageA = (alphaA / 255) * (1 - weight);
  const coverageB = (alphaB / 255) * weight;
  return Math.min(1, coverageA + coverageB);
}

function blendChannel(valueA: number, alphaA: number, valueB: number, alphaB: number, weight: number): number {
  const weighted = valueA * (1 - weight) * (alphaA / 255) + valueB * weight * (alphaB / 255);
  const coverage = blendCoverage(alphaA, alphaB, weight);
  return coverage <= 0 ? 0 : Math.round(weighted / coverage);
}

export function cloneImage(image: RasterImage): RasterImage {
  return { width: image.width, height: image.height, data: Buffer.from(image.data) };
}

export const CANVAS_FIGURE_FRACTION = 0.75;

export function renderKeyToCanvas(
  key: KeyframeRecord,
  keyedPlate: RasterImage,
  soleYInPlate: number,
  centroidXInPlate: number,
  canvas: CanvasSpec,
): RasterImage {
  const targetFigureHeightPx = canvas.heightPx * CANVAS_FIGURE_FRACTION;
  const plateFigureHeightPx = key.conformance.heightFraction * key.heightPx;
  const scale = targetFigureHeightPx / plateFigureHeightPx;
  const targetSoleY = canvas.groundY - flightLiftPx(key.canonicalPhase, canvas.heightPx);
  return renderImageAt(keyedPlate, scale, canvas.widthPx / 2, targetSoleY, soleYInPlate, canvas);
}
