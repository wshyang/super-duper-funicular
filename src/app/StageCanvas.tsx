import { useEffect, useRef } from 'react';
import { FRAME_STEP, STAGE_SIZE } from '../shared/constants';
import type { GaitSettings, RunnerPose } from '../shared/types';
import { renderRunner } from '../runner/render';
import { solvePose } from '../runner/pose';

interface StageCanvasProps {
  readonly pose: RunnerPose;
  readonly settings: GaitSettings;
  readonly showSkeleton: boolean;
  readonly showOnion: boolean;
}

export const StageCanvas = ({
  pose,
  settings,
  showSkeleton,
  showOnion,
}: StageCanvasProps): React.JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!context) return;
    if (showOnion) {
      renderRunner(context, solvePose(settings, pose.phase - FRAME_STEP), settings, {
        background: 'light',
        alpha: 0.12,
      });
      renderRunner(context, solvePose(settings, pose.phase + FRAME_STEP), settings, {
        background: 'transparent',
        clear: false,
        alpha: 0.12,
      });
      renderRunner(context, pose, settings, {
        background: 'transparent',
        clear: false,
        skeleton: showSkeleton,
      });
      return;
    }
    renderRunner(context, pose, settings, { skeleton: showSkeleton });
  }, [pose, settings, showOnion, showSkeleton]);

  return (
    <canvas
      ref={canvasRef}
      className="stage-canvas"
      width={STAGE_SIZE.width}
      height={STAGE_SIZE.height}
      aria-label="Procedural runner in a side-view gait pose"
      data-testid="stage__procedural-canvas"
    />
  );
};
