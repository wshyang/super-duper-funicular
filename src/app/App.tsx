import { APP_NAME, APP_VERSION } from '../shared/constants.ts';
import { PARITY_ROWS } from '../shared/parity.ts';
import type { BranchTipsFile } from '../shared/types.ts';
import branchTips from '../generated/branch-tips.json';
import { useWorkspace, type TabId } from './hooks/useWorkspace.ts';
import { useVectorManifest } from './hooks/useVectorManifest.ts';
import { usePoseInfo } from './hooks/usePoseInfo.ts';
import { ComparisonPanel } from './components/ComparisonPanel.tsx';
import { DiagnosticsPanel } from './components/DiagnosticsPanel.tsx';
import { GalleryPanel, Lightbox } from './components/GalleryPanel.tsx';
import { VectorsPanel } from './components/VectorsPanel.tsx';
import { InspectorPanel } from './components/InspectorPanel.tsx';
import { StudioWorkspace } from './components/StudioWorkspace.tsx';

const TABS: readonly { id: TabId; label: string }[] = [
  { id: 'studio', label: 'Motion studio' },
  { id: 'inspector', label: 'Rig inspector' },
  { id: 'diagnostics', label: 'Source diagnostics' },
  { id: 'gallery', label: 'Asset library' },
  { id: 'vectors', label: 'Vector output' },
  { id: 'parity', label: 'Parity ledger' },
];

const TIPS = branchTips as BranchTipsFile;

const AppHeader = (): React.JSX.Element => (
  <header className="app-header">
    <div className="app-header__brand">
      <span className="app-header__mark" aria-hidden="true" />
      <div>
        <h1 className="app-header__title">{APP_NAME}</h1>
        <p className="app-header__subtitle">
          Sprite forensics · 17-part articulated engine · live parity ledger
        </p>
      </div>
    </div>
    <div className="app-header__meta">
      <span className="stage__badge stage__badge--muted">v{APP_VERSION}</span>
      <span className="app-header__source">GREENFIELD discipline · real assets · honest gates</span>
    </div>
  </header>
);

const WorkspaceTabs = ({
  tab,
  onSelect,
}: {
  tab: TabId;
  onSelect: (tab: TabId) => void;
}): React.JSX.Element => (
  <nav className="workspace-tabs" aria-label="Workspaces">
    {TABS.map((item) => (
      <button
        key={item.id}
        type="button"
        className={
          tab === item.id
            ? 'workspace-tabs__tab workspace-tabs__tab--active'
            : 'workspace-tabs__tab'
        }
        onClick={() => onSelect(item.id)}
        data-testid={`workspace-tabs__tab-${item.id}`}
        aria-selected={tab === item.id}
        role="tab"
      >
        {item.label}
      </button>
    ))}
  </nav>
);

type WorkspaceState = ReturnType<typeof useWorkspace>;

const InspectorTab = ({ workspace }: { workspace: WorkspaceState }): React.JSX.Element => {
  const { settings, clock } = workspace;
  const info = usePoseInfo(settings, clock.phase);
  return (
    <main className="single-column">
      <InspectorPanel
        settings={settings}
        phase={clock.phase}
        info={info}
        selected={workspace.selectedPart}
        onSelect={workspace.selectPart}
      />
    </main>
  );
};

const DiagnosticsTab = ({ workspace }: { workspace: WorkspaceState }): React.JSX.Element => {
  const { sprite } = workspace;
  return (
    <main className="single-column">
      <DiagnosticsPanel
        analysis={sprite.analysis}
        status={sprite.status}
        error={sprite.error}
        onRetry={sprite.retry}
      />
    </main>
  );
};

const GalleryTab = ({ workspace }: { workspace: WorkspaceState }): React.JSX.Element => (
  <main className="single-column">
    <GalleryPanel
      framesByPalette={workspace.sprite.framesByPalette}
      palette={workspace.galleryPalette}
      onPalette={workspace.setGalleryPalette}
      onOpen={workspace.openLightbox}
    />
  </main>
);

const VectorsTab = ({ workspace }: { workspace: WorkspaceState }): React.JSX.Element => {
  const vectors = useVectorManifest();
  if (vectors.status === 'error' || !vectors.manifest) {
    return (
      <main className="single-column">
        <section className="panel">
          <h2 className="panel-title">Vector manifest unavailable</h2>
          <p className="panel-hint">{vectors.error ?? 'Loading vector manifest…'}</p>
          <button
            type="button"
            className="secondary-button"
            onClick={vectors.retry}
            data-testid="vectors__retry"
          >
            Retry vector load
          </button>
        </section>
      </main>
    );
  }
  return (
    <main className="single-column">
      <VectorsPanel
        manifest={vectors.manifest}
        palette={workspace.galleryPalette}
        onPalette={workspace.setGalleryPalette}
      />
    </main>
  );
};

const ParityTab = (): React.JSX.Element => (
  <main className="single-column">
    <ComparisonPanel tips={TIPS.tips} observedAt={TIPS.observedAt} rows={PARITY_ROWS} />
  </main>
);

const TAB_VIEWS = {
  studio: StudioWorkspace,
  inspector: InspectorTab,
  diagnostics: DiagnosticsTab,
  gallery: GalleryTab,
  vectors: VectorsTab,
  parity: ParityTab,
} as const;

const TabContent = ({
  workspace,
  tab,
}: {
  workspace: WorkspaceState;
  tab: TabId;
}): React.JSX.Element => {
  if (tab === 'parity') return <ParityTab />;
  const View = TAB_VIEWS[tab];
  return <View workspace={workspace} />;
};

const AppFooter = ({
  workspace,
}: {
  workspace: ReturnType<typeof useWorkspace>;
}): React.JSX.Element => {
  const { settings, clock, exports } = workspace;
  const info = usePoseInfo(settings, clock.phase);
  const support = info.isFlight
    ? 'flight'
    : info.isDoubleSupport
      ? 'double support'
      : 'single support';
  const exporting = exports.busy ? ' · exporting…' : '';
  const phaseLabel = clock.phase.toFixed(3);
  return (
    <footer className="app-footer">
      <span>
        {info.motionName} · {support} · φ {phaseLabel}
        {exporting}
      </span>
      <span>
        Source artwork decoded at build time; no runtime network calls beyond static assets.
      </span>
    </footer>
  );
};

export const App = (): React.JSX.Element => {
  const workspace = useWorkspace();
  const tab = workspace.tab;
  return (
    <div className="app-shell">
      <AppHeader />
      <WorkspaceTabs tab={tab} onSelect={workspace.setTab} />

      <TabContent workspace={workspace} tab={tab} />

      <AppFooter workspace={workspace} />

      <Lightbox url={workspace.lightboxUrl} onClose={workspace.closeLightbox} />
    </div>
  );
};
