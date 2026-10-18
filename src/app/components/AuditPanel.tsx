import { APNG_URL, COMPOSE_REPORT, CONTACT_SHEET_URL, MASTER_PLATE_URL, SPRITESHEET_URL, type GroundAdherenceEntry } from '../data/sequence-manifest';
import { AuditPlates } from './AuditPlates';

export function AuditPanel() {
  const stanceDeltas = COMPOSE_REPORT.groundAdherence.filter((entry) => entry.liftPx === 0).map((entry) => entry.groundDeltaPx);
  const worstStanceDelta = Math.max(...stanceDeltas.map((delta) => Math.abs(delta)));
  return (
    <section className="audit">
      <h2>Audit</h2>
      <p data-testid="audit__summary">
        persona <strong>{COMPOSE_REPORT.personaId}</strong> · canvas {COMPOSE_REPORT.canvas.widthPx}×{COMPOSE_REPORT.canvas.heightPx} ·
        ground y {COMPOSE_REPORT.canvas.groundY} · worst stance |Δ| <strong>{worstStanceDelta} px</strong> (gate ≤ 2 px) · composed{' '}
        {COMPOSE_REPORT.composedAtUtc.slice(0, 19)}Z
      </p>
      <div className="audit__links">
        <a href={APNG_URL} download data-testid="audit__download-apng">
          download APNG
        </a>
        <a href={SPRITESHEET_URL} download data-testid="audit__download-sheet">
          download 8-frame sheet
        </a>
        <a href={CONTACT_SHEET_URL} download data-testid="audit__download-contact">
          download contact sheet
        </a>
      </div>
      <AuditTable entries={COMPOSE_REPORT.groundAdherence} />
      <AuditPlates masterUrl={MASTER_PLATE_URL} contactSheetUrl={CONTACT_SHEET_URL} />
    </section>
  );
}

function AuditTable({ entries }: { readonly entries: readonly GroundAdherenceEntry[] }) {
  return (
    <table data-testid="audit__table">
      <thead>
        <tr>
          <th>frame</th>
          <th>phase</th>
          <th>sole Δ (px)</th>
          <th>lift (px)</th>
          <th>base key</th>
          <th>blend key</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.frameIndex}>
            <td>{entry.frameIndex}</td>
            <td>{entry.phase.toFixed(4)}</td>
            <td>{entry.groundDeltaPx}</td>
            <td>{entry.liftPx}</td>
            <td>{entry.baseKeyPhase.toFixed(3)}</td>
            <td>{entry.blendKeyPhase === null ? '—' : entry.blendKeyPhase.toFixed(3)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
