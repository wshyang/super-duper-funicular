import { useEffect, useRef } from 'react';
import type { AnimationPlayback } from '../hooks/useAnimationPlayback';
import { PlayerControls } from './PlayerControls';

const CANVAS_WIDTH = 256;
const CANVAS_HEIGHT = 320;

interface AnimationPlayerProps {
  readonly playback: AnimationPlayback;
}

export function AnimationPlayer({ playback }: AnimationPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const currentFrame = playback.frames[playback.currentFrameIndex];
  const previousFrame = playback.frames[(playback.currentFrameIndex - 1 + playback.frames.length) % playback.frames.length];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || currentFrame === undefined) return undefined;
    const context = canvas.getContext('2d');
    if (context === null) return undefined;
    let cancelled = false;
    const painter = playback.isOnionSkinEnabled && previousFrame !== undefined && previousFrame.src !== currentFrame.src
      ? () => drawFrameWithOnionSkin(context, canvas, frameCacheRef.current, previousFrame.src, currentFrame.src)
      : () => drawFramePlain(context, canvas, frameCacheRef.current, currentFrame.src);
    painter();
    return () => {
      cancelled = true;
      void cancelled;
    };
  }, [currentFrame, previousFrame, playback.isOnionSkinEnabled]);

  return (
    <section className="player">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        data-testid="player__canvas"
        aria-label="Animated running sequence frame preview"
      />
      <PlayerControls playback={playback} />
    </section>
  );
}

type FrameCache = Map<string, HTMLImageElement>;

function loadImageCached(cache: FrameCache, src: string, onReady: (image: HTMLImageElement) => void): void {
  const cached = cache.get(src);
  if (cached !== undefined && cached.complete) {
    onReady(cached);
    return;
  }
  const image = new Image();
  image.src = src;
  image.onload = () => {
    cache.set(src, image);
    onReady(image);
  };
}

function paintStage(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, image: HTMLImageElement, alpha: number): void {
  context.globalAlpha = alpha;
  context.drawImage(image, 0, 0);
  context.globalAlpha = 1;
}

function drawFramePlain(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  cache: FrameCache,
  frameSrc: string,
): void {
  paintStageBackground(context, canvas);
  loadImageCached(cache, frameSrc, (image) => paintStage(context, canvas, image, 1));
}

function drawFrameWithOnionSkin(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  cache: FrameCache,
  onionSrc: string,
  frameSrc: string,
): void {
  paintStageBackground(context, canvas);
  loadImageCached(cache, onionSrc, (onionImage) => {
    paintStage(context, canvas, onionImage, 0.25);
    loadImageCached(cache, frameSrc, (frameImage) => paintStage(context, canvas, frameImage, 1));
  });
}

function paintStageBackground(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#e2e6ee';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#78808c';
  context.beginPath();
  context.moveTo(0, 290.5);
  context.lineTo(canvas.width, 290.5);
  context.stroke();
}
