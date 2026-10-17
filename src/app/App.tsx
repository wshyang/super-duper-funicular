import { useState } from "react";
import { RUNNER_VARIANTS } from "../runner/palette.ts";
import { Filmstrip } from "./components/Filmstrip.tsx";
import { ReferenceStrip } from "./components/ReferenceStrip.tsx";
import { RunnerControls } from "./components/RunnerControls.tsx";
import { RunnerStage } from "./components/RunnerStage.tsx";
import { VariantPicker } from "./components/VariantPicker.tsx";
import { useAnimationPhase } from "./hooks/useAnimationPhase.ts";
import { useReferenceFrames } from "./hooks/useReferenceFrames.ts";
import { useFilmstrip, useRunnerRaster } from "./hooks/useRunnerRaster.ts";
import { DEFAULT_SPEED, contactLabel, formatPhase, nearestFrameIndex } from "./stage-model.ts";
import { DEFAULT_GAIT, sampleGait } from "../runner/gait.ts";
import { DEFAULT_BODY, fullLegLength } from "../runner/body-proportions.ts";

const FILMSTRIP_FRAMES = 8;

export function App() {
  const [variantId, setVariantId] = useState(RUNNER_VARIANTS[0]!.id);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [playing, setPlaying] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const { phase, setPhase } = useAnimationPhase(playing, speed);
  const raster = useRunnerRaster(phase, variantId, showSkeleton);
  const filmstrip = useFilmstrip(variantId, FILMSTRIP_FRAMES);
  const reference = useReferenceFrames(variantId);
  const contact = contactLabel(sampleGait(phase, fullLegLength(DEFAULT_BODY), DEFAULT_GAIT));
  const pauseForScrub = (next: number): void => {
    setPlaying(false);
    setPhase(next);
  };

  return (
    <main className="app" data-testid="app__root">
      <header>
        <h1>Procedural running sprite</h1>
        <p>Every frame is generated from a skeleton and a gait model. No frame is copied from the reference sheet.</p>
      </header>
      <section className="app__stage" data-testid="app__stage">
        <RunnerStage raster={raster} caption={`${contact} · cycle ${formatPhase(phase)}`} />
        <RunnerControls
          playing={playing}
          speed={speed}
          showSkeleton={showSkeleton}
          phase={phase}
          phasePercent={formatPhase(phase)}
          onTogglePlaying={() => setPlaying((value) => !value)}
          onSpeedChange={setSpeed}
          onToggleSkeleton={() => setShowSkeleton((value) => !value)}
          onPhaseChange={pauseForScrub}
        />
      </section>
      <VariantPicker variants={RUNNER_VARIANTS} selectedId={variantId} onSelect={setVariantId} />
      <section>
        <h2>Generated cycle</h2>
        <Filmstrip frames={filmstrip} activeIndex={nearestFrameIndex(phase, FILMSTRIP_FRAMES)} />
      </section>
      <section>
        <h2>Extracted reference (8 frames, from the sheet)</h2>
        <ReferenceStrip state={reference} />
      </section>
    </main>
  );
}
