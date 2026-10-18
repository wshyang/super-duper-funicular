import { useCallback, useEffect, useState } from 'react';
import type { VectorManifest } from '../../shared/types.ts';

export type VectorStatus = 'loading' | 'ready' | 'error';

export interface VectorData {
  readonly manifest: VectorManifest | null;
  readonly status: VectorStatus;
  readonly error: string | null;
  readonly retry: () => void;
}

/** Static manifest fetch with an explicit retry, mirroring the sprite loader. */
export const useVectorManifest = (): VectorData => {
  const [manifest, setManifest] = useState<VectorManifest | null>(null);
  const [status, setStatus] = useState<VectorStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    setError(null);
    fetch('/vectors/manifest.json', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
        return response.json() as Promise<VectorManifest>;
      })
      .then((data) => {
        setManifest(data);
        setStatus('ready');
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : 'Unknown vector manifest error');
        setStatus('error');
      });
    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { manifest, status, error, retry };
};
