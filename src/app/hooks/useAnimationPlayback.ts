import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FrameManifestEntry } from '../data/sequence-manifest';

export interface AnimationPlayback {
  readonly isPlaying: boolean;
  readonly currentFrameIndex: number;
  readonly framesPerSecond: number;
  readonly isOnionSkinEnabled: boolean;
  readonly frames: readonly FrameManifestEntry[];
  readonly togglePlay: () => void;
  readonly stepTo: (index: number) => void;
  readonly setFramesPerSecond: (fps: number) => void;
  readonly toggleOnionSkin: () => void;
}

const MIN_FPS = 4;
const MAX_FPS = 30;
const DEFAULT_FPS = 24;

export function useAnimationPlayback(frames: readonly FrameManifestEntry[]): AnimationPlayback {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [framesPerSecond, setFramesPerSecondState] = useState(DEFAULT_FPS);
  const [isOnionSkinEnabled, setOnionSkin] = useState(false);
  const animationHandleRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = 1000 / framesPerSecond;
    const tick = (timestamp: number): void => {
      if (timestamp - lastTickRef.current >= intervalMs) {
        lastTickRef.current = timestamp;
        setCurrentFrameIndex((index) => (index + 1) % frames.length);
      }
      animationHandleRef.current = requestAnimationFrame(tick);
    };
    animationHandleRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationHandleRef.current !== null) cancelAnimationFrame(animationHandleRef.current);
      animationHandleRef.current = null;
    };
  }, [isPlaying, framesPerSecond, frames.length]);

  const togglePlay = useCallback(() => setIsPlaying((playing) => !playing), []);
  const stepTo = useCallback((index: number) => {
    setIsPlaying(false);
    setCurrentFrameIndex(((index % frames.length) + frames.length) % frames.length);
  }, [frames.length]);
  const setFramesPerSecond = useCallback((fps: number) => {
    setFramesPerSecondState(Math.max(MIN_FPS, Math.min(MAX_FPS, fps)));
  }, []);
  const toggleOnionSkin = useCallback(() => setOnionSkin((enabled) => !enabled), []);

  return useMemo(
    () => ({
      isPlaying,
      currentFrameIndex,
      framesPerSecond,
      isOnionSkinEnabled,
      frames,
      togglePlay,
      stepTo,
      setFramesPerSecond,
      toggleOnionSkin,
    }),
    [isPlaying, currentFrameIndex, framesPerSecond, isOnionSkinEnabled, frames, togglePlay, stepTo, setFramesPerSecond, toggleOnionSkin],
  );
}
