import { useEffect } from 'react';
import type { BodyPartId, GaitSettings } from '../../shared/types.ts';
import { buildScene } from '../../runner/scene.ts';
import { cartoonGround, paintScene, paintSkeleton } from '../../runner/paint-canvas.ts';

export interface StageCanvasOptions {
  readonly settings: GaitSettings;
  readonly phase: number;
  readonly scale: number;
  readonly showSkeleton: boolean;
  readonly showGround: boolean;
  readonly onionSkin: boolean;
  readonly visibleParts?: readonly BodyPartId[];
}

const paintGhosts = (ctx: CanvasRenderingContext2D, options: StageCanvasOptions): void => {
  const ghosts = [0.045, 0.09];
  ghosts.forEach((offset, index) => {
    const scene = buildScene(options.settings, options.phase - offset, {
      visibleParts: options.visibleParts,
    });
    paintScene(ctx, scene, options.scale, {
      clear: index === 0 ? false : false,
      alpha: index === 0 ? 0.1 : 0.16,
    });
  });
};

/** Side effect only: paints the procedural runner for the current phase. */
export const useStageCanvas = (
  ref: React.RefObject<HTMLCanvasElement | null>,
  options: StageCanvasOptions,
): void => {
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (options.onionSkin) paintGhosts(context, options);
    const scene = buildScene(options.settings, options.phase, {
      visibleParts: options.visibleParts,
    });
    if (options.showGround) cartoonGround(context, scene, options.scale);
    paintScene(context, scene, options.scale, { clear: false });
    if (options.showSkeleton) paintSkeleton(context, scene, options.scale);
  }, [
    ref,
    options.settings,
    options.phase,
    options.scale,
    options.showSkeleton,
    options.showGround,
    options.onionSkin,
    options.visibleParts,
  ]);
};
