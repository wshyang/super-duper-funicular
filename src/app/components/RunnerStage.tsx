import { useEffect, useRef } from "react";
import type { Raster } from "../../pipeline/raster.ts";
import { drawRasterToCanvas } from "./draw-raster.ts";

export interface RunnerStageProps {
  readonly raster: Raster;
  readonly caption: string;
}

export function RunnerStage({ raster, caption }: RunnerStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current !== null) drawRasterToCanvas(canvasRef.current, raster);
  }, [raster]);

  return (
    <figure className="runner-stage" data-testid="runner-stage__figure">
      <canvas ref={canvasRef} className="runner-stage__canvas" data-testid="runner-stage__canvas" aria-label="Procedural running sprite" />
      <figcaption className="runner-stage__caption" data-testid="runner-stage__caption">{caption}</figcaption>
    </figure>
  );
}
