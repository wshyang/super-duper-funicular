export interface LoopHandle {
  readonly phase: () => number;
  readonly stop: () => void;
}

export interface LoopOptions {
  readonly stepSeconds: (deltaSeconds: number, now: number) => void;
}

/**
 * A requestAnimationFrame loop that clamps the delta so a backgrounded tab
 * does not jump the phase forward when it returns.
 */
export function startLoop(options: LoopOptions): LoopHandle {
  let previous = performance.now();
  let running = true;
  let frame = 0;
  const tick = (now: number) => {
    if (!running) return;
    const delta = Math.min(0.1, Math.max(0, (now - previous) / 1000));
    previous = now;
    options.stepSeconds(delta, now);
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return {
    phase: () => previous,
    stop: () => {
      running = false;
      cancelAnimationFrame(frame);
    },
  };
}
