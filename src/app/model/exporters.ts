import type { PaintOp, Persona, Pose } from '../../shared/types.ts';
import { poseToOps, skeletonOps, type Transform } from '../../lib/render/paint-ops.ts';
import { solvePose } from '../../lib/gait/pose.ts';
import type { MotionProfile } from '../../shared/types.ts';

export interface Panel {
  readonly ops: readonly PaintOp[];
  readonly transform: Transform;
  readonly background: 'light' | 'dark' | 'transparent';
  readonly label: string;
}

export const FILMSTRIP_PHASES = 8;
export const AUDIT_PHASES = 16;

/** Eight labelled phase panels (filmstrip + sprite-sheet export). */
export function filmstripPanels(profile: MotionProfile, persona: Persona, cell: number): Panel[] {
  const panels: Panel[] = [];
  for (let i = 0; i < FILMSTRIP_PHASES; i += 1) {
    const pose = solvePose(i / FILMSTRIP_PHASES, profile);
    panels.push({
      ops: poseToOps(pose, persona),
      transform: cellTransform(cell),
      background: 'transparent',
      label: `phase ${i + 1}`,
    });
  }
  return panels;
}

/** 16-phase audit sheet: light, dark and joint-overlay panels per phase (ADD-010). */
export function auditPanels(profile: MotionProfile, persona: Persona, cell: number): Panel[] {
  const panels: Panel[] = [];
  for (let i = 0; i < AUDIT_PHASES; i += 1) {
    const pose = solvePose(i / AUDIT_PHASES, profile);
    const phase = i / AUDIT_PHASES;
    panels.push(panel(pose, persona, cell, 'light', `φ${phase.toFixed(3)} light`));
    panels.push(panel(pose, persona, cell, 'dark', `φ${phase.toFixed(3)} dark`));
    panels.push(jointPanel(pose, persona, cell, phase));
  }
  return panels;
}

function panel(pose: Pose, persona: Persona, cell: number, background: 'light' | 'dark', label: string): Panel {
  return { ops: poseToOps(pose, persona), transform: cellTransform(cell), background, label };
}

function jointPanel(pose: Pose, persona: Persona, cell: number, phase: number): Panel {
  return {
    ops: [...poseToOps(pose, persona), ...skeletonOps(pose, '#00e5ff')],
    transform: cellTransform(cell),
    background: 'light',
    label: `φ${phase.toFixed(3)} joints`,
  };
}

export function cellTransform(cell: number): Transform {
  return { scale: cell / 150, offsetX: cell / 2, offsetY: cell * 0.86 };
}

/** Onion-skin ops for the live stage (±2 phases at reduced clarity). */
export function onionOps(phases: readonly number[], profile: MotionProfile, persona: Persona): PaintOp[] {
  return phases.flatMap((phase) => poseToOps(solvePose(phase, profile), persona));
}
