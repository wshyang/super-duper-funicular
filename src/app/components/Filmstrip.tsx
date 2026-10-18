import { useRef } from 'react';
import type { GaitSettings, ReferenceFrame } from '../../shared/types.ts';
import { useStageCanvas } from '../hooks/useStageCanvas.ts';

const ProceduralThumb = ({
  settings,
  phase,
}: {
  settings: GaitSettings;
  phase: number;
}): React.JSX.Element => {
  const ref = useRef<HTMLCanvasElement>(null);
  useStageCanvas(ref, {
    settings,
    phase,
    scale: 1,
    showSkeleton: false,
    showGround: false,
    onionSkin: false,
  });
  return (
    <canvas
      ref={ref}
      width={260}
      height={340}
      className="filmstrip__thumb-canvas"
      aria-hidden="true"
    />
  );
};

export interface FilmstripProps {
  readonly settings: GaitSettings;
  readonly frames: readonly ReferenceFrame[];
  readonly activeColumn: number;
  readonly onSelectPhase: (column: number) => void;
}

interface CellProps {
  readonly settings: GaitSettings;
  readonly frame: ReferenceFrame | null;
  readonly index: number;
  readonly isActive: boolean;
  readonly onSelect: () => void;
}

const FilmstripCell = ({
  settings,
  frame,
  index,
  isActive,
  onSelect,
}: CellProps): React.JSX.Element => {
  const caption = String(index + 1).padStart(2, '0');
  return (
    <button
      type="button"
      className={isActive ? 'filmstrip__cell filmstrip__cell--active' : 'filmstrip__cell'}
      onClick={onSelect}
      data-testid={`filmstrip__frame-${caption}`}
      aria-pressed={isActive}
    >
      <span className="filmstrip__procedural">
        <ProceduralThumb settings={settings} phase={index / 8} />
      </span>
      <span className="filmstrip__reference">
        {frame ? (
          <img src={frame.url} alt={`Reference frame ${index + 1}`} loading="lazy" />
        ) : (
          <span className="filmstrip__missing">—</span>
        )}
      </span>
      <span className="filmstrip__caption">{caption}</span>
    </button>
  );
};

export const Filmstrip = ({
  settings,
  frames,
  activeColumn,
  onSelectPhase,
}: FilmstripProps): React.JSX.Element => {
  const cells = Array.from({ length: 8 }, (_, index) => ({
    index,
    frame: frames.find((candidate) => candidate.column === index) ?? null,
  }));
  return (
    <section className="filmstrip" aria-label="Eight-phase filmstrip">
      <div className="filmstrip__head">
        <h2 className="panel-title">Eight-phase comparison</h2>
        <p className="panel-hint">
          Procedural frames (top) against the extracted source frames (bottom). No per-frame
          re-centring hides the source drift.
        </p>
      </div>
      <div className="filmstrip__grid">
        {cells.map((cell) => (
          <FilmstripCell
            key={cell.index}
            settings={settings}
            frame={cell.frame}
            index={cell.index}
            isActive={cell.index === activeColumn}
            onSelect={() => onSelectPhase(cell.index)}
          />
        ))}
      </div>
    </section>
  );
};
