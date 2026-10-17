import type { BodyPartId, ReferenceFrame } from '../../shared/types.ts';
import type { Workspace } from '../hooks/useWorkspace.ts';
import { useReferenceFrame } from '../hooks/useReferenceFrame.ts';
import { usePoseInfo } from '../hooks/usePoseInfo.ts';
import { CharacterPanel, GaitControls, OverlayBar, PlaybackBar } from './Controls.tsx';
import { DiagnosticsPanel } from './DiagnosticsPanel.tsx';
import { Filmstrip } from './Filmstrip.tsx';
import { Stage } from './Stage.tsx';

export interface StudioWorkspaceProps {
  readonly workspace: Workspace;
}

const Sidebar = ({ workspace }: StudioWorkspaceProps): React.JSX.Element => (
  <aside className="studio-layout__side">
    <CharacterPanel
      settings={workspace.settings}
      onChange={workspace.update}
      onReset={workspace.reset}
    />
    <GaitControls settings={workspace.settings} onChange={workspace.update} />
  </aside>
);

const RightRail = ({ workspace }: StudioWorkspaceProps): React.JSX.Element => {
  const { exports, sprite } = workspace;
  return (
    <aside className="studio-layout__side studio-layout__side--right">
      <OverlayBar
        overlays={workspace.overlays}
        onToggle={workspace.toggleOverlay}
        busy={exports.busy}
        onExportSprite={exports.exportSpriteSheet}
        onExportAudit={exports.exportAuditSheet}
      />
      {exports.error ? <p className="panel panel--error">{exports.error}</p> : null}
      <DiagnosticsPanel
        analysis={sprite.analysis}
        status={sprite.status}
        error={sprite.error}
        onRetry={sprite.retry}
      />
    </aside>
  );
};

export const StudioWorkspace = ({ workspace }: StudioWorkspaceProps): React.JSX.Element => {
  const { settings, clock, overlays, sprite } = workspace;
  const visibleParts: readonly BodyPartId[] | undefined =
    workspace.selectedPart === 'all' ? undefined : [workspace.selectedPart];
  const reference = useReferenceFrame(
    sprite.framesByPalette,
    settings.palette,
    Math.floor(((clock.phase + 0.0625) % 1) * 8) % 8,
  );
  const info = usePoseInfo(settings, clock.phase, visibleParts);
  const frames: readonly ReferenceFrame[] = sprite.framesByPalette[settings.palette] ?? [];
  return (
    <main className="studio-layout">
      <Sidebar workspace={workspace} />
      <div className="studio-layout__main">
        <Stage
          settings={settings}
          phase={clock.phase}
          showSkeleton={overlays.skeleton}
          showGround={overlays.ground}
          onionSkin={overlays.onion}
          compare={overlays.compare}
          referenceUrl={reference.url}
          referenceLabel={reference.label}
          info={info}
        />
        <PlaybackBar clock={clock} phase={clock.phase} onSeek={clock.seek} />
        <Filmstrip
          settings={settings}
          frames={frames}
          activeColumn={info.canonicalIndex}
          onSelectPhase={(column) => clock.seek(column / 8)}
        />
      </div>
      <RightRail workspace={workspace} />
    </main>
  );
};
