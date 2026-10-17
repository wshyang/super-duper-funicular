import { useEffect, useRef } from "react";
import type { Raster } from "../../pipeline/raster.ts";
import { drawRasterToCanvas } from "./draw-raster.ts";

export interface FilmstripProps {
  readonly frames: readonly Raster[];
  readonly activeIndex: number;
}

function FilmstripCell({ raster, index, active }: { raster: Raster; index: number; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current !== null) drawRasterToCanvas(canvasRef.current, raster);
  }, [raster]);

  return (
    <li className={active ? "filmstrip__cell filmstrip__cell--active" : "filmstrip__cell"} data-testid={`filmstrip__frame-${index + 1}`}>
      <canvas ref={canvasRef} className="filmstrip__canvas" aria-label={`Generated frame ${index + 1}`} />
      <span>{index + 1}</span>
    </li>
  );
}

export function Filmstrip({ frames, activeIndex }: FilmstripProps) {
  return (
    <ol className="filmstrip" data-testid="filmstrip__list">
      {frames.map((raster, index) => (
        <FilmstripCell key={index} raster={raster} index={index} active={index === activeIndex} />
      ))}
    </ol>
  );
}
