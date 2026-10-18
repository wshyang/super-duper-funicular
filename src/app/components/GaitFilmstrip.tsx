import type { FilmstripFrameCard } from '../hooks/studio-view-model.js';

export interface GaitFilmstripProps {
  readonly cards: readonly FilmstripFrameCard[];
  readonly onSelectFrame: (frameIndexZeroBased: number) => void;
}

export function GaitFilmstrip(props: GaitFilmstripProps) {
  return (
    <section className="panel filmstrip-panel">
      <div className="section-heading">
        <div>
          <span className="badge badge--cyan">8-FRAME SYNCHRONIZED FILMSTRIP</span>
          <h2 className="section-title">
            Algorithmic Alternating Gait (Top) vs Extracted Flawed Sheet (Bottom)
          </h2>
        </div>
        <p className="section-note">
          Click any column (1–8) to inspect that exact phase. Notice how Columns 5–8 in the
          algorithmic row swap the lead leg (Left/Far dark leg in front), whereas Columns 5–8 in
          the extracted row are duplicates of Columns 1–4.
        </p>
      </div>
      <div className="filmstrip-grid">
        {props.cards.map((card) => (
          <FilmstripColumn
            key={card.frameNumber}
            card={card}
            onSelect={() => props.onSelectFrame(card.frameNumber - 1)}
          />
        ))}
      </div>
    </section>
  );
}

interface FilmstripColumnProps {
  readonly card: FilmstripFrameCard;
  readonly onSelect: () => void;
}

function FilmstripColumn(props: FilmstripColumnProps) {
  const { card } = props;
  const colClass = card.isActiveFrame
    ? 'filmstrip-col filmstrip-col--active'
    : 'filmstrip-col';
  const dupBadgeClass = card.isDuplicateFrame
    ? 'status-tag status-tag--dup'
    : 'status-tag status-tag--unique';
  return (
    <button
      type="button"
      data-testid={`gait-filmstrip__frame-${card.frameNumber}`}
      className={colClass}
      onClick={props.onSelect}
    >
      <div className="filmstrip-col__header">
        <strong>F{card.frameNumber}</strong>
        <span>{card.phaseFormatted}</span>
      </div>
      <div className="filmstrip-thumb-box filmstrip-thumb-box--algo">
        <img
          src={card.algorithmicUrl}
          alt={`Algorithmic frame ${card.frameNumber}`}
          width={96}
          height={112}
        />
        <span className="thumb-caption">{card.phaseLabel}</span>
        <span className="thumb-subcaption">{card.leadLegLabel}</span>
      </div>
      <div className="filmstrip-thumb-box filmstrip-thumb-box--extracted">
        <img
          src={card.extractedUrl}
          alt={`Extracted frame ${card.frameNumber}`}
          width={96}
          height={112}
        />
        <span className={dupBadgeClass}>{card.extractedStatusBadge}</span>
      </div>
    </button>
  );
}
