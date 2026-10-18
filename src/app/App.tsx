import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
} from 'react';
import sourceSheetUrl from '../../incorrect running sprites.jpeg?url';
import {
  APP_NAME,
  DEFAULT_SETTINGS,
  FRAME_STEP,
  MOTION_BY_ID,
  MOTION_PROFILES,
  PALETTES,
  PERSONAS,
} from '../shared/constants';
import type { GaitSettings, MotionId, PaletteId, PersonaId, SpriteManifest } from '../shared/types';
import { normalizePhase } from '../runner/math';
import { solvePose } from '../runner/pose';
import {
  createCycleAudit,
  createCycleAuditManifest,
  createSpriteSheet,
  createSpriteSheetManifest,
  downloadCanvasPng,
  downloadJson,
} from './exporters';
import { DiagnosticsView } from './DiagnosticsView';
import { StageCanvas } from './StageCanvas';
import { useSpriteManifest } from './useSpriteManifest';

type ViewId = 'studio' | 'source' | 'diagnostics';

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const usePlayback = (
  motion: MotionId,
  playing: boolean,
  speed: number,
): [number, Dispatch<SetStateAction<number>>] => {
  const [phase, setPhase] = useState(0.12);
  useEffect(() => {
    if (!playing) return undefined;
    let request = 0;
    let last = performance.now();
    const advance = (time: number): void => {
      const elapsed = Math.min(100, time - last);
      last = time;
      const cadence = MOTION_BY_ID[motion].cadence / 120;
      setPhase((value) => normalizePhase(value + (elapsed / 1000) * cadence * speed));
      request = window.requestAnimationFrame(advance);
    };
    request = window.requestAnimationFrame(advance);
    return () => window.cancelAnimationFrame(request);
  }, [motion, playing, speed]);
  return [phase, setPhase];
};

const SettingsPills = ({
  settings,
  onPersona,
  onPalette,
}: {
  readonly settings: GaitSettings;
  readonly onPersona: (persona: PersonaId) => void;
  readonly onPalette: (palette: PaletteId) => void;
}): React.JSX.Element => (
  <div className="setting-group">
    <div className="setting-row">
      <span className="setting-label">Runner</span>
      <div className="segmented-control" role="group" aria-label="Runner persona">
        {PERSONAS.map((persona) => (
          <button
            key={persona.id}
            type="button"
            className={settings.persona === persona.id ? 'segment segment--active' : 'segment'}
            onClick={() => onPersona(persona.id)}
            aria-pressed={settings.persona === persona.id}
            data-testid={`settings__persona-${persona.id}`}
          >
            {persona.label}
          </button>
        ))}
      </div>
    </div>
    <div className="setting-row">
      <span className="setting-label">Colorway</span>
      <div className="swatches" role="group" aria-label="Runner colorway">
        {PALETTES.map((palette) => (
          <button
            key={palette.id}
            type="button"
            className={settings.palette === palette.id ? 'swatch swatch--selected' : 'swatch'}
            style={{ '--swatch-color': palette.primary } as CSSProperties}
            onClick={() => onPalette(palette.id)}
            aria-label={`${palette.label} colorway`}
            aria-pressed={settings.palette === palette.id}
            data-testid={`settings__palette-${palette.id}`}
          />
        ))}
      </div>
    </div>
  </div>
);

const FrameStrip = ({
  manifest,
  palette,
  selected,
  onSelect,
}: {
  readonly manifest: SpriteManifest | null;
  readonly palette: PaletteId;
  readonly selected: number;
  readonly onSelect: (column: number) => void;
}): React.JSX.Element => {
  const frames = manifest?.frames.filter((frame) => frame.palette === palette) ?? [];
  return (
    <section className="frame-strip" aria-label="Extracted source frames">
      <div className="strip-heading">
        <div>
          <span className="eyebrow">SOURCE FRAMES</span>
          <h2>{PALETTES.find((item) => item.id === palette)?.label ?? 'Runner'} sequence</h2>
        </div>
        <span className="strip-count">
          {frames.length ? `${frames.length} frames` : 'Assets loading'}
        </span>
      </div>
      <div className="frame-list">
        {frames.map((frame) => (
          <button
            key={frame.id}
            type="button"
            className={frame.column === selected ? 'frame-card frame-card--selected' : 'frame-card'}
            onClick={() => onSelect(frame.column)}
            aria-label={`Select source frame ${frame.column + 1}`}
            aria-pressed={frame.column === selected}
            data-testid={`source-frame__select-${frame.column + 1}`}
          >
            <img src={frame.url} alt="" loading="lazy" />
            <span>{String(frame.column + 1).padStart(2, '0')}</span>
          </button>
        ))}
        {frames.length === 0 && (
          <p className="strip-empty">Run the deterministic pipeline to build the source atlas.</p>
        )}
      </div>
    </section>
  );
};

const SourceMetrics = ({
  manifest,
}: {
  readonly manifest: SpriteManifest | null;
}): React.JSX.Element => (
  <div className="source-metrics">
    <div>
      <strong>{manifest?.frames.length ?? '—'}</strong>
      <span>registered frames</span>
    </div>
    <div>
      <strong>{manifest ? `${manifest.grid.columns} × ${manifest.grid.rows}` : '—'}</strong>
      <span>detected grid</span>
    </div>
    <div>
      <strong>{manifest ? `${manifest.grid.cellWidth} × ${manifest.grid.cellHeight}` : '—'}</strong>
      <span>registered cell</span>
    </div>
    <div>
      <strong>{manifest?.source.sha256.slice(0, 10) ?? '—'}</strong>
      <span>source SHA-256</span>
    </div>
  </div>
);

const SourceView = ({
  manifest,
}: {
  readonly manifest: SpriteManifest | null;
}): React.JSX.Element => (
  <main className="source-view">
    <div className="source-view__copy">
      <span className="eyebrow">REFERENCE ASSET · ORIGINAL BYTES PRESERVED</span>
      <h2>One sheet. Forty-eight observations.</h2>
      <p>
        The original magenta-backed sheet stays untouched. The registered cells below are derived by
        the local pipeline and can be regenerated from the recorded source hash.
      </p>
      <SourceMetrics manifest={manifest} />
    </div>
    <div className="source-image-wrap">
      <img
        src={sourceSheetUrl}
        alt="Original six-colorway, eight-frame running sprite sheet on a magenta background"
      />
    </div>
  </main>
);

export const App = (): React.JSX.Element => {
  const [settings, setSettings] = useState<GaitSettings>(DEFAULT_SETTINGS);
  const [view, setView] = useState<ViewId>('studio');
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [speed, setSpeed] = useState(1);
  const [selectedFrame, setSelectedFrame] = useState(0);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [showOnion, setShowOnion] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const source = useSpriteManifest();
  const [phase, setPhase] = usePlayback(settings.motion, playing, speed);
  const pose = useMemo(() => solvePose(settings, phase), [phase, settings]);
  const profile = MOTION_BY_ID[settings.motion];
  const setMotion = (motion: MotionId): void => setSettings((current) => ({ ...current, motion }));
  const setPalette = (palette: PaletteId): void =>
    setSettings((current) => ({ ...current, palette }));
  const setPersona = (persona: PersonaId): void =>
    setSettings((current) => ({ ...current, persona }));
  const support = pose.flight
    ? 'FLIGHT'
    : pose.nearLeg.foot.stance || pose.farLeg.foot.stance
      ? 'GROUND CONTACT'
      : 'SWING';
  const exportStem = `${settings.persona}-${settings.motion}-${settings.palette}`;
  const runExport = async (
    action: () => void | Promise<void>,
    successMessage: string,
  ): Promise<void> => {
    setExporting(true);
    setExportMessage('Preparing export…');
    try {
      await action();
      setExportMessage(successMessage);
    } catch (cause) {
      setExportMessage(cause instanceof Error ? cause.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  };
  const exportSpritePng = (): void => {
    void runExport(async () => {
      const artifact = createSpriteSheet(settings);
      await downloadCanvasPng(artifact.canvas, `${exportStem}-8-frame.png`);
    }, 'Eight-frame transparent PNG exported.');
  };
  const exportSpriteManifest = (): void => {
    void runExport(
      () => downloadJson(createSpriteSheetManifest(settings), `${exportStem}-manifest.json`),
      'Sprite-sheet manifest exported.',
    );
  };
  const exportAuditPng = (): void => {
    void runExport(async () => {
      const artifact = createCycleAudit(settings);
      await downloadCanvasPng(artifact.canvas, `${exportStem}-16-phase-audit.png`);
    }, '48-panel cycle audit exported.');
  };
  const exportAuditManifest = (): void => {
    void runExport(
      () => downloadJson(createCycleAuditManifest(settings), `${exportStem}-audit-manifest.json`),
      'Cycle-audit manifest exported.',
    );
  };
  const viewTitle =
    view === 'studio'
      ? 'Motion studio'
      : view === 'source'
        ? 'Source library'
        : 'Source diagnostics';

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label={`${APP_NAME} home`}>
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            <strong>FUNICULAR</strong>
            <small>MOTION LAB</small>
          </span>
        </a>
        <div className="topbar__center">
          <span className="live-dot" /> SOURCE PIPELINE <b>LOCAL / DETERMINISTIC</b>
        </div>
        <div className="topbar__right">
          <span>BUILD 0.1</span>
          <span className="avatar">FM</span>
        </div>
      </header>

      <div className="page-heading">
        <div>
          <div className="breadcrumbs">
            <span>WORKSPACE</span>
            <span>/</span>
            <strong>{viewTitle.toUpperCase()}</strong>
          </div>
          <h1>
            {viewTitle}
            <span className="heading-dot">.</span>
          </h1>
          <p>Inspect the source, tune the gait, and keep every frame traceable.</p>
        </div>
        <div className="source-status" data-testid="source__status">
          <span className={`status-light status-light--${source.status}`} />
          <div>
            <strong>
              {source.status === 'ready'
                ? 'SOURCE READY'
                : source.status === 'error'
                  ? 'PIPELINE ASSETS MISSING'
                  : 'LOADING SOURCE'}
            </strong>
            <small>
              {source.manifest?.source.sha256.slice(0, 12) ?? 'Checking generated manifest'}
            </small>
          </div>
          {source.status === 'error' && (
            <button type="button" onClick={source.retry}>
              Retry
            </button>
          )}
        </div>
      </div>

      <nav className="view-tabs" aria-label="Motion lab views">
        <button
          type="button"
          aria-current={view === 'studio' ? 'page' : undefined}
          className={view === 'studio' ? 'view-tab view-tab--active' : 'view-tab'}
          onClick={() => setView('studio')}
          data-testid="views__tab-studio"
        >
          <span className="tab-glyph">◒</span> Motion studio
        </button>
        <button
          type="button"
          aria-current={view === 'source' ? 'page' : undefined}
          className={view === 'source' ? 'view-tab view-tab--active' : 'view-tab'}
          onClick={() => setView('source')}
          data-testid="views__tab-source"
        >
          <span className="tab-glyph">▦</span> Source library
        </button>
        <button
          type="button"
          aria-current={view === 'diagnostics' ? 'page' : undefined}
          className={view === 'diagnostics' ? 'view-tab view-tab--active' : 'view-tab'}
          onClick={() => setView('diagnostics')}
          data-testid="views__tab-diagnostics"
        >
          <span className="tab-glyph">⌕</span> Source analysis
        </button>
        <span className="view-tabs__hint">P1 · PROCEDURAL + REFERENCE</span>
      </nav>

      {view === 'studio' ? (
        <main className="workspace">
          <section className="studio-column">
            <div className="stage-card">
              <div className="stage-card__top">
                <div>
                  <span className="eyebrow">PROCEDURAL RUNNER</span>
                  <h2>
                    Side view <span className="stage-badge">{support}</span>
                  </h2>
                </div>
                <div className="stage-actions">
                  <label className="toggle-chip">
                    <input
                      type="checkbox"
                      checked={showSkeleton}
                      onChange={(event) => setShowSkeleton(event.currentTarget.checked)}
                      aria-label="Show skeleton overlay"
                      data-testid="stage__toggle-skeleton"
                    />
                    <span>Skeleton</span>
                  </label>
                  <label className="toggle-chip">
                    <input
                      type="checkbox"
                      checked={showOnion}
                      onChange={(event) => setShowOnion(event.currentTarget.checked)}
                      aria-label="Show onion-skin poses"
                      data-testid="stage__toggle-onion"
                    />
                    <span>Onion</span>
                  </label>
                  <button
                    className="quiet-button"
                    type="button"
                    onClick={() => setView('source')}
                    data-testid="stage__compare-source"
                  >
                    Compare source <span>↗</span>
                  </button>
                </div>
              </div>
              <StageCanvas
                pose={pose}
                settings={settings}
                showSkeleton={showSkeleton}
                showOnion={showOnion}
              />
              <div className="stage-meta">
                <span>
                  <b>φ</b> {phase.toFixed(3)}
                </span>
                <span>
                  {profile.label.toUpperCase()} · {profile.cadence} STEPS/MIN
                </span>
                <span>{pose.flight ? 'AIRBORNE PHASE' : 'CONTACT MODEL ACTIVE'}</span>
              </div>
            </div>
            <section className="playback-card" aria-label="Playback controls">
              <div className="transport">
                <button
                  type="button"
                  className="transport-button"
                  onClick={() => setPhase((phase - FRAME_STEP + 1) % 1)}
                  aria-label="Previous phase step"
                  data-testid="playback__step-back"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="play-button"
                  onClick={() => setPlaying((value) => !value)}
                  aria-label={playing ? 'Pause animation' : 'Play animation'}
                  data-testid="playback__play-toggle"
                >
                  {playing ? 'Ⅱ' : '▶'}
                </button>
                <button
                  type="button"
                  className="transport-button"
                  onClick={() => setPhase((phase + FRAME_STEP) % 1)}
                  aria-label="Next phase step"
                  data-testid="playback__step-forward"
                >
                  ›
                </button>
              </div>
              <div className="phase-control">
                <div className="range-labels">
                  <span>PHASE</span>
                  <strong>{phase.toFixed(3)}</strong>
                  <span>8-FRAME CYCLE</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.999"
                  step="0.001"
                  value={phase}
                  onChange={(event) => {
                    setPlaying(false);
                    setPhase(Number(event.currentTarget.value));
                  }}
                  aria-label="Gait phase"
                  data-testid="playback__phase-slider"
                />
              </div>
              <label className="speed-control">
                <span>SPEED</span>
                <select
                  value={speed}
                  onChange={(event) => setSpeed(Number(event.currentTarget.value))}
                  aria-label="Playback speed"
                  data-testid="playback__speed-select"
                >
                  <option value={0.5}>0.5×</option>
                  <option value={1}>1×</option>
                  <option value={1.5}>1.5×</option>
                </select>
              </label>
            </section>
            <FrameStrip
              manifest={source.manifest}
              palette={settings.palette}
              selected={selectedFrame}
              onSelect={setSelectedFrame}
            />
          </section>

          <aside className="inspector">
            <section className="inspector-card">
              <div className="inspector-card__heading">
                <span className="eyebrow">MOTION PROFILE</span>
                <span className="tiny-status">P1</span>
              </div>
              <div className="motion-list">
                {MOTION_PROFILES.map((motion) => (
                  <button
                    key={motion.id}
                    type="button"
                    className={
                      settings.motion === motion.id
                        ? 'motion-choice motion-choice--active'
                        : 'motion-choice'
                    }
                    onClick={() => setMotion(motion.id)}
                    aria-pressed={settings.motion === motion.id}
                    data-testid={`motion__select-${motion.id}`}
                  >
                    <span className="motion-choice__radio" />
                    <span>
                      <strong>{motion.label}</strong>
                      <small>
                        {motion.cadence} steps/min · {Math.round(motion.dutyFactor * 100)}% stance
                      </small>
                    </span>
                    <span className="motion-choice__arrow">›</span>
                  </button>
                ))}
              </div>
            </section>
            <section className="inspector-card">
              <div className="inspector-card__heading">
                <span className="eyebrow">RUNNER DESIGN</span>
                <span className="tiny-status">2 PERSONAS</span>
              </div>
              <SettingsPills settings={settings} onPersona={setPersona} onPalette={setPalette} />
            </section>
            <section className="inspector-card data-card">
              <div className="inspector-card__heading">
                <span className="eyebrow">SOURCE AUDIT</span>
                <span className="audit-indicator">●</span>
              </div>
              <div className="audit-number">
                {source.manifest?.frames.length ?? '—'}
                <span>/48</span>
              </div>
              <p>
                {source.status === 'ready'
                  ? 'Registered cells available from the preserved reference sheet.'
                  : (source.error ?? 'Waiting for the deterministic extraction manifest.')}
              </p>
              <div className="audit-divider" />
              <div className="audit-row">
                <span>Grid detection</span>
                <strong>
                  {source.manifest
                    ? `${source.manifest.grid.columns} × ${source.manifest.grid.rows}`
                    : 'Pending'}
                </strong>
              </div>
              <div className="audit-row">
                <span>Palette rows</span>
                <strong>06</strong>
              </div>
              <div className="audit-row">
                <span>Selected frame</span>
                <strong>{String(selectedFrame + 1).padStart(2, '0')} / 08</strong>
              </div>
            </section>
            <section className="inspector-card export-card">
              <div className="inspector-card__heading">
                <span className="eyebrow">EXPORTS & CYCLE REVIEW</span>
                <span className="tiny-status">CANVAS 2D</span>
              </div>
              <button
                type="button"
                className="export-button"
                onClick={exportSpritePng}
                disabled={exporting}
                data-testid="export__sprite-png"
              >
                <span>Transparent sprite sheet</span>
                <small>8 phases · PNG</small>
              </button>
              <button
                type="button"
                className="export-button"
                onClick={exportSpriteManifest}
                disabled={exporting}
                data-testid="export__sprite-manifest"
              >
                <span>Sprite manifest</span>
                <small>Settings + frame map · JSON</small>
              </button>
              <button
                type="button"
                className="export-button"
                onClick={exportAuditPng}
                disabled={exporting}
                data-testid="export__cycle-audit"
              >
                <span>Full-cycle visual audit</span>
                <small>16 phases × 3 panels · PNG</small>
              </button>
              <button
                type="button"
                className="export-button"
                onClick={exportAuditManifest}
                disabled={exporting}
                data-testid="export__audit-manifest"
              >
                <span>Audit manifest</span>
                <small>Phases + configuration · JSON</small>
              </button>
              <p className="export-status" aria-live="polite" data-testid="export__status">
                {exportMessage ||
                  'Exports use the same pose solver and canvas renderer as the stage.'}
              </p>
            </section>
            <p className="disclaimer">
              Procedural motion is a stylized model. It is not a biomechanical or clinical
              simulation.
            </p>
          </aside>
        </main>
      ) : view === 'source' ? (
        <SourceView manifest={source.manifest} />
      ) : (
        <DiagnosticsView
          analysis={source.analysis}
          manifest={source.manifest}
          palette={settings.palette}
        />
      )}

      <footer className="app-footer">
        <span>FUNICULAR / 0.1</span>
        <span>Original source remains immutable · local processing only · no backend</span>
        <span>PHASE {phase.toFixed(3)}</span>
      </footer>
    </div>
  );
};
