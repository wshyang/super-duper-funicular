import { useEffect, useRef, useState } from "react";
import { wrap } from "./gait";
export function usePlayback(cadence: number) {
  const [phase, setPhase] = useState(0);
  const [isPlaying, setPlaying] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [speed, setSpeed] = useState(1);
  const last = useRef(0);
  useEffect(() => {
    if (!isPlaying) return;
    let request = 0;
    last.current = 0;
    function tick(now: number) {
      const delta = last.current
        ? Math.min((now - last.current) / 1000, 0.05)
        : 0;
      last.current = now;
      setPhase((previous) => previous + ((delta * cadence) / 120) * speed);
      request = requestAnimationFrame(tick);
    }
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [isPlaying, cadence, speed]);
  function seek(value: number) {
    setPlaying(false);
    setPhase(wrap(value));
  }
  function step() {
    setPlaying(false);
    setPhase((previous) => wrap((Math.floor(previous * 8) + 1) / 8));
  }
  function toggle() {
    setPlaying((previous) => !previous);
  }
  return {
    phase: wrap(phase),
    cycles: phase,
    isPlaying,
    speed,
    setSpeed,
    seek,
    step,
    toggle,
  };
}
