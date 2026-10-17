import { useMemo } from 'react';
import type { BodyPartId, GaitSettings } from '../../shared/types.ts';
import { buildScene } from '../../runner/scene.ts';
import { canonicalFrameIndex, motionLabel } from '../../runner/gait.ts';
import { solvePose } from '../../runner/pose.ts';

export interface PoseInfo {
  readonly isFlight: boolean;
  readonly isDoubleSupport: boolean;
  readonly canonicalIndex: number;
  readonly motionName: string;
  readonly partCount: number;
}

export const usePoseInfo = (
  settings: GaitSettings,
  phase: number,
  visibleParts?: readonly BodyPartId[],
): PoseInfo =>
  useMemo(() => {
    const frame = solvePose(settings, phase);
    const scene = buildScene(settings, phase, { visibleParts });
    return {
      isFlight: frame.isFlight,
      isDoubleSupport: frame.isDoubleSupport,
      canonicalIndex: canonicalFrameIndex(phase),
      motionName: motionLabel(settings.motion),
      partCount: scene.parts.length,
    };
  }, [settings, phase, visibleParts]);
