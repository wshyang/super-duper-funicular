import { useRef } from 'react';
import type { BodyPartId, Calibration, GaitSettings } from '../../shared/types.ts';
import { CANVAS } from '../../shared/constants.ts';
import { useStageCanvas } from '../hooks/useStageCanvas.ts';
import type { PoseInfo } from '../hooks/usePoseInfo.ts';

export interface StageProps {
  readonly settings: GaitSettings;
  readonly phase: number;
  readonly showSkeleton: boolean;
  readonly showGround: boolean;
  readonly onionSkin: boolean;
  readonly compare: boolean;
  readonly referenceUrl: string | null;
  readonly referenceLabel: string;
  readonly info: PoseInfo;
  readonly visibleParts?: readonly BodyPartId[];
  readonly calibration?: Calibration;
  readonly isolatedLabel?: string;
}

const SUPPORT_LABEL = {
  flight: 'Flight phase',
  double: 'Double support',
  single: 'Single support',
} as const;

const supportFor = (info: PoseInfo): string =>
  info.isFlight
    ? SUPPORT_LABEL.flight
    : info.isDoubleSupport
      ? SUPPORT_LABEL.double
      : info.motionName;

const Readout = ({ phase, label }: { phase: number; label: string }): React.JSX.Element => {
  const phaseLabel = phase.toFixed(3);
  const degrees = (phase * 360).toFixed(0);
  return (
    <div className="stage__readout" data-testid="stage__phase-readout">
      <span>φ {phaseLabel}</span>
      <span>{degrees}°</span>
      <span>{label}</span>
    </div>
  );
};

const ReferencePanel = ({
  url,
  label,
}: {
  url: string | null;
  label: string;
}): React.JSX.Element => (
  <div className="stage__panel stage__panel--reference">
    <div className="stage__panel-head">
      <span>Source artwork</span>
      <span className="stage__badge stage__badge--muted">{label}</span>
    </div>
    {url ? (
      <img
        className="stage__reference"
        src={url}
        alt={`Extracted reference frame ${label}`}
        data-testid="stage__reference-image"
      />
    ) : (
      <div className="stage__placeholder">Reference asset unavailable</div>
    )}
  </div>
);

export const Stage = (props: StageProps): React.JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scale = 2;
  useStageCanvas(canvasRef, {
    settings: props.settings,
    phase: props.phase,
    scale,
    showSkeleton: props.showSkeleton,
    showGround: props.showGround,
    onionSkin: props.onionSkin,
    visibleParts: props.visibleParts,
    calibration: props.calibration,
  });
  const support = supportFor(props.info);
  const partLabel = props.isolatedLabel ?? `${String(props.info.partCount)} parts`;
  const degrees = (props.phase * 360).toFixed(0);
  const ariaLabel = `${props.info.motionName} at ${degrees} degrees`;
  return (
    <section className="stage" aria-label="Procedural runner stage">
      <div className={props.compare ? 'stage__frames stage__frames--split' : 'stage__frames'}>
        <div className="stage__panel">
          <div className="stage__panel-head">
            <span>Procedural rig</span>
            <span className="stage__badge">{support}</span>
          </div>
          <canvas
            ref={canvasRef}
            width={CANVAS.width * scale}
            height={CANVAS.height * scale}
            className="stage__canvas"
            data-testid="stage__procedural-canvas"
            aria-label={ariaLabel}
          />
          <Readout phase={props.phase} label={partLabel} />
        </div>
        {props.compare ? (
          <ReferencePanel url={props.referenceUrl} label={props.referenceLabel} />
        ) : null}
      </div>
    </section>
  );
};
