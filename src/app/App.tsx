import React from 'react';
import { ArticulatedRigPanel } from './components/ArticulatedRigPanel.js';
import { ComparisonStage } from './components/ComparisonStage.js';
import { DiagnosticsPanel } from './components/DiagnosticsPanel.js';
import { GaitFilmstrip } from './components/GaitFilmstrip.js';
import { JointAndCycleAuditPanel } from './components/JointAndCycleAuditPanel.js';
import { RunnerControls } from './components/RunnerControls.js';
import { StandingProfilePanel } from './components/StandingProfilePanel.js';
import { isPhotorealPersona } from '../runner/skin-registry.js';
import { WorkspaceHeader } from './components/WorkspaceHeader.js';
import { useRunnerStudio } from './hooks/useRunnerStudio.js';

type StudioState = ReturnType<typeof useRunnerStudio>;

export function App(): React.ReactElement {
  const studio = useRunnerStudio();
  return (
    <div className="app-shell">
      <WorkspaceHeader
        activeTab={studio.activeTab}
        onSelectTab={studio.setActiveTab}
      />
      <div className="workspace-body">
        <StudioSidebar studio={studio} />
        <StudioMainContent studio={studio} />
      </div>
    </div>
  );
}

function StudioSidebar({
  studio,
}: {
  readonly studio: StudioState;
}): React.ReactElement {
  return (
    <RunnerControls
      props={{
        playbackMode: studio.playbackMode,
        onTogglePlayback: studio.togglePlayback,
        phase: studio.phase,
        sliderLabels: studio.sliderLabels,
        onScrubPhase: studio.scrubPhase,
        onStepFrame: studio.stepFrame,
        personaId: studio.personaId,
        activePersonaSkin: studio.activePersonaSkin,
        onSelectPersona: studio.setPersonaId,
        variant: studio.variant,
        onSelectVariant: studio.setVariant,
        backdrop: studio.backdrop,
        onSelectBackdrop: studio.setBackdrop,
        gaitConfig: studio.gaitConfig,
        onUpdateGait: studio.updateGaitParameter,
        onApplyArmSwingPreset: studio.applyArmSwingPreset,
        onResetGaitProfile: studio.resetGaitProfile,
        activeAssetTuning: studio.activeAssetTuning,
        onUpdateAssetTuning: studio.updateAssetTuning,
        onResetAssetTuning: studio.resetAssetTuning,
        skeletonOverlay: studio.skeletonOverlay,
        onToggleSkeleton: studio.toggleSkeletonOverlay,
        orbitTrailOverlay: studio.orbitTrailOverlay,
        onToggleOrbitTrail: studio.toggleOrbitTrailOverlay,
        onionSkinOverlay: studio.onionSkinOverlay,
        onToggleOnionSkin: studio.toggleOnionSkinOverlay,
      }}
    />
  );
}

function StudioMainContent({
  studio,
}: {
  readonly studio: StudioState;
}): React.ReactElement {
  const showStage =
    studio.activeTab === 'all-in-one' || studio.activeTab === 'stage-comparison';
  const showFilmstrip =
    studio.activeTab === 'all-in-one' || studio.activeTab === 'gait-filmstrip';
  const showRig =
    studio.activeTab === 'all-in-one' || studio.activeTab === 'articulated-rig';
  const showDiagnostics =
    studio.activeTab === 'all-in-one' || studio.activeTab === 'flaw-diagnostics';

  return (
    <main className="workspace-main">
      {showStage && (
        <ComparisonStage
          props={{
            currentPose: studio.currentPose,
            currentRaster: studio.currentRaster,
            previousRaster: studio.previousRaster,
            activePersonaSkin: studio.activePersonaSkin,
            backdrop: studio.backdrop,
            skeletonOverlay: studio.skeletonOverlay,
            orbitTrailOverlay: studio.orbitTrailOverlay,
            onionSkinOverlay: studio.onionSkinOverlay,
            footOrbitSamples: studio.footOrbitSamples,
            poseSummary: studio.poseSummary,
            activeExtractedFrameUrl: studio.activeExtractedFrameUrl,
          }}
        />
      )}
      {showFilmstrip && (
        <GaitFilmstrip
          cards={studio.filmstripCards}
          onSelectFrame={studio.selectCanonicalFrame}
        />
      )}
      {showRig && (
        <>
          {isPhotorealPersona(studio.personaId) && (
            <StandingProfilePanel
              personaId={studio.personaId}
              tuning={studio.activeAssetTuning}
              photorealStatus={studio.photorealStatus}
            />
          )}
          <JointAndCycleAuditPanel
            input={{
              personaId: studio.personaId,
              variant: studio.variant,
              gaitConfig: studio.gaitConfig,
              assetTuning: studio.activeAssetTuning,
              photorealStatus: studio.photorealStatus,
              onRetryPhotorealAssets: studio.retryPhotorealAssets,
            }}
          />
          <ArticulatedRigPanel
            partReadouts={studio.partReadouts}
            activePersonaSkin={studio.activePersonaSkin}
          />
        </>
      )}
      {showDiagnostics && (
        <DiagnosticsPanel
          flawCards={studio.flawCards}
          halfCycleRows={studio.halfCycleRows}
          catalogRows={studio.catalogRows}
        />
      )}
    </main>
  );
}
