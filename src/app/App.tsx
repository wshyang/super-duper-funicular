import { APNG_URL, KEYFRAMES, SEQUENCE_FRAMES } from './data/sequence-manifest';
import { useAnimationPlayback } from './hooks/useAnimationPlayback';
import { AnimationPlayer } from './components/AnimationPlayer';
import { KeyframeStrip } from './components/KeyframeStrip';
import { AuditPanel } from './components/AuditPanel';

export function App() {
  const playback = useAnimationPlayback(SEQUENCE_FRAMES);

  const nearestFrameIndexForPhase = (phase: number): number => {
    let nearest = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    SEQUENCE_FRAMES.forEach((frame, index) => {
      const raw = Math.abs(frame.phase - phase) % 1;
      const distance = Math.min(raw, 1 - raw);
      if (distance < bestDistance) {
        bestDistance = distance;
        nearest = index;
      }
    });
    return nearest;
  };

  return (
    <main className="workspace">
      <header className="workspace__header">
        <h1>P2 · Keyframe-Anchored Photographic Pipeline — animated running sequence</h1>
        <p data-testid="workspace__subtitle">
          persona <code>sg-chinese-female</code> · 8 conformed photographic keyframes · 16-phase composition · pure-TypeScript pipeline
        </p>
      </header>
      <section className="apng-preview">
        <h2>Native APNG animation (16 phases @ 24 fps)</h2>
        <img src={APNG_URL} alt="Animated running cycle" width={256} height={320} data-testid="apng-preview__img" />
        <p className="apng-preview__hint">Rendered by your browser from the committed <code>runner-16phase.apng</code>.</p>
      </section>
      <AnimationPlayer playback={playback} />
      <KeyframeStrip keyframes={KEYFRAMES} onSelect={(phase) => playback.stepTo(nearestFrameIndexForPhase(phase))} />
      <AuditPanel />
    </main>
  );
}
