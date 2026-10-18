import type { PaletteId, ReferenceFrame } from '../../shared/types.ts';
import { PALETTES } from '../../shared/constants.ts';

export interface GalleryPanelProps {
  readonly framesByPalette: Readonly<Record<string, readonly ReferenceFrame[]>>;
  readonly palette: PaletteId;
  readonly onPalette: (palette: PaletteId) => void;
  readonly onOpen: (url: string) => void;
}

const PaletteStrip = ({
  palette,
  onPalette,
}: {
  palette: PaletteId;
  onPalette: (palette: PaletteId) => void;
}): React.JSX.Element => (
  <div className="palette-grid palette-grid--compact" role="group" aria-label="Gallery colourway">
    {PALETTES.map((option) => {
      const active = palette === option.id;
      return (
        <button
          key={option.id}
          type="button"
          className={active ? 'palette palette--active' : 'palette'}
          onClick={() => onPalette(option.id as PaletteId)}
          data-testid={`gallery__palette-${option.id}`}
        >
          <span className="palette__chip" style={{ background: option.primary }} />
          <span>{option.label}</span>
        </button>
      );
    })}
  </div>
);

const FrameGrid = ({
  frames,
  onOpen,
}: {
  frames: readonly ReferenceFrame[];
  onOpen: (url: string) => void;
}): React.JSX.Element => (
  <div className="gallery">
    {frames.map((frame) => {
      const caption = String(frame.column + 1).padStart(2, '0');
      const size = `${String(frame.width)}×${String(frame.height)}`;
      return (
        <button
          key={frame.id}
          type="button"
          className="gallery__cell"
          onClick={() => onOpen(frame.url)}
          data-testid={`gallery__frame-${caption}`}
          title={`${frame.id} · ${size}`}
        >
          <img src={frame.url} alt={frame.id} loading="lazy" />
          <span>{caption}</span>
        </button>
      );
    })}
  </div>
);

export const GalleryPanel = ({
  framesByPalette,
  palette,
  onPalette,
  onOpen,
}: GalleryPanelProps): React.JSX.Element => {
  const frames = framesByPalette[palette] ?? [];
  const duplicates = frames.filter((frame) => frame.duplicateOf !== null).length;
  const summary = `${String(frames.length)} frames · ${String(duplicates)} duplicate-classified`;
  return (
    <section className="panel" aria-label="Source frame gallery">
      <div className="panel-head">
        <h2 className="panel-title">Extracted source frames</h2>
        <span className="stage__badge stage__badge--muted">{summary}</span>
      </div>
      <PaletteStrip palette={palette} onPalette={onPalette} />
      <FrameGrid frames={frames} onOpen={onOpen} />
    </section>
  );
};

export interface LightboxProps {
  readonly url: string | null;
  readonly onClose: () => void;
}

export const Lightbox = ({ url, onClose }: LightboxProps): React.JSX.Element | null => {
  if (!url) return null;
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Frame preview">
      <button
        type="button"
        className="lightbox__backdrop"
        onClick={onClose}
        data-testid="lightbox__close"
        aria-label="Close preview"
      />
      <img className="lightbox__image" src={url} alt="Full-size extracted frame" />
    </div>
  );
};
