/**
 * AC-05 background validator — lightweight check that a generated candidate
 * meets chroma-key cleanliness. Samples background regions and sole gaps.
 *
 * This is intentionally simple (no native deps); it complements visual `read_file` review
 * and `npm run harvest-phases` coverage metrics.
 */
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';

export interface BackgroundValidationResult {
  readonly filePath: string;
  readonly width: number;
  readonly height: number;
  /** Mean per-channel deviation from #FF00FF in sampled pure-background corners */
  readonly backgroundVariance: number;
  /** Estimated count of non-magenta pixels in corner samples */
  readonly nonMagentaBackgroundPixels: number;
  /** Soft-shadow estimate: average darkness drop near lower-middle (0 = clean, 1 = heavy shadow) */
  readonly lowerCenterShadowScore: number;
  readonly passesAC05: boolean;
  readonly notes: string[];
}

/** Master actual sampled magenta (approx) — generative model outputs ~249,48,229 not pure 255,0,255 */
export const MASTER_MAGENTA = { r: 249, g: 48, b: 229 } as const;
/** Allow ±18 per channel around master magenta; strict pure #FF00FF is not what diffusion model emits */
const TOLERANCE = 18;

function isMagenta(r: number, g: number, b: number): boolean {
  return (
    Math.abs(r - MASTER_MAGENTA.r) <= TOLERANCE &&
    Math.abs(g - MASTER_MAGENTA.g) <= TOLERANCE &&
    Math.abs(b - MASTER_MAGENTA.b) <= TOLERANCE
  );
}

export function validateBackground(filePath: string): BackgroundValidationResult {
  const buffer = readFileSync(filePath);
  const png = PNG.sync.read(buffer);
  const { width, height, data } = png as { width: number; height: number; data: Buffer };
  const cornerStats = sampleCornerVariance(width, height, data);
  const shadowScore = sampleLowerShadow(width, height, data);
  return buildResult(filePath, width, height, cornerStats, shadowScore);
}

function sampleCornerVariance(width: number, height: number, data: Buffer) {
  const samples = [
    { x: Math.floor(width * 0.02), y: Math.floor(height * 0.02), w: Math.floor(width * 0.12), h: Math.floor(height * 0.12) },
    { x: Math.floor(width * 0.86), y: Math.floor(height * 0.02), w: Math.floor(width * 0.12), h: Math.floor(height * 0.12) },
    { x: Math.floor(width * 0.02), y: Math.floor(height * 0.86), w: Math.floor(width * 0.12), h: Math.floor(height * 0.12) },
    { x: Math.floor(width * 0.86), y: Math.floor(height * 0.86), w: Math.floor(width * 0.12), h: Math.floor(height * 0.12) },
  ];
  let total = 0, nonMag = 0, varSum = 0;
  for (const s of samples) {
    for (let y = s.y; y < s.y + s.h; y++) {
      for (let x = s.x; x < s.x + s.w; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx] ?? 0, g = data[idx + 1] ?? 0, b = data[idx + 2] ?? 0;
        total++; if (!isMagenta(r, g, b)) nonMag++;
        varSum += Math.abs(r - MASTER_MAGENTA.r) + Math.abs(g - MASTER_MAGENTA.g) + Math.abs(b - MASTER_MAGENTA.b);
      }
    }
  }
  return { total, nonMag, variance: total ? varSum / total / 3 : 999 };
}

function sampleLowerShadow(width: number, height: number, data: Buffer) {
  const lcX = Math.floor(width * 0.4), lcY = Math.floor(height * 0.78);
  const lcW = Math.floor(width * 0.2), lcH = Math.floor(height * 0.16);
  let lcTotal = 0, lcDark = 0;
  for (let y = lcY; y < lcY + lcH; y++) {
    for (let x = lcX; x < lcX + lcW; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx] ?? 0, g = data[idx + 1] ?? 0, b = data[idx + 2] ?? 0;
      lcTotal++;
      if (!isMagenta(r, g, b) && r + g + b < 400) lcDark++;
    }
  }
  return lcTotal ? lcDark / lcTotal : 0;
}

function buildResult(filePath: string, width: number, height: number, corner: { total: number; nonMag: number; variance: number }, shadow: number): BackgroundValidationResult {
  const nonMagRatio = corner.total ? corner.nonMag / corner.total : 1;
  const passes = nonMagRatio < 0.03 && corner.variance < 8 && shadow < 0.02;
  const notes: string[] = [];
  if (nonMagRatio >= 0.03) notes.push(`Corner non-magenta ${(nonMagRatio * 100).toFixed(2)}% >3%`);
  if (corner.variance >= 8) notes.push(`Variance ${corner.variance.toFixed(2)} >=8`);
  if (shadow >= 0.02) notes.push(`Lower-center shadow ${(shadow * 100).toFixed(2)}% >=2%`);
  if (passes) notes.push('Passes AC-05 visual gate');
  return {
    filePath, width, height,
    backgroundVariance: Number(corner.variance.toFixed(2)),
    nonMagentaBackgroundPixels: corner.nonMag,
    lowerCenterShadowScore: Number(shadow.toFixed(4)),
    passesAC05: passes, notes,
  };
}
