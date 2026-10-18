import type { KeyframeManifestEntry } from '../data/sequence-manifest';

interface KeyframeStripProps {
  readonly keyframes: readonly KeyframeManifestEntry[];
  readonly onSelect: (phase: number) => void;
}

export function KeyframeStrip({ keyframes, onSelect }: KeyframeStripProps) {
  return (
    <section className="keyframe-strip">
      <h2>Conformed keyframes ({keyframes.length})</h2>
      <div className="keyframe-strip__row">
        {keyframes.map((keyframe) => (
          <button
            key={keyframe.phase}
            type="button"
            className="keyframe-strip__cell"
            data-testid={`keyframe-strip__key-${String(Math.round(keyframe.phase * 1000)).padStart(3, '0')}`}
            onClick={() => onSelect(keyframe.phase)}
          >
            <img src={keyframe.src} alt={`Keyframe at phase ${keyframe.label}`} loading="lazy" />
            <span>{keyframe.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
