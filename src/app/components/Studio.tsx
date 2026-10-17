import { useEffect, useRef } from "react";
import { PALETTES } from "../../lib/rig/palette.ts";
import { paintPose } from "../../lib/render/paint.ts";
import { useRunnerStudio } from "../hooks/useRunnerStudio.ts";
import type { GaitControls } from "../../lib/gait/gait.ts";

export function Studio() {
  const studio = useRunnerStudio();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!studio.playing) return undefined;
    let frame = 0;
    const tick = (now: number) => {
      studio.setPhase((now / 1000 / studio.gait.cycleSeconds) % 1);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [studio.playing, studio.gait.cycleSeconds, studio.setPhase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    paintPose({ canvas, pose: studio.pose, palette: studio.palette, scale: 280, groundY: 300 });
  }, [studio.pose, studio.palette]);

  return (
    <main className="studio" data-testid="studio__root">
      <header>
        <h1>Funicular Runner Lab</h1>
        <p>Harmonised greenfield gait, 17-part intent, evidence-led parity.</p>
      </header>
      <section className="stage">
        <canvas ref={canvasRef} width={640} height={360} data-testid="studio__stage" />
        <p data-testid="studio__phase">{studio.pose.phaseName}</p>
      </section>
      <section className="controls">
        <button type="button" data-testid="studio__play" onClick={() => studio.setPlaying((v) => !v)}>
          {studio.playing ? "Pause" : "Play"}
        </button>
        <label>
          Persona
          <select
            data-testid="studio__persona"
            value={studio.persona}
            onChange={(event) => studio.setPersona(event.target.value as typeof studio.persona)}
          >
            <option value="sg-chinese-male">SG Chinese Male</option>
            <option value="sg-chinese-female">SG Chinese Female</option>
          </select>
        </label>
        <label>
          Palette
          <select
            data-testid="studio__palette"
            value={studio.paletteId}
            onChange={(event) => studio.setPaletteId(event.target.value)}
          >
            {PALETTES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.id}
              </option>
            ))}
          </select>
        </label>
        <Slider
          id="cadence"
          label="Cadence"
          min={120}
          max={230}
          value={studio.controls.cadence}
          onChange={(cadence) => studio.setControls({ ...studio.controls, cadence })}
        />
        <Slider
          id="stride"
          label="Stride"
          min={0.5}
          max={1.2}
          step={0.01}
          value={studio.controls.strideLength}
          onChange={(strideLength) => studio.setControls({ ...studio.controls, strideLength })}
        />
        <Slider
          id="lean"
          label="Lean"
          min={0}
          max={0.34}
          step={0.01}
          value={studio.controls.lean}
          onChange={(lean) => studio.setControls({ ...studio.controls, lean })}
        />
      </section>
      <aside data-testid="studio__metrics">
        <p>Crossover samples: {studio.metrics.crossoverCount}</p>
        <p>Flight samples: {studio.metrics.flightCount}</p>
        <p>Unilateral lock: {studio.metrics.unilateralLock ? "yes" : "no"}</p>
        <p>Max foot Δx: {studio.metrics.maxFootDelta.toFixed(3)}</p>
      </aside>
    </main>
  );
}

interface SliderProps {
  readonly id: string;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  readonly value: number;
  readonly onChange: (value: number) => void;
}

function Slider(props: SliderProps) {
  return (
    <label>
      {props.label}
      <input
        data-testid={`studio__${props.id}`}
        type="range"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value}
        onChange={(event) => props.onChange(Number(event.target.value))}
      />
    </label>
  );
}

export type { GaitControls };
