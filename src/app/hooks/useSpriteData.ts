import { useCallback, useEffect, useState } from 'react';
import type {
  FlawAnalysis,
  PaletteId,
  ReferenceFrame,
  SpriteManifest,
} from '../../shared/types.ts';

export interface SpriteData {
  readonly manifest: SpriteManifest | null;
  readonly analysis: FlawAnalysis | null;
  readonly status: 'loading' | 'ready' | 'error';
  readonly error: string | null;
  readonly retry: () => void;
  readonly framesByPalette: Readonly<Record<string, readonly ReferenceFrame[]>>;
}

const groupFrames = (manifest: SpriteManifest | null): Record<string, ReferenceFrame[]> => {
  const groups: Record<string, ReferenceFrame[]> = {};
  if (!manifest) return groups;
  for (const frame of manifest.frames) {
    const key = frame.palette as PaletteId;
    groups[key] = [...(groups[key] ?? []), frame];
  }
  for (const key of Object.keys(groups)) {
    groups[key] = [...(groups[key] ?? [])].sort((left, right) => left.column - right.column);
  }
  return groups;
};

export const useSpriteData = (): SpriteData => {
  const [manifest, setManifest] = useState<SpriteManifest | null>(null);
  const [analysis, setAnalysis] = useState<FlawAnalysis | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);
    Promise.all([
      fetch('/sprites/manifest.json').then((response) => {
        if (!response.ok) throw new Error(`Manifest request failed (${response.status}).`);
        return response.json() as Promise<SpriteManifest>;
      }),
      fetch('/sprites/analysis.json').then((response) => {
        if (!response.ok) throw new Error(`Analysis request failed (${response.status}).`);
        return response.json() as Promise<FlawAnalysis>;
      }),
    ])
      .then(([loadedManifest, loadedAnalysis]) => {
        if (cancelled) return;
        setManifest(loadedManifest);
        setAnalysis(loadedAnalysis);
        setStatus('ready');
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(caught instanceof Error ? caught.message : 'Unknown asset loading error.');
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);
  return { manifest, analysis, status, error, retry, framesByPalette: groupFrames(manifest) };
};
