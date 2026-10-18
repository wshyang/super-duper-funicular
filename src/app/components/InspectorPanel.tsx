import type { BodyPartId, GaitSettings } from '../../shared/types.ts';
import { PART_LABELS, PART_ORDER } from '../../shared/constants.ts';
import { Stage } from './Stage.tsx';
import type { PoseInfo } from '../hooks/usePoseInfo.ts';
import type { CalibrationState } from '../hooks/useCalibration.ts';
import { CalibrationPanel } from './CalibrationPanel.tsx';

export interface InspectorPanelProps {
  readonly settings: GaitSettings;
  readonly phase: number;
  readonly info: PoseInfo;
  readonly selected: BodyPartId | 'all';
  readonly onSelect: (part: BodyPartId | 'all') => void;
  readonly calibration: CalibrationState;
  readonly busy: boolean;
  readonly onExportJson: () => void;
  readonly onExportSheet: () => void;
}

const PART_LISTS = [
  { title: 'Far chain · back to front', parts: PART_ORDER.slice(0, 6) },
  { title: 'Centre mass', parts: PART_ORDER.slice(6, 11) },
  { title: 'Near chain · front layer', parts: PART_ORDER.slice(11) },
] as const;

const PartList = ({
  selected,
  onSelect,
}: {
  selected: BodyPartId | 'all';
  onSelect: (part: BodyPartId | 'all') => void;
}): React.JSX.Element => (
  <div className="inspector__lists">
    <button
      type="button"
      className={selected === 'all' ? 'part-row part-row--active' : 'part-row'}
      onClick={() => onSelect('all')}
      data-testid="inspector__part-all"
    >
      All 17 parts
    </button>
    {PART_LISTS.map((group) => (
      <div key={group.title} className="inspector__group">
        <h3 className="control-label">{group.title}</h3>
        {group.parts.map((part) => (
          <button
            key={part}
            type="button"
            className={selected === part ? 'part-row part-row--active' : 'part-row'}
            onClick={() => onSelect(part)}
            data-testid={`inspector__part-${part}`}
          >
            {PART_LABELS[part] ?? part}
          </button>
        ))}
      </div>
    ))}
  </div>
);

const isolatedLabelFor = (selected: BodyPartId | 'all'): string =>
  selected === 'all' ? 'All 17 parts' : (PART_LABELS[selected] ?? selected);

export const InspectorPanel = ({
  settings,
  phase,
  info,
  selected,
  onSelect,
  calibration,
  busy,
  onExportJson,
  onExportSheet,
}: InspectorPanelProps): React.JSX.Element => {
  const visibleParts = selected === 'all' ? undefined : [selected];
  return (
    <section className="panel panel--inspector" aria-label="17-part rig inspector">
      <h2 className="panel-title">17-part rig inspector</h2>
      <p className="panel-hint">
        Select a part to isolate it. Parts are listed in painter order, far side first.
      </p>
      <div className="inspector">
        <div className="inspector__stage">
          <Stage
            settings={settings}
            phase={phase}
            showSkeleton={false}
            showGround={false}
            onionSkin={false}
            compare={false}
            referenceUrl={null}
            referenceLabel=""
            info={info}
            visibleParts={visibleParts}
            isolatedLabel={isolatedLabelFor(selected)}
            calibration={calibration.calibration}
          />
        </div>
        <PartList selected={selected} onSelect={onSelect} />
      </div>
      <CalibrationPanel
        state={calibration}
        busy={busy}
        onExportJson={onExportJson}
        onExportSheet={onExportSheet}
      />
    </section>
  );
};
