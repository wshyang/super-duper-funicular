import { useMemo, useState } from "react";
import { DEFAULT_CONTROLS, resolveGait, type GaitControls } from "../../lib/gait/gait.ts";
import { solvePose } from "../../lib/gait/pose.ts";
import { bodyFor, type PersonaId } from "../../lib/rig/body.ts";
import { paletteById } from "../../lib/rig/palette.ts";
import { analyseCycle } from "../../lib/analysis/cycle.ts";

export function useRunnerStudio() {
  const [controls, setControls] = useState<GaitControls>(DEFAULT_CONTROLS);
  const [persona, setPersona] = useState<PersonaId>("sg-chinese-male");
  const [paletteId, setPaletteId] = useState("blue");
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(true);
  const gait = useMemo(() => resolveGait(controls), [controls]);
  const body = useMemo(() => bodyFor(persona), [persona]);
  const pose = useMemo(() => solvePose(phase, gait, body), [phase, gait, body]);
  const palette = useMemo(() => paletteById(paletteId), [paletteId]);
  const metrics = useMemo(() => {
    const samples = Array.from({ length: 32 }, (_, i) => solvePose(i / 32, gait, body));
    return analyseCycle(samples);
  }, [gait, body]);
  return {
    controls,
    setControls,
    persona,
    setPersona,
    paletteId,
    setPaletteId,
    phase,
    setPhase,
    playing,
    setPlaying,
    gait,
    pose,
    palette,
    metrics,
  };
}
