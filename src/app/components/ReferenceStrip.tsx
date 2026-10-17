import type { ReferenceState } from "../hooks/useReferenceFrames.ts";

export interface ReferenceStripProps {
  readonly state: ReferenceState;
}

export function ReferenceStrip({ state }: ReferenceStripProps) {
  if (state.status === "loading") return <p data-testid="reference-strip__status">Loading extracted frames…</p>;
  if (state.status === "failed") return <p data-testid="reference-strip__status">Could not load frames: {state.message}</p>;
  return (
    <ol className="reference-strip" data-testid="reference-strip__list">
      {state.frames.map((frame) => (
        <li key={frame.id} data-testid={`reference-strip__frame-${frame.frame}`}>
          <img src={frame.url} alt={`Extracted reference frame ${frame.frame}`} />
          <span>{frame.frame}</span>
        </li>
      ))}
    </ol>
  );
}
