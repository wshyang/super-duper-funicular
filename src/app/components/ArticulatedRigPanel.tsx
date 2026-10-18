import React from 'react';
import type { RunnerSkinDefinition } from '../../runner/skin-registry.js';
import type { ArticulatedPartReadout } from '../hooks/studio-view-model.js';

export interface ArticulatedRigPanelProps {
  readonly partReadouts: readonly ArticulatedPartReadout[];
  readonly activePersonaSkin: RunnerSkinDefinition;
}

export function ArticulatedRigPanel({
  partReadouts,
  activePersonaSkin,
}: ArticulatedRigPanelProps): React.ReactElement {
  return (
    <section className="rig-panel-section" data-testid="articulated-rig-panel">
      <div className="section-header-bar">
        <div>
          <h2>
            17-Part Articulated Rig & Skinnable Cutouts ({activePersonaSkin.title})
          </h2>
          <p>
            Every anatomical element — including the articulated cervical neck pivot,
            dynamic ponytail/hair accessory, forward-falling torso, limbs, and 2-segment
            rolling feet — is individually generated and exposed under{' '}
            <code>
              /sprites/algorithmic/parts/{activePersonaSkin.id}/
            </code>
            .
          </p>
        </div>
        <div className="sheet-links-group">
          <a
            href="/sprites/photoreal/sg-chinese-female/svg-frames/frame-01.svg"
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
            data-testid="stitched-svg-rig-link"
          >
            Stitched SVG Vector Rig (Frame 1) ↗
          </a>
          <a
            href="/sprites/algorithmic/runner-8frame-6color-photoreal-female-sheet.png"
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
            data-testid="photoreal-female-sheet-link"
          >
            Photoreal Female Sheet (48 Cells) ↗
          </a>
          <a
            href="/sprites/algorithmic/runner-8frame-6color-female-algorithmic-sheet.png"
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
          >
            Sprite Female Sheet (48 Cells) ↗
          </a>
          <a
            href="/sprites/algorithmic/runner-8frame-6color-algorithmic-sheet.png"
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
          >
            Sprite Male Sheet (48 Cells) ↗
          </a>
        </div>
      </div>
      <div className="parts-grid">
        {partReadouts.map((item) => (
          <PartReadoutCard key={item.part.partId} item={item} />
        ))}
      </div>
    </section>
  );
}

function PartReadoutCard({
  item,
}: {
  readonly item: ArticulatedPartReadout;
}): React.ReactElement {
  return (
    <article
      className="part-card"
      data-testid={`articulated-part-${item.part.partId}`}
    >
      <div className="part-card-top">
        <span className="layer-pill">Layer #{item.part.layerOrder}</span>
        <span className={`side-pill side-pill--${item.part.side}`}>
          {item.part.side.toUpperCase()}
        </span>
      </div>
      <div className="part-preview-box">
        <img
          src={item.cutoutUrl}
          alt={item.part.label}
          className="part-cutout-img"
        />
      </div>
      <h4 className="part-title">{item.part.label}</h4>
      <dl className="part-metrics-list">
        <div>
          <dt>Joint Chain</dt>
          <dd>
            {item.part.parentJoint} → {item.part.childJoint}
          </dd>
        </div>
        <div>
          <dt>Live Angle</dt>
          <dd>{item.liveAngleDegFormatted}</dd>
        </div>
        <div>
          <dt>Joint XY</dt>
          <dd>{item.jointCoordsFormatted}</dd>
        </div>
        <div>
          <dt>State</dt>
          <dd>{item.groundStateLabel}</dd>
        </div>
      </dl>
      <a
        href={item.cutoutUrl}
        target="_blank"
        rel="noreferrer"
        className="part-url-link"
      >
        {item.cutoutUrl}
      </a>
      <a
        href={item.svgPartUrl}
        target="_blank"
        rel="noreferrer"
        className="part-url-link"
        data-testid={`svg-part-link-${item.part.partId}`}
      >
        SVG Vector: {item.svgPartUrl}
      </a>
    </article>
  );
}
