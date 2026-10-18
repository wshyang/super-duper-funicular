import { useMemo } from 'react';
import type { PaletteId, ReferenceFrame } from '../../shared/types.ts';

export interface ReferenceSelection {
  readonly frame: ReferenceFrame | null;
  readonly url: string | null;
  readonly label: string;
}

export const useReferenceFrame = (
  framesByPalette: Readonly<Record<string, readonly ReferenceFrame[]>>,
  palette: PaletteId,
  column: number,
): ReferenceSelection =>
  useMemo(() => {
    const frames = framesByPalette[palette] ?? [];
    const frame = frames.find((candidate) => candidate.column === column) ?? frames[0] ?? null;
    return {
      frame,
      url: frame?.url ?? null,
      label: frame
        ? `Reference ${String(frame.column + 1).padStart(2, '0')} · ${String(frame.width)}×${String(frame.height)}`
        : 'Reference unavailable',
    };
  }, [framesByPalette, palette, column]);
