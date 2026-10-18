import type { Rgba } from '../../shared/atlas-types.js';
import { meanLuminance } from './image-io.js';

/**
 * Stage 4 MVP relight: scale each part's luminance toward the master's mean
 * subject luminance (clamped), so plates generated under slightly different
 * fill light do not step at the joints (DEFECT-03 class). Full pose-conditioned
 * shading remains Sprint 2+ (`#feat-relight`).
 */
export function relightPart(part: Rgba, targetLuma: number): number {
  const luma = meanLuminance(part, (x, y) => (part.data[(y * part.width + x) * 4 + 3] ?? 0) > 32);
  if (luma <= 1 || targetLuma <= 1) return 1;
  const scale = Math.min(1.15, Math.max(0.85, targetLuma / luma));
  for (let i = 0; i < part.data.length; i += 4) {
    part.data[i] = Math.min(255, (part.data[i] ?? 0) * scale);
    part.data[i + 1] = Math.min(255, (part.data[i + 1] ?? 0) * scale);
    part.data[i + 2] = Math.min(255, (part.data[i + 2] ?? 0) * scale);
  }
  return Number(scale.toFixed(3));
}
