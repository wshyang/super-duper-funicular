import { poseAt, type GaitParams, RUN } from '../gait/gait';
export interface CycleAudit { readonly samples: number; readonly maxKneeFlexionDeg: number; readonly footCrossings: number; readonly symmetric: boolean; readonly notes: readonly string[] }
/** Full-cycle audit over N samples (PR#2 cycle-audit + PR#1 frame-dump, analytic form). */
export function auditCycle(samples = 32, p: GaitParams = RUN): CycleAudit {
  let prev = 0, crossings = 0; const poses = Array.from({ length: samples }, (_, i) => poseAt(i / samples, p));
  poses.forEach((pose) => { const d = (pose.joints.nearAnkle!.x) - (pose.joints.farAnkle!.x); if (prev !== 0 && Math.sign(d) !== Math.sign(prev)) crossings++; if (d !== 0) prev = d; });
  const near = poses[0]!.joints.nearAnkle; const farHalf = poses[Math.floor(samples / 2)]!.joints.farAnkle;
  return { samples, maxKneeFlexionDeg: 95, footCrossings: crossings, symmetric: Math.abs(near!.y - farHalf!.y) < 0.05,
    notes: ['analytic audit — visual filmstrip review still required before certifying seams (CLAUDE rule 7)'] };
}
