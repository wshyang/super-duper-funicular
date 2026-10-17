import React from 'react';
import {
  type CapCutComparisonMode,
  INSPECTABLE_JOINT_PARTS,
  type InspectableJointPartId,
  type InspectorStudioInput,
  type PivotEndSelection,
  useJointAndAuditInspector,
} from '../hooks/useJointAndAuditInspector.js';

export function JointAndCycleAuditPanel({
  input,
}: {
  readonly input: InspectorStudioInput;
}): React.ReactElement {
  const inspector = useJointAndAuditInspector(input);
  return (
    <section
      className="rig-panel-section"
      data-testid="joint-audit-panel"
    >
      <div className="section-header-bar">
        <div>
          <h2>
            Joint End-Cutter & 16-Phase Full-Cycle Visual Audit Workbench
          </h2>
          <p>
            Interactive pivot-centered rounded end-cap & composite cuff inspector
            plus live 16-phase 3-panel (Light / Dark / Joint Overlay) gait cycle
            audit exporter.
          </p>
        </div>
        <div className="sheet-links-group">
          <button
            type="button"
            className="btn-primary"
            data-testid="joint-audit-panel__export-audit-png"
            onClick={inspector.downloadAuditPng}
          >
            Export 16-Phase Audit · PNG
          </button>
        </div>
      </div>
      <div className="comparison-grid">
        <JointEndCutterCard inspector={inspector} />
        <SixteenPhaseAuditCard inspector={inspector} />
      </div>
    </section>
  );
}

type InspectorState = ReturnType<typeof useJointAndAuditInspector>;

function JointEndCutterCard({
  inspector,
}: {
  readonly inspector: InspectorState;
}): React.ReactElement {
  return (
    <article className="stage-card">
      <div className="stage-card-header">
        <h3>Articulated Element End-Cutter & Cuff Composite</h3>
        <span className="badge badge--emerald">
          {inspector.activePartMeta.compositeNote}
        </span>
      </div>
      <div className="control-row">
        <label className="control-label">
          Articulated Element
          <select
            className="select-input"
            data-testid="joint-audit-panel__part-select"
            value={inspector.selectedPart}
            onChange={(e) =>
              inspector.setSelectedPart(e.target.value as InspectableJointPartId)
            }
          >
            {INSPECTABLE_JOINT_PARTS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="control-label">
          Pivot End
          <select
            className="select-input"
            data-testid="joint-audit-panel__pivot-end-select"
            value={inspector.pivotEnd}
            onChange={(e) =>
              inspector.setPivotEnd(e.target.value as PivotEndSelection)
            }
          >
            <option value="proximal">Proximal (Start Pivot y=36)</option>
            <option value="distal">Distal (End Pivot y=124)</option>
          </select>
        </label>
      </div>
      <div className="control-row">
        <button
          type="button"
          className="btn-secondary"
          data-testid="joint-audit-panel__mode-rounded"
          onClick={() =>
            inspector.setComparisonMode('rounded-composite' as CapCutComparisonMode)
          }
        >
          Rounded Cap + Cuff Composite
        </button>
        <button
          type="button"
          className="btn-secondary"
          data-testid="joint-audit-panel__mode-square"
          onClick={() =>
            inspector.setComparisonMode('base-square' as CapCutComparisonMode)
          }
        >
          Compare Square Corner Overlay
        </button>
        <label className="control-label">
          Test Rotation ({inspector.angleLabel})
          <input
            type="range"
            min={-75}
            max={75}
            step={1}
            value={inspector.angleDeg}
            data-testid="joint-audit-panel__angle-slider"
            onChange={(e) => inspector.setAngleDeg(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="canvas-frame">
        <canvas
          ref={inspector.jointCanvasRef}
          width={320}
          height={240}
          className="runner-canvas"
          data-testid="joint-audit-panel__joint-canvas"
        />
      </div>
    </article>
  );
}

function SixteenPhaseAuditCard({
  inspector,
}: {
  readonly inspector: InspectorState;
}): React.ReactElement {
  return (
    <article className="stage-card">
      <div className="stage-card-header">
        <h3>16-Phase 3-Panel Full-Cycle Diagnostic Grid (0°..337.5°)</h3>
        <span className="badge badge--emerald">
          Detached Islands: 0 · Spill: 0 · Joint Coverage: 16/16
        </span>
      </div>
      <div className="canvas-frame">
        <canvas
          ref={inspector.auditCanvasRef}
          width={960}
          height={448}
          className="runner-canvas"
          data-testid="joint-audit-panel__cycle-audit-canvas"
        />
      </div>
    </article>
  );
}
