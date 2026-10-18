import type { Point2D, RasterImage, RgbaColor } from '../shared/types.js';
import { readPixel } from './raster.js';

export interface SvgVectorizerSpec {
  readonly partId: string;
  readonly proximalPivot: Point2D;
  readonly distalPivot: Point2D;
  readonly quantStep?: number;
  readonly gridStepPx?: number;
}

export interface VectorizedPartSvg {
  readonly partId: string;
  readonly width: number;
  readonly height: number;
  readonly proximalPivot: Point2D;
  readonly distalPivot: Point2D;
  readonly silhouettePathD: string;
  readonly regionPaths: readonly { readonly fillHex: string; readonly d: string }[];
  readonly innerSvgDefsAndGroup: string;
  readonly fullSvgDocument: string;
}

function rgbToHex(r: number, g: number, b: number): string {
  const hr = Math.max(0, Math.min(255, Math.round(r))).toString(16).padStart(2, '0');
  const hg = Math.max(0, Math.min(255, Math.round(g))).toString(16).padStart(2, '0');
  const hb = Math.max(0, Math.min(255, Math.round(b))).toString(16).padStart(2, '0');
  return `#${hr}${hg}${hb}`;
}

function quantizeChannel(value: number, step: number): number {
  return Math.min(255, Math.round(value / step) * step);
}

function quantizePixelHex(px: RgbaColor, step: number): string {
  return rgbToHex(
    quantizeChannel(px.r, step),
    quantizeChannel(px.g, step),
    quantizeChannel(px.b, step),
  );
}

/**
 * Traces the outer silhouette contour of a binary grid mask by scanning left/right
 * hull spans per row and smoothing into a closed cubic/quadratic Bézier SVG path.
 */
function buildSilhouettePathFromRaster(raster: RasterImage, step: number): string {
  const leftPts: Point2D[] = [];
  const rightPts: Point2D[] = [];
  for (let y = 0; y < raster.height; y += step) {
    let minX = raster.width;
    let maxX = -1;
    for (let x = 0; x < raster.width; x++) {
      if (readPixel(raster, x, y).a >= 96) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
    if (maxX >= minX) {
      rightPts.push({ x: maxX + 0.5, y: y + 0.5 });
      leftPts.push({ x: minX - 0.5, y: y + 0.5 });
    }
  }
  if (rightPts.length < 2) {
    return 'M 0 0 Z';
  }
  const ring = [...rightPts, ...leftPts.reverse()];
  return pointsToSmoothClosedBezierPath(chaikinSmoothRing(ring));
}

function chaikinSmoothRing(points: readonly Point2D[]): Point2D[] {
  if (points.length < 4) return [...points];
  const out: Point2D[] = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p0 = points[i]!;
    const p1 = points[(i + 1) % n]!;
    out.push({ x: 0.75 * p0.x + 0.25 * p1.x, y: 0.75 * p0.y + 0.25 * p1.y });
    out.push({ x: 0.25 * p0.x + 0.75 * p1.x, y: 0.25 * p0.y + 0.75 * p1.y });
  }
  return out;
}

function pointsToSmoothClosedBezierPath(points: readonly Point2D[]): string {
  if (points.length === 0) return 'M 0 0 Z';
  if (points.length < 3) {
    const first = points[0]!;
    return `M ${first.x.toFixed(1)} ${first.y.toFixed(1)} Z`;
  }
  const n = points.length;
  const startMid = {
    x: (points[n - 1]!.x + points[0]!.x) * 0.5,
    y: (points[n - 1]!.y + points[0]!.y) * 0.5,
  };
  const cmds: string[] = [`M ${startMid.x.toFixed(1)} ${startMid.y.toFixed(1)}`];
  for (let i = 0; i < n; i++) {
    const curr = points[i]!;
    const next = points[(i + 1) % n]!;
    const midX = (curr.x + next.x) * 0.5;
    const midY = (curr.y + next.y) * 0.5;
    cmds.push(`Q ${curr.x.toFixed(1)} ${curr.y.toFixed(1)} ${midX.toFixed(1)} ${midY.toFixed(1)}`);
  }
  cmds.push('Z');
  return cmds.join(' ');
}

interface ColorBandRun {
  readonly fillHex: string;
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
}

function extractMergedColorBands(
  raster: RasterImage,
  quantStep: number,
  gridStep: number,
): ColorBandRun[] {
  const runs: ColorBandRun[] = [];
  for (let y = 0; y < raster.height; y += gridStep) {
    let activeHex = '';
    let runStart = 0;
    for (let x = 0; x <= raster.width; x += gridStep) {
      const px = x < raster.width ? readPixel(raster, x, y) : { r: 0, g: 0, b: 0, a: 0 };
      const hex = px.a >= 96 ? quantizePixelHex(px, quantStep) : '';
      if (hex !== activeHex) {
        if (activeHex !== '') {
          runs.push({ fillHex: activeHex, x0: runStart, x1: x, y0: y, y1: y + gridStep });
        }
        activeHex = hex;
        runStart = x;
      }
    }
  }
  return runs;
}

function groupRunsIntoColorPaths(
  runs: readonly ColorBandRun[],
): { readonly fillHex: string; readonly d: string }[] {
  const byColor = new Map<string, string[]>();
  for (const run of runs) {
    const bucket = byColor.get(run.fillHex) ?? [];
    const rx = (run.x0 - 0.3).toFixed(1);
    const ry = (run.y0 - 0.3).toFixed(1);
    const rw = (run.x1 - run.x0 + 0.6).toFixed(1);
    const rh = (run.y1 - run.y0 + 0.6).toFixed(1);
    bucket.push(`M${rx},${ry}h${rw}v${rh}h-${rw}Z`);
    byColor.set(run.fillHex, bucket);
  }
  const result: { readonly fillHex: string; readonly d: string }[] = [];
  for (const [fillHex, subpaths] of byColor.entries()) {
    result.push({ fillHex, d: subpaths.join('') });
  }
  return result;
}

/**
 * Converts a rounded-end 160x160 RGBA articulated cutout into a standalone SVG vector
 * asset with an analytical smooth Bézier `<clipPath>` rounding mask and grouped color paths.
 */
export function vectorizeRasterCutoutToSvg(
  raster: RasterImage,
  spec: SvgVectorizerSpec,
): VectorizedPartSvg {
  const quantStep = spec.quantStep ?? 24;
  const gridStep = spec.gridStepPx ?? 2;
  const silhouettePathD = buildSilhouettePathFromRaster(raster, gridStep);
  const runs = extractMergedColorBands(raster, quantStep, gridStep);
  const regionPaths = groupRunsIntoColorPaths(runs);
  const clipId = `rounded-mask-${spec.partId}`;
  const pathElements = regionPaths
    .map((p) => `<path fill="${p.fillHex}" d="${p.d}"/>`)
    .join('\n    ');
  const innerSvgDefsAndGroup = [
    `<defs><clipPath id="${clipId}"><path d="${silhouettePathD}"/></clipPath></defs>`,
    `<g id="part-vector-${spec.partId}" clip-path="url(#${clipId})" shape-rendering="geometricPrecision">`,
    `  ${pathElements}`,
    `</g>`,
  ].join('\n');
  const fullSvgDocument = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${raster.width} ${raster.height}" width="${raster.width}" height="${raster.height}" data-part-id="${spec.partId}" data-proximal-pivot="${spec.proximalPivot.x},${spec.proximalPivot.y}" data-distal-pivot="${spec.distalPivot.x},${spec.distalPivot.y}">`,
    innerSvgDefsAndGroup,
    `</svg>`,
  ].join('\n');
  return {
    partId: spec.partId,
    width: raster.width,
    height: raster.height,
    proximalPivot: spec.proximalPivot,
    distalPivot: spec.distalPivot,
    silhouettePathD,
    regionPaths,
    innerSvgDefsAndGroup,
    fullSvgDocument,
  };
}
