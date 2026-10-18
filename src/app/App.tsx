import React, { useState } from 'react';
import { useStageLearnings, useStageManifest } from './hooks/useStageManifest.js';
import { CycleViewer, LearningsPanel, PartsGrid, PlateSkeleton } from './components/StagePanels.js';

const PERSONA = 'photo-sg-chinese-female-masters';

const section: React.CSSProperties = { background: '#161a22', border: '1px solid #2a3040', borderRadius: 10, padding: 16, marginBottom: 16 };
const h2: React.CSSProperties = { margin: '0 0 4px', fontSize: 16, color: '#8fb7ff', letterSpacing: 0.4 };
const sub: React.CSSProperties = { margin: '0 0 12px', fontSize: 12.5, color: '#7d8699', lineHeight: 1.5 };
const mono: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 };

export default function App(): React.ReactElement {
  const manifest = useStageManifest(PERSONA);
  const learnings = useStageLearnings(manifest.status === 'ok' ? manifest.value.learningsUrl : null);
  const [showV1, setShowV1] = useState(false);
  const [plateIdx, setPlateIdx] = useState(0);

  return (
    <div data-testid="workbench-app" style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 20px 60px' }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 22 }}>Persona Pipeline Workbench</h1>
        <div style={sub}>
          super-duper-funicular · Route B (photoreal atlas → part extraction → bone rig) vertical slice · run <code>masters-cycle-01</code> ·
          persona <code>{PERSONA}</code> (Singapore Chinese female masters sprinter). Read-only review surface per PIPELINE_REVISION_PROPOSAL §11 (<code>#surf-workbench</code>).
        </div>
      </header>

      {manifest.status !== 'ok' && (
        <div style={section}>
          {manifest.status === 'loading' ? 'loading stage manifest…' : `manifest error: ${manifest.status === 'error' ? manifest.error : ''}`}
        </div>
      )}

      {manifest.status === 'ok' && (
        <>
          <section style={section}>
            <h2 style={h2}>Stage 0–1 · Atlas plates + calibration overlay</h2>
            <p style={sub}>
              Green skeleton = refined landmarks used by extraction; amber = v1 agent estimates (toggle to see what Stage 2.5 changed).
              Plates are served straight from <code>src/images/</code> via <code>/repo-assets</code> — no duplicates in <code>public/</code>.
            </p>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center', ...mono }}>
              {manifest.value.plates.map((p, i) => (
                <button key={p.poseId} onClick={() => setPlateIdx(i)} style={{ borderColor: i === plateIdx ? '#8fb7ff' : '#2a3040' }}>{p.poseId}</button>
              ))}
              <label><input type="checkbox" checked={showV1} onChange={(e) => setShowV1(e.target.checked)} /> show v1 estimates</label>
            </div>
            <PlateSkeleton plate={manifest.value.plates[plateIdx] ?? manifest.value.plates[0]} showV1={showV1} />
          </section>

          <section style={section}>
            <h2 style={h2}>Stage 2 · Calibration provenance</h2>
            <p style={sub}>
              scale {manifest.value.scale} px/src-px · rig lengths (dst px):{' '}
              {Object.entries(manifest.value.lengths).map(([k, v]) => `${k}=${v}`).join(' ')}
            </p>
          </section>

          <section style={section}>
            <h2 style={h2}>Stage 3–4 · Extracted parts (ownership + relight)</h2>
            <p style={sub}>
              17 parts; checkerboard = alpha. <code>kept</code> = owned window share, <code>relight</code> = luminance scale toward the matching master region (clamped 0.85–1.15).
            </p>
            <PartsGrid manifest={manifest.value} />
          </section>

          <section style={section}>
            <h2 style={h2}>Stage 5 · Rendered gait cycle + gate metrics</h2>
            <p style={sub}>
              220×256 frames, painter z-order, sinusoidal placeholder gait (MVP vertical registration: lower sole on ground line; ballistic flight deferred).
              Gates per frame: <code>opaqueComponents==1</code> (green) and ground delta (green ≤ ±10).
            </p>
            <CycleViewer manifest={manifest.value} />
          </section>

          <section style={section}>
            <h2 style={h2}>Stage 6–7 · Self-review ledger</h2>
            <p style={sub}>Learnings and open defects recorded while walking the pipeline (failures are content). Source: <code>docs/evidence/masters-cycle-01/stage-learnings.json</code>.</p>
            {learnings.status === 'ok' ? (
              <LearningsPanel doc={learnings.value} />
            ) : (
              <div style={mono}>{learnings.status === 'loading' ? 'loading learnings…' : `learnings error: ${learnings.status === 'error' ? learnings.error : ''}`}</div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
