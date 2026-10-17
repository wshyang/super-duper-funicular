import { useEffect, useState } from "react";
import { advancePhase, cyclesPerSecond } from "../stage-model.ts";

export interface AnimationPhase {
  readonly phase: number;
  readonly setPhase: (phase: number) => void;
}

/** Drives the gait phase from requestAnimationFrame while `playing` is true. */
export function useAnimationPhase(playing: boolean, speed: number): AnimationPhase {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!playing) return undefined;
    let frameId = 0;
    let previous = performance.now();
    const tick = (now: number): void => {
      const elapsedSeconds = (now - previous) / 1000;
      previous = now;
      setPhase((current) => advancePhase(current, elapsedSeconds, cyclesPerSecond(speed)));
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [playing, speed]);

  return { phase, setPhase };
}
