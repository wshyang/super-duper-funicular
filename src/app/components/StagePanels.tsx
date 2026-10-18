import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { StageLearning, StageLearningsDoc, StageManifest, StageManifestPlate } from '../hooks/useStageManifest.js';

const BONES: [string, string][] = [
  ['neckBase', 'skullBase'], ['skullBase', 'skullTop'], ['collar', 'waist'], ['waist', 'femoralCut'],
  ['shoulderNear', 'elbowNear'], ['elbowNear', 'wristNear'], ['wristNear', 'handTipNear'],
  ['shoulderFar', 'elbowFar'], ['elbowFar', 'wristFar'], ['wristFar', 'handTipFar'],
  ['hipNear', 'kneeNear'], ['kneeNear', 'ankleNear'], ['ankleNear', 'ballNear'],
  ['hipFar', 'kneeFar'], ['kneeFar', 'ankleFar'], ['ankleFar', 'ballFar'],
  ['hairPivot', 'hairTip'],
];

const mono: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 };

/** Stage 6/7 self-review ledger: learnings + open defects from the run. */
export function LearningsPanel({ doc }: { doc: StageLearningsDoc }): React.ReactElement {
  const kindColor: Record<StageLearning['kind'], string> = { 'failure-mode': '#ffb454', 'design-decision': '#8fb7ff', defect: '#ff7d7d', win: '#7dff9b' };
  const grouped = useMemo(() => {
    const m = new Map<number, StageLearning[]>();
    for (const l of doc.learnings) {
      const arr = m.get(l.stage) ?? [];
      arr.push(l);
      m.set(l.stage, arr);
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [doc]);
  const defectRows = doc.defects;
  return (
    <div data-testid="learnings-panel">
      {grouped.map(([stage, items]) => (
        <div key={stage} style={{ marginBottom: 14 }}>
          <div style={{ ...mono, color: '#8fb7ff', marginBottom: 6 }}>STAGE {stage}</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {items.map((l) => (
              <li key={l.id} style={{ marginBottom: 6, ...mono }}>
                <span style={{ color: kindColor[l.kind] }}>[{l.kind}]</span> <b>{l.id}</b> — {l.summary} <span style={{ color: '#7d8699' }}>→ {l.action}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div style={{ ...mono, color: '#8fb7ff', margin: '10px 0 6px' }}>OPEN DEFECTS</div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {defectRows.map((d) => (
          <li key={d.id} style={{ marginBottom: 6, ...mono }}>
            <b>{d.id}</b> <span style={{ color: d.severity === 'structural' ? '#ff7d7d' : '#ffb454' }}>[{d.severity}]</span> {d.summary} <span style={{ color: '#7d8699' }}>→ {d.followUp}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Stage 0/1 plates with the refined calibration skeleton overlaid (calibration correction UI). */
export function PlateSkeleton({ plate, showV1 }: { plate: StageManifestPlate; showV1: boolean }): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const draw = (color: string, width: number, marks: Record<string, readonly number[]>): void => {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        for (const [a, b] of BONES) {
          const pa = marks[a];
          const pb = marks[b];
          if (!pa || !pb) continue;
          ctx.beginPath();
          ctx.moveTo(pa[0], pa[1]);
          ctx.lineTo(pb[0], pb[1]);
          ctx.stroke();
        }
        ctx.fillStyle = color;
        for (const p of Object.values(marks)) {
          ctx.fillRect(p[0] - 3, p[1] - 1, 7, 2);
          ctx.fillRect(p[0] - 1, p[1] - 3, 2, 7);
        }
      };
      if (showV1 && plate.landmarksV1) draw('rgba(255,196,0,0.85)', 2, plate.landmarksV1);
      draw('rgba(0,255,120,0.9)', 3, plate.landmarks);
    };
    img.src = plate.src;
  }, [plate, showV1]);
  return <canvas data-testid="plate-skeleton" ref={canvasRef} style={{ width: '100%', borderRadius: 8, border: '1px solid #2a3040' }} />;
}

/** Stage 3/4 part sheet: every extracted part with its provenance + metrics. */
export function PartsGrid({ manifest }: { manifest: StageManifest }): React.ReactElement {
  const rows = manifest.parts.map((p) => ({ ...p, keptPct: String(Math.round(p.keptRatio * 100)), relightLabel: String(Math.round(p.relightScale * 100) / 100) }));
  return (
    <div data-testid="parts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
      {rows.map((p) => (
        <div key={p.partId} style={{ background: '#0f1115', border: '1px solid #232a3a', borderRadius: 8, padding: 8, textAlign: 'center' }}>
          <img src={p.src} alt={p.partId} style={{ width: 96, height: 96, imageRendering: 'pixelated', background: 'repeating-conic-gradient(#1a1f2b 0% 25%, #12161f 0% 50%) 0 0/16px 16px' }} />
          <div style={{ ...mono, marginTop: 6 }}>{p.partId}</div>
          <div style={{ ...mono, color: '#7d8699' }}>src {p.sourcePose} · kept {p.keptPct}%</div>
          <div style={{ ...mono, color: '#7d8699' }}>L{p.restLength} W{p.halfWidth} · relight {p.relightLabel}</div>
        </div>
      ))}
    </div>
  );
}

/** Stage 5 cycle viewer: frame slider + contact sheet + per-frame gate metrics. */
export function CycleViewer({ manifest }: { manifest: StageManifest }): React.ReactElement {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setFrame((f) => (f + 1) % manifest.cycle.frames.length), 110);
    return () => clearInterval(t);
  }, [playing, manifest]);
  const audit = manifest.cycle.audit[frame];
  const phaseLabel = audit ? String(Math.round(audit.phase * 1000) / 1000) : '0';
  const frameLabel = `${frame + 1}/${manifest.cycle.frames.length}`;
  const auditComponents = audit ? audit.opaqueComponents : 0;
  const auditLowest = audit ? audit.lowestFootY : 0;
  const auditDelta = audit ? audit.groundLineDeltaPx : 0;
  const compColor = auditComponents === 1 ? '#7dff9b' : '#ffb454';
  const groundColor = auditDelta >= -10 && auditDelta <= 10 ? '#7dff9b' : '#ff7d7d';
  const src = manifest.cycle.frames[frame] ?? '';
  const maxFrame = manifest.cycle.frames.length - 1;
  return (
    <div data-testid="cycle-viewer" style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 320px) 1fr', gap: 16, alignItems: 'start' }}>
      <div>
        <img src={src} alt={`frame ${frame + 1}`} style={{ width: '100%', imageRendering: 'pixelated', background: '#f4f7fb', borderRadius: 8, border: '1px solid #2a3040' }} />
        <input type="range" min={0} max={maxFrame} value={frame} onChange={(e) => { setPlaying(false); setFrame(Number(e.target.value)); }} style={{ width: '100%' }} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', ...mono }}>
          <button onClick={() => setPlaying((p) => !p)}>{playing ? 'pause' : 'play'}</button>
          <span>frame {frameLabel} · phase {phaseLabel}</span>
        </div>
        <table style={{ ...mono, marginTop: 10, borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            <tr><td style={{ color: '#7d8699' }}>opaqueComponents</td><td style={{ color: compColor }}>{auditComponents}</td></tr>
            <tr><td style={{ color: '#7d8699' }}>lowestFootY</td><td>{auditLowest}</td></tr>
            <tr><td style={{ color: '#7d8699' }}>groundLineDeltaPx</td><td style={{ color: groundColor }}>{auditDelta}</td></tr>
          </tbody>
        </table>
      </div>
      <div>
        <img src={manifest.cycle.contact} alt="16-frame contact sheet" style={{ width: '100%', borderRadius: 8, border: '1px solid #2a3040' }} />
      </div>
    </div>
  );
}
