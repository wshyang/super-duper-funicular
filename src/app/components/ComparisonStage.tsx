import React, { useEffect, useRef } from 'react';
import type {
  ArticulatedPose,
  BackdropVariantId,
  RasterImage,
} from '../../shared/types.js';
import type { RunnerSkinDefinition } from '../../runner/skin-registry.js';
import type {
  FootOrbitSample,
  FormattedPoseSummary,
  OverlayVisibility,
} from '../hooks/studio-view-model.js';
import { paintAlgorithmicStageCanvas } from './canvas-painter.js';

export interface ComparisonStageProps {
  readonly currentPose: ArticulatedPose;
  readonly currentRaster: RasterImage;
  readonly previousRaster: RasterImage;
  readonly activePersonaSkin: RunnerSkinDefinition;
  readonly backdrop: BackdropVariantId;
  readonly skeletonOverlay: OverlayVisibility;
  readonly orbitTrailOverlay: OverlayVisibility;
  readonly onionSkinOverlay: OverlayVisibility;
  readonly footOrbitSamples: readonly FootOrbitSample[];
  readonly poseSummary: FormattedPoseSummary;
  readonly activeExtractedFrameUrl: string;
}

export function ComparisonStage({
  props,
}: {
  readonly props: ComparisonStageProps;
}): React.ReactElement {
  return (
    <section className="comparison-stage-section" data-testid="comparison-stage">
      <div className="stage-cards-grid">
        <AlgorithmicViewportCard props={props} />
        <ExtractedFlawedViewportCard props={props} />
      </div>
      <BiomechanicalReadoutBar summary={props.poseSummary} />
    </section>
  );
}

function AlgorithmicViewportCard({
  props,
}: {
  readonly props: ComparisonStageProps;
}): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    paintAlgorithmicStageCanvas({
      ctx,
      pose: props.currentPose,
      currentRaster: props.currentRaster,
      previousRaster: props.previousRaster,
      backdrop: props.backdrop,
      skeletonOverlay: props.skeletonOverlay,
      orbitTrailOverlay: props.orbitTrailOverlay,
      onionSkinOverlay: props.onionSkinOverlay,
      orbitSamples: props.footOrbitSamples,
    });
  }, [props]);

  return (
    <div className="viewport-card viewport-card--algorithmic">
      <div className="viewport-card-header">
        <div>
          <span className="badge badge--success">ALGORITHMIC 2-BONE IK + FOOT ROLL</span>
          <h3>{props.activePersonaSkin.title}</h3>
        </div>
        <span className="frame-pill">{props.poseSummary.frameBadge}</span>
      </div>
      <div className="canvas-stage-wrapper">
        <canvas
          ref={canvasRef}
          width={220}
          height={256}
          className="runner-stage-canvas"
          data-testid="algorithmic-runner-canvas"
        />
      </div>
      <p className="viewport-caption">
        <strong>{props.poseSummary.phaseName}</strong> — Forward-falling torso, articulated
        cervical neck, and 2-segment foot roll (midfoot strike → ball roll → toe-off).
      </p>
    </div>
  );
}

function ExtractedFlawedViewportCard({
  props,
}: {
  readonly props: ComparisonStageProps;
}): React.ReactElement {
  const backdropClass = `extracted-stage-box extracted-stage-box--${props.backdrop}`;
  return (
    <div className="viewport-card viewport-card--flawed">
      <div className="viewport-card-header">
        <div>
          <span className="badge badge--warning">EXTRACTED SOURCE SHEET (FLAWED)</span>
          <h3>Original Cutout Sprite</h3>
        </div>
        <span className="frame-pill">{props.poseSummary.frameBadge}</span>
      </div>
      <div className={backdropClass}>
        <img
          src={props.activeExtractedFrameUrl}
          alt={props.poseSummary.frameBadge}
          className="extracted-sprite-img"
          data-testid="extracted-runner-img"
        />
        <div className="ground-reference-line" />
      </div>
      <p className="viewport-caption viewport-caption--warning">
        {props.poseSummary.extractedFlawWarning}
      </p>
    </div>
  );
}

function BiomechanicalReadoutBar({
  summary,
}: {
  readonly summary: FormattedPoseSummary;
}): React.ReactElement {
  return (
    <div className="readout-bar" data-testid="biomechanical-readout-bar">
      <div className="readout-item">
        <span className="readout-label">Stride Phase</span>
        <strong className="readout-value">{summary.phaseFormatted}</strong>
      </div>
      <div className="readout-item">
        <span className="readout-label">Forward-Fall Lead</span>
        <strong className="readout-value" data-testid="readout-forward-fall">
          {summary.fallForwardLeadPx}
        </strong>
      </div>
      <div className="readout-item">
        <span className="readout-label">Cervical Neck Pivot</span>
        <strong className="readout-value" data-testid="readout-neck-angle">
          {summary.neckAngleDeg}
        </strong>
      </div>
      <div className="readout-item">
        <span className="readout-label">Plantar Foot Roll</span>
        <strong className="readout-value" data-testid="readout-foot-roll">
          {summary.footRollStatus}
        </strong>
      </div>
      <div className="readout-item">
        <span className="readout-label">Ankle Crossover ΔX</span>
        <strong className="readout-value">{summary.crossoverPx}</strong>
      </div>
      <div className="readout-item">
        <span className="readout-label">Support State</span>
        <strong className="readout-value readout-value--accent">
          {summary.flightBadge}
        </strong>
      </div>
    </div>
  );
}
