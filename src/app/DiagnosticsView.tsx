import type { CSSProperties } from 'react';
import { PALETTE_BY_ID } from '../shared/constants';
import type { PaletteId, SourceAnalysis, SpriteManifest } from '../shared/types';

interface DiagnosticsViewProps {
  readonly analysis: SourceAnalysis | null;
  readonly manifest: SpriteManifest | null;
  readonly palette: PaletteId;
}

const mean = (values: readonly number[]): number =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

export const DiagnosticsView = ({
  analysis,
  manifest,
  palette,
}: DiagnosticsViewProps): React.JSX.Element => {
  if (!analysis || !manifest) {
    return (
      <main className="diagnostics-view" data-testid="diagnostics__view">
        <div className="diagnostics-empty">
          <span className="eyebrow">SOURCE ANALYSIS</span>
          <h2>Analysis is not available yet.</h2>
          <p>Build or retry the local source pipeline to load its measurements.</p>
        </div>
      </main>
    );
  }

  const nearPairCount = analysis.rows.reduce((sum, row) => sum + row.nearDuplicatePairs.length, 0);
  const maximumBaselineRange = Math.max(...analysis.rows.map((row) => row.baselineRangePx));
  const averageCycleSimilarity = mean(
    analysis.rows.flatMap((row) => row.quarterCyclePairs.map((pair) => pair.centroidAlignedIoU)),
  );

  return (
    <main className="diagnostics-view" data-testid="diagnostics__view">
      <section className="diagnostics-heading">
        <div>
          <span className="eyebrow">SOURCE ANALYSIS · REPRODUCIBLE MEASUREMENTS</span>
          <h2>What the sheet actually contains.</h2>
          <p>
            Measurements are computed from the preserved JPEG using the listed silhouette and
            registration rules. The separation score is a lower-band proxy, not semantic foot
            tracking.
          </p>
        </div>
        <span className="diagnostics-hash">SHA · {analysis.sourceSha256.slice(0, 16)}</span>
      </section>

      <section className="diagnostic-metrics" aria-label="Overall source findings">
        <article className="diagnostic-metric">
          <span>REGISTERED CELLS</span>
          <strong>
            {analysis.frameCount}
            <small> / 48</small>
          </strong>
          <em>
            {manifest.grid.columns} × {manifest.grid.rows} grid
          </em>
        </article>
        <article className="diagnostic-metric">
          <span>NEAR-DUPLICATE PAIRS</span>
          <strong>{nearPairCount}</strong>
          <em>IoU threshold ≥ {analysis.nearDuplicateThreshold.toFixed(2)}</em>
        </article>
        <article className="diagnostic-metric">
          <span>HALF-CYCLE MEAN IoU</span>
          <strong>{averageCycleSimilarity.toFixed(3)}</strong>
          <em>centroid-aligned silhouette measure</em>
        </article>
        <article className="diagnostic-metric">
          <span>MAX BASELINE RANGE</span>
          <strong>
            {maximumBaselineRange.toFixed(0)}
            <small> px</small>
          </strong>
          <em>across color rows</em>
        </article>
      </section>

      <section className="diagnostics-table-wrap">
        <div className="strip-heading">
          <div>
            <span className="eyebrow">COLORWAY BREAKDOWN</span>
            <h2>Row-by-row registration and repetition</h2>
          </div>
          <span className="strip-count">
            {analysis.exactDuplicateCount} exact duplicates · {analysis.magentaSpillPixels} magenta
            spill
          </span>
        </div>
        <div className="table-scroll">
          <table className="diagnostics-table">
            <thead>
              <tr>
                <th scope="col">Colorway</th>
                <th scope="col">Height range</th>
                <th scope="col">Baseline range</th>
                <th scope="col">Near pairs</th>
                <th scope="col">1–4 / 5–8 IoU</th>
              </tr>
            </thead>
            <tbody>
              {analysis.rows.map((row) => (
                <tr key={row.palette}>
                  <th scope="row">
                    <span
                      className="table-swatch"
                      style={
                        { '--swatch-color': PALETTE_BY_ID[row.palette].primary } as CSSProperties
                      }
                    />
                    {PALETTE_BY_ID[row.palette].label}
                  </th>
                  <td>{row.frameHeightRangePx.toFixed(0)} px</td>
                  <td>{row.baselineRangePx.toFixed(0)} px</td>
                  <td>{row.nearDuplicatePairs.length}</td>
                  <td>
                    {mean(row.quarterCyclePairs.map((pair) => pair.centroidAlignedIoU)).toFixed(3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="lower-band-card">
        <div>
          <span className="eyebrow">LOWER-BAND SEPARATION PROXY</span>
          <h2>Per-frame support-space signal</h2>
          <p>
            Opaque pixel clusters in the lowest 16% of each registered cell; useful as a quick
            diagnostic, not a foot-segmentation claim.
          </p>
        </div>
        <div className="lower-band-grid">
          {analysis.frames
            .filter((frame) => frame.palette === palette)
            .map((frame) => (
              <div key={frame.id} className="lower-band-frame" title={frame.id}>
                <span>{String(frame.column + 1).padStart(2, '0')}</span>
                <strong>{frame.lowerBandClusterCount}</strong>
                <small>{frame.lowerBandSeparationPx.toFixed(0)} px</small>
              </div>
            ))}
        </div>
      </section>
      <p className="diagnostics-method">
        Alignment translates silhouettes by the rounded centroid offset only; it does not scale
        frames. Height and baseline ranges use keyed alpha bounds. Near-duplicate pairs are retained
        in the source atlas and analysis manifest; no visual similarity score removes a frame.
      </p>
    </main>
  );
};
