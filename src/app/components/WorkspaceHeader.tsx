import type { StudioTabId } from '../hooks/studio-view-model.js';

interface TabNavOption {
  readonly id: StudioTabId;
  readonly label: string;
}

const TAB_OPTIONS: readonly TabNavOption[] = [
  { id: 'all-in-one', label: 'All-in-One Studio' },
  { id: 'stage-comparison', label: 'Live Stage & Controls' },
  { id: 'gait-filmstrip', label: '8-Frame Gait Filmstrip' },
  { id: 'articulated-rig', label: '15-Part Articulated Rig' },
  { id: 'flaw-diagnostics', label: 'Flaw Analysis & Catalog' },
];

export interface WorkspaceHeaderProps {
  readonly activeTab: StudioTabId;
  readonly onSelectTab: (tab: StudioTabId) => void;
}

export function WorkspaceHeader(props: WorkspaceHeaderProps) {
  return (
    <header className="studio-header">
      <div className="studio-header__brand">
        <div className="studio-header__badges">
          <span className="pill pill--emerald">GREENFIELD.MD DISCIPLINE</span>
          <span className="pill pill--cyan">48 CUTOUTS @ /sprites/extracted/</span>
          <span className="pill pill--amber">2-BONE IK + ALTERNATING GAIT</span>
        </div>
        <h1 className="studio-header__title">
          Sprite Motion Lab — Algorithmic Articulated Runner &amp; Sprite Pipeline
        </h1>
        <p className="studio-header__subtitle">
          Deduplicated asset catalog (/src/images), automated magenta-key piece extraction
          (/public/sprites), quantitative flaw diagnosis, and real-time 15-part articulated running
          synthesis.
        </p>
      </div>
      <nav className="studio-header__tabs" aria-label="Studio workspace views">
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            data-testid={`workspace-header__tab-${tab.id}`}
            className={
              props.activeTab === tab.id ? 'tab-btn tab-btn--active' : 'tab-btn'
            }
            onClick={() => props.onSelectTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
