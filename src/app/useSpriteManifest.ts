import { useCallback, useEffect, useState } from 'react';
import type { SourceAnalysis, SpriteManifest } from '../shared/types';

export interface SpriteManifestState {
  readonly manifest: SpriteManifest | null;
  readonly analysis: SourceAnalysis | null;
  readonly status: 'loading' | 'ready' | 'error';
  readonly error: string | null;
  readonly retry: () => void;
}

const fetchJson = async <T>(url: string, signal: AbortSignal): Promise<T> => {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Asset request failed (${response.status}): ${url}`);
  return (await response.json()) as T;
};

export const useSpriteManifest = (): SpriteManifestState => {
  const [manifest, setManifest] = useState<SpriteManifest | null>(null);
  const [analysis, setAnalysis] = useState<SourceAnalysis | null>(null);
  const [status, setStatus] = useState<SpriteManifestState['status']>('loading');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    setError(null);
    Promise.all([
      fetchJson<SpriteManifest>('/sprites/manifest.json', controller.signal),
      fetchJson<SourceAnalysis>('/sprites/analysis.json', controller.signal),
    ])
      .then(([manifestValue, analysisValue]) => {
        if (
          manifestValue.frames.length !== 48 ||
          manifestValue.source.sha256.length !== 64 ||
          analysisValue.frames.length !== 48 ||
          analysisValue.sourceSha256 !== manifestValue.source.sha256 ||
          analysisValue.rows.length !== 6
        ) {
          throw new Error('The generated source assets are incomplete or inconsistent.');
        }
        setManifest(manifestValue);
        setAnalysis(analysisValue);
        setStatus('ready');
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(
          cause instanceof Error ? cause.message : 'Could not load generated source assets.',
        );
        setStatus('error');
      });
    return () => controller.abort();
  }, [attempt]);

  return { manifest, analysis, status, error, retry };
};
