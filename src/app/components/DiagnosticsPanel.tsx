import type {
  FormattedCatalogRow,
  FormattedFlawCard,
  FormattedHalfCycleRow,
} from '../hooks/static-diagnostics-data.js';

export interface DiagnosticsPanelProps {
  readonly flawCards: readonly FormattedFlawCard[];
  readonly halfCycleRows: readonly FormattedHalfCycleRow[];
  readonly catalogRows: readonly FormattedCatalogRow[];
}

export function DiagnosticsPanel(props: DiagnosticsPanelProps) {
  return (
    <section className="panel diagnostics-panel">
      <FlawCardsSection flawCards={props.flawCards} />
      <HalfCycleAndCatalogSection
        halfCycleRows={props.halfCycleRows}
        catalogRows={props.catalogRows}
      />
    </section>
  );
}

function FlawCardsSection(props: { readonly flawCards: readonly FormattedFlawCard[] }) {
  return (
    <div className="diagnostics-block">
      <div className="section-heading">
        <div>
          <span className="badge badge--rose">BIOMECHANICAL FLAW ASSESSMENT</span>
          <h2 className="section-title">
            Why the Extracted Reference Sprite Sheet Animation Fails
          </h2>
        </div>
        <code className="url-pill">/sprites/extracted/analysis.json</code>
      </div>
      <div className="flaw-cards-grid">
        {props.flawCards.map((flaw) => (
          <article
            key={flaw.id}
            className="flaw-card"
            data-testid={`diagnostics-panel__flaw-${flaw.id}`}
          >
            <div className="flaw-card__header">
              <span className="badge badge--rose">
                {flaw.id} · {flaw.severity}
              </span>
              <h3 className="flaw-card__title">{flaw.title}</h3>
            </div>
            <p className="flaw-card__summary">{flaw.summary}</p>
            <div className="flaw-card__detail">
              <strong>Measured Evidence:</strong> {flaw.quantitativeEvidence}
            </div>
            <div className="flaw-card__detail">
              <strong>Biomechanical Effect:</strong> {flaw.biomechanicalImpact}
            </div>
            <div className="flaw-card__fix">
              <strong>Algorithmic Fix:</strong> {flaw.algorithmicFix}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

interface TablesProps {
  readonly halfCycleRows: readonly FormattedHalfCycleRow[];
  readonly catalogRows: readonly FormattedCatalogRow[];
}

function HalfCycleAndCatalogSection(props: TablesProps) {
  return (
    <div className="tables-split-grid">
      <HalfCycleTableCard rows={props.halfCycleRows} />
      <CatalogTableCard rows={props.catalogRows} />
    </div>
  );
}

function HalfCycleTableCard(props: { readonly rows: readonly FormattedHalfCycleRow[] }) {
  return (
    <div className="table-card">
      <h3 className="table-card__title">
        Half-Cycle Duplication Proof (Frames 1–4 vs Frames 5–8)
      </h3>
      <table className="data-table" data-testid="diagnostics-panel__duplication-table">
        <thead>
          <tr>
            <th>Column Pair</th>
            <th>Silhouette IoU</th>
            <th>dHash64 Dist</th>
            <th>Deduplication Verdict</th>
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row) => (
            <tr key={row.pairLabel}>
              <td>{row.pairLabel}</td>
              <td>{row.iouPercent}</td>
              <td>{row.dHashLabel}</td>
              <td className="text-rose">{row.verdictLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CatalogTableCard(props: { readonly rows: readonly FormattedCatalogRow[] }) {
  return (
    <div className="table-card">
      <h3 className="table-card__title">Deduplicated /src/images Asset Catalog &amp; Hashes</h3>
      <table className="data-table" data-testid="diagnostics-panel__catalog-table">
        <thead>
          <tr>
            <th>Filed Path in /src/images</th>
            <th>Category</th>
            <th>Dimensions</th>
            <th>Pixel SHA-256</th>
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row) => (
            <tr key={row.filedPath}>
              <td>
                <code>{row.filedPath}</code>
              </td>
              <td>{row.category}</td>
              <td>{row.dimensionsLabel}</td>
              <td>
                <code>{row.shortPixelHash}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
