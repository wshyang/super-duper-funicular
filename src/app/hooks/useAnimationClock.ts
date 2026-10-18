import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizePhase } from '../../runner/vec.ts';

export interface AnimationClock {
  readonly phase: number;
  readonly isPlaying: boolean;
  readonly speed: number;
  readonly toggle: () => void;
  readonly step: (direction: 1 | -1) => void;
  readonly seek: (phase: number) => void;
  readonly setSpeed: (speed: number) => void;
}

export interface ClockOptions {
  readonly cadence: number;
  readonly initialPlaying?: boolean;
}

/** Drives the gait phase with requestAnimationFrame; React state stays 60 fps-safe. */
export const useAnimationClock = ({
  cadence,
  initialPlaying = true,
}: ClockOptions): AnimationClock => {
  const [phase, setPhase] = useState(0.16);
  const [isPlaying, setPlaying] = useState(initialPlaying);
  const [speed, setSpeed] = useState(1);
  const phaseRef = useRef(phase);
  const lastTimeRef = useRef<number | null>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (!isPlaying) {
      lastTimeRef.current = null;
      return;
    }
    const tick = (time: number): void => {
      if (lastTimeRef.current === null) lastTimeRef.current = time;
      const elapsed = Math.min(0.1, (time - lastTimeRef.current) / 1000);
      lastTimeRef.current = time;
      const next = normalizePhase(phaseRef.current + elapsed * cadence * speed);
      phaseRef.current = next;
      setPhase(next);
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [isPlaying, speed, cadence]);

  const toggle = useCallback(() => setPlaying((current) => !current), []);
  const step = useCallback((direction: 1 | -1) => {
    setPlaying(false);
    setPhase((current) => normalizePhase(current + direction * (1 / 8)));
  }, []);
  const seek = useCallback((value: number) => {
    setPlaying(false);
    setPhase(normalizePhase(value));
  }, []);
  const changeSpeed = useCallback((value: number) => setSpeed(value), []);

  return { phase, isPlaying, speed, toggle, step, seek, setSpeed: changeSpeed };
};
