import type { FlawAnalysis } from '../../shared/types.ts';

export interface DiagnosticsPanelProps {
  readonly analysis: FlawAnalysis | null;
  readonly status: 'loading' | 'ready' | 'error';
  readonly error: string | null;
  readonly onRetry: () => void;
}

const toPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;

interface Metric {
  readonly label: string;
  readonly value: string;
}

/** Formatting lives here, above the JSX, so the markup stays presentation-only. */
export const metricsFor = (analysis: FlawAnalysis): readonly Metric[] => [
  { label: 'Duplicate pairs', value: String(analysis.duplicatePairs.length) },
  { label: 'Mean duplicate IoU', value: toPercent(analysis.meanDuplicateIou) },
  { label: 'Max duplicate IoU', value: toPercent(analysis.maxDuplicateIou) },
  { label: 'Scale jitter', value: `${analysis.scaleJitterPx.toFixed(1)} px` },
  { label: 'Baseline jitter', value: `${analysis.baselineJitterPx.toFixed(1)} px` },
  {
    label: 'Foot separation',
    value: `${analysis.minFootSeparationPx.toFixed(0)}–${analysis.maxFootSeparationPx.toFixed(0)} px`,
  },
  { label: 'Stance lock', value: toPercent(analysis.leadLegLockRatio) },
  { label: 'Crossed/merged feet', value: String(analysis.crossoverFrames) },
];

const MetricGrid = ({ metrics }: { metrics: readonly Metric[] }): React.JSX.Element => (
  <dl className="metric-grid">
    {metrics.map((metric) => (
      <div key={metric.label} className="metric">
        <dt>{metric.label}</dt>
        <dd>{metric.value}</dd>
      </div>
    ))}
  </dl>
);

const ErrorState = ({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}): React.JSX.Element => (
  <section className="panel panel--error" aria-label="Asset diagnostics">
    <h2 className="panel-title">Sprite analysis unavailable</h2>
    <p className="panel-hint">{message ?? 'The analysis could not be loaded.'}</p>
    <button
      type="button"
      className="secondary-button"
      onClick={onRetry}
      data-testid="diagnostics__retry"
    >
      Retry asset load
    </button>
  </section>
);

const LoadingState = (): React.JSX.Element => (
  <section className="panel" aria-label="Asset diagnostics">
    <h2 className="panel-title">Sprite analysis</h2>
    <p className="panel-hint" data-testid="diagnostics__loading">
      Loading manifest and flaw analysis…
    </p>
  </section>
);

export const DiagnosticsPanel = ({
  analysis,
  status,
  error,
  onRetry,
}: DiagnosticsPanelProps): React.JSX.Element => {
  if (status === 'error') return <ErrorState message={error} onRetry={onRetry} />;
  if (status === 'loading' || !analysis) return <LoadingState />;
  return (
    <section className="panel" aria-label="Asset diagnostics">
      <h2 className="panel-title">Source flaw analysis</h2>
      <p className="panel-hint">
        Measured from the real extracted silhouettes. These numbers describe the source artwork;
        they are not quality claims about the procedural rig.
      </p>
      <MetricGrid metrics={metricsFor(analysis)} />
      <ul className="finding-list">
        {analysis.findings.map((finding) => (
          <li key={finding}>{finding}</li>
        ))}
      </ul>
    </section>
  );
};
