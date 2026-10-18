import type { PaletteId, VectorFrameEntry, VectorManifest } from '../../shared/types.ts';
import { PALETTES } from '../../shared/constants.ts';

export interface VectorsPanelProps {
  readonly manifest: VectorManifest;
  readonly palette: PaletteId;
  readonly onPalette: (palette: PaletteId) => void;
}

const percent = (value: number): string => `${(value * 100).toFixed(1)}%`;
const decimal = (value: number, places: number): string => value.toFixed(places);

const VectorPaletteStrip = ({
  palette,
  onPalette,
}: {
  palette: PaletteId;
  onPalette: (palette: PaletteId) => void;
}): React.JSX.Element => (
  <div className="palette-grid palette-grid--compact" role="group" aria-label="Vector colourway">
    {PALETTES.map((option) => {
      const active = palette === option.id;
      return (
        <button
          key={option.id}
          type="button"
          className={active ? 'palette palette--active' : 'palette'}
          onClick={() => onPalette(option.id as PaletteId)}
          data-testid={`vectors__palette-${option.id}`}
        >
          <span className="palette__chip" style={{ background: option.primary }} />
          <span>{option.label}</span>
        </button>
      );
    })}
  </div>
);

const summaryOf = (manifest: VectorManifest): string =>
  `${String(manifest.frames.length)} SVGs · mean mask IoU ${manifest.meanMaskIou.toFixed(3)} · colour match ${percent(manifest.meanColourAgreement)}`;

const VectorCard = ({ frame }: { frame: VectorFrameEntry }): React.JSX.Element => {
  const caption = frame.id.slice(-2);
  const badge = `${String(frame.bands)} bands · ${String(frame.points)} pts`;
  const iou = decimal(frame.maskIou, 3);
  return (
    <figure className="vector-card" data-testid={`vectors__card-${frame.id}`}>
      <img
        className="vector-card__image"
        src={`/vectors/${frame.file}`}
        alt={`Vector trace ${frame.id}`}
        width={frame.width}
        height={frame.height}
        loading="lazy"
      />
      <figcaption className="vector-card__meta">
        <span>#{caption}</span>
        <span>{badge}</span>
        <span>IoU {iou}</span>
        <a
          className="vector-card__link"
          href={`/vectors/${frame.file}`}
          download
          data-testid={`vectors__download-${frame.id}`}
        >
          SVG
        </a>
      </figcaption>
    </figure>
  );
};

export const VectorsPanel = ({
  manifest,
  palette,
  onPalette,
}: VectorsPanelProps): React.JSX.Element => {
  const frames = manifest.frames.filter((frame) => frame.id.startsWith(palette));
  const tolerance = decimal(manifest.options.tolerance, 2);
  return (
    <section className="panel" aria-label="Pure-SVG vector output">
      <div className="panel-head">
        <h2 className="panel-title">Pure-SVG colour-band vectors</h2>
        <span className="stage__badge stage__badge--muted">{summaryOf(manifest)}</span>
      </div>
      <p className="panel-hint">
        Deterministic median-cut palette ({String(manifest.options.maxColors)} colours),
        marching-squares contours per band, Douglas–Peucker simplification at {tolerance} px, filled
        with the even-odd rule. No raster is embedded in these files; the IoU is measured by
        re-rasterising the emitted paths and comparing them with the quantised source.
      </p>
      <VectorPaletteStrip palette={palette} onPalette={onPalette} />
      <div className="vector-grid">
        {frames.map((frame) => (
          <VectorCard key={frame.id} frame={frame} />
        ))}
      </div>
    </section>
  );
};
