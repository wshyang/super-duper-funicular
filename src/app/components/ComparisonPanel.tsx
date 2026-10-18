import type { BranchTip } from '../../shared/types.ts';
import { countByStatus, type ParityRow } from '../../shared/parity.ts';

export interface ComparisonPanelProps {
  readonly tips: readonly BranchTip[];
  readonly observedAt: string;
  readonly rows: readonly ParityRow[];
}

const COLUMNS = [
  ['Sprite Motion Lab', 'spriteMotionLab'],
  ['Stride Lab', 'strideLab'],
  ['Funicular', 'funicular'],
  ['Procedural Runner', 'proceduralRunner'],
  ['Ours', 'ours'],
] as const;

const STATUS_CLASS: Readonly<Record<string, string>> = {
  yes: 'status status--yes',
  partial: 'status status--partial',
  gap: 'status status--gap',
  unverified: 'status status--unverified',
};

const STATUS_LABEL: Readonly<Record<string, string>> = {
  yes: 'Yes',
  partial: 'Partial',
  gap: 'Gap',
  unverified: '?',
};

const TipList = ({ tips }: { tips: readonly BranchTip[] }): React.JSX.Element => (
  <div className="tip-list">
    {tips.map((tip) => (
      <div key={tip.branch} className="tip">
        <span className="tip__name">{tip.name}</span>
        <code className="tip__hash">{tip.hash.slice(0, 12)}</code>
        <span className="tip__branch">{tip.branch}</span>
        <span className="tip__subject">{tip.subject}</span>
      </div>
    ))}
  </div>
);

const ParityTable = ({ rows }: { rows: readonly ParityRow[] }): React.JSX.Element => (
  <div className="parity-table-wrap">
    <table className="parity-table">
      <caption className="visually-hidden">Capability parity across sibling branches</caption>
      <thead>
        <tr>
          <th scope="col">Capability</th>
          {COLUMNS.map(([label]) => (
            <th key={label} scope="col">
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.capability}>
            <th scope="row">
              {row.capability}
              <span className="parity-acceptance">{row.acceptance}</span>
            </th>
            {COLUMNS.map(([label, key]) => (
              <td key={label}>
                <span className={STATUS_CLASS[row[key]]}>{STATUS_LABEL[row[key]]}</span>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const ComparisonPanel = ({
  tips,
  observedAt,
  rows,
}: ComparisonPanelProps): React.JSX.Element => {
  const counts = countByStatus();
  return (
    <section className="panel" aria-label="n-way parity ledger">
      <div className="panel-head">
        <h2 className="panel-title">Live n-way parity ledger</h2>
        <span className="stage__badge stage__badge--muted">observed {observedAt}</span>
      </div>
      <p className="panel-hint">
        Five sibling branches, one capability union. A capability is only “Yes” when the acceptance
        note holds in that implementation; test counts are not scores. The authoritative narrative,
        hashes and adoption queue live in <code>docs/N_WAY_COMPARISON.md</code> and are refreshed
        with <code>npm run branches:compare</code>.
      </p>
      <TipList tips={tips} />
      <div className="parity-summary">
        <span className="status status--yes">Yes {counts.yes}</span>
        <span className="status status--partial">Partial {counts.partial}</span>
        <span className="status status--gap">Gap {counts.gap}</span>
        <span className="status status--unverified">Unverified {counts.unverified}</span>
      </div>
      <ParityTable rows={rows} />
    </section>
  );
};
