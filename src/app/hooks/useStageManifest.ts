import { useEffect, useState } from 'react';

export interface StageManifestPlate {
  poseId: string;
  src: string;
  landmarks: Record<string, readonly number[]>;
  landmarksV1?: Record<string, readonly number[]>;
}

export interface StageManifestPart {
  partId: string;
  sourcePose: string;
  keptRatio: number;
  relightScale: number;
  restLength: number;
  halfWidth: number;
  src: string;
}

export interface StageManifest {
  personaId: string;
  runId: string;
  scale: number;
  lengths: Record<string, number>;
  plates: StageManifestPlate[];
  parts: StageManifestPart[];
  cycle: { frames: string[]; contact: string; audit: { frame: number; phase: number; opaqueComponents: number; lowestFootY: number; groundLineDeltaPx: number }[] };
  learningsUrl: string;
}

export interface StageLearning {
  id: string;
  stage: number;
  kind: 'failure-mode' | 'design-decision' | 'defect' | 'win';
  summary: string;
  action: string;
}

export interface StageLearningsDoc {
  runId: string;
  personaId: string;
  learnings: StageLearning[];
  defects: { id: string; summary: string; severity: 'cosmetic' | 'structural'; followUp: string }[];
}

export type LoadState<T> = { status: 'loading' } | { status: 'error'; error: string } | { status: 'ok'; value: T };

/** Presentation-only fetch/parse of the pipeline run manifest (PIPE-REV surface #surf-workbench). */
export function useStageManifest(personaId: string): LoadState<StageManifest> {
  const [state, setState] = useState<LoadState<StageManifest>>({ status: 'loading' });
  useEffect(() => {
    let alive = true;
    fetch(`/sprites/photoreal/${personaId}/stage-manifest.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`manifest ${r.status}`);
        return r.json() as Promise<StageManifest>;
      })
      .then((value) => {
        if (alive) setState({ status: 'ok', value });
      })
      .catch((e: unknown) => {
        if (alive) setState({ status: 'error', error: String(e) });
      });
    return () => {
      alive = false;
    };
  }, [personaId]);
  return state;
}

export function useStageLearnings(url: string | null): LoadState<StageLearningsDoc> {
  const [state, setState] = useState<LoadState<StageLearningsDoc>>({ status: 'loading' });
  useEffect(() => {
    if (!url) return;
    let alive = true;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`learnings ${r.status}`);
        return r.json() as Promise<StageLearningsDoc>;
      })
      .then((value) => {
        if (alive) setState({ status: 'ok', value });
      })
      .catch((e: unknown) => {
        if (alive) setState({ status: 'error', error: String(e) });
      });
    return () => {
      alive = false;
    };
  }, [url]);
  return state;
}
