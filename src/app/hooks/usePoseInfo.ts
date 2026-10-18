import { useMemo } from 'react';
import type { BodyPartId, GaitSettings } from '../../shared/types.ts';
import { PART_ORDER } from '../../shared/constants.ts';
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
    // Only the pose is needed here; building a full scene per frame would
    // repaint-cost 60 times a second for a part count.
    const frame = solvePose(settings, phase);
    return {
      isFlight: frame.isFlight,
      isDoubleSupport: frame.isDoubleSupport,
      canonicalIndex: canonicalFrameIndex(phase),
      motionName: motionLabel(settings.motion),
      partCount: visibleParts ? visibleParts.length : PART_ORDER.length,
    };
  }, [settings, phase, visibleParts]);
