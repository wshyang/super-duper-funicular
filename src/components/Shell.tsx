import {
  Activity,
  ArrowDownToLine,
  Box,
  ChevronRight,
  CircleHelp,
  Film,
  Footprints,
} from "lucide-react";
interface NavigationProps {
  tab: string;
  setTab: (value: string) => void;
}
export function Header({ setTab }: Pick<NavigationProps, "setTab">) {
  return (
    <header className="site-header">
      <a className="brand" href="/" data-testid="header__home">
        <span className="brand-icon">
          <Footprints size={23} />
        </span>
        stride<span>lab</span>
        <small>THE MOTION WORKBENCH</small>
      </a>
      <div className="header-right">
        <span className="project-label">
          PROJECT 001 <span>/</span> THE RUNNER
        </span>
        <span className="version">v1.0</span>
        <button
          className="icon-button help"
          aria-label="Read motion notes"
          data-testid="header__help"
          onClick={() => setTab("notes")}
        >
          <CircleHelp size={19} />
        </button>
      </div>
    </header>
  );
}
export function PageHeading({
  exportSheet,
  canExport,
}: {
  exportSheet: () => void;
  canExport: boolean;
}) {
  return (
    <>
      <div className="breadcrumb">
        Workspace <ChevronRight size={12} /> Character experiments{" "}
        <ChevronRight size={12} />
        <span>The runner</span>
      </div>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="mini-line" /> FROM STATIC TO KINETIC
          </div>
          <h1>
            Good motion starts with good bones<span>.</span>
          </h1>
          <p>Take a sprite apart. Give it a rhythm. Bring it to life.</p>
        </div>
        <button
          className="export-button"
          data-testid="studio__export"
          onClick={exportSheet}
          disabled={!canExport}
        >
          <ArrowDownToLine size={16} /> Export sprite sheet <span>PNG</span>
        </button>
      </div>
    </>
  );
}
export function WorkbenchTabs({ tab, setTab }: NavigationProps) {
  const tabs = [
    { id: "studio", label: "Motion studio", icon: Activity },
    { id: "assets", label: "Asset library", icon: Box },
    { id: "notes", label: "Motion notes", icon: Film },
  ];
  return (
    <nav className="tab-bar" aria-label="Workbench sections">
      <div>
        {tabs.map((item) => (
          <button
            key={item.id}
            data-testid={`nav__${item.id}`}
            className={tab === item.id ? "active" : ""}
            onClick={() => setTab(item.id)}
          >
            <item.icon size={16} />
            {item.label}
            {item.id === "assets" && <span className="tab-count">48</span>}
          </button>
        ))}
      </div>
      <span className="local-badge">
        <i /> Everything runs in your browser
      </span>
    </nav>
  );
}
export function Footer() {
  return (
    <footer>
      <span>
        <span className="footer-logo">↗</span> STRIDE LAB{" "}
        <span className="footer-separator">/</span> Small pixels. Better
        movement.
      </span>
      <span>
        Built with TypeScript <span className="footer-separator">·</span> Made
        to move.
      </span>
    </footer>
  );
}
