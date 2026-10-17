import type { Pose } from '../gait/gait'; import type { Persona } from '../rig/body';
export interface PaintOp { readonly kind: 'capsule' | 'circle' | 'ground'; readonly from?: readonly [number, number]; readonly to?: readonly [number, number]; readonly r?: number; readonly color: string; readonly part: string }
const cap = (pose: Pose, a: readonly [number,number], b: readonly [number,number], r: number, color: string, part: string): PaintOp => ({ kind: 'capsule', from: a, to: b, r, color, part });
type P = readonly [number, number]; const xy = (v: { x: number; y: number }): P => [v.x, v.y];
/** Ordered paint ops (far side first) — pure scene graph, testable without canvas (PR#3). Rounded joint = capsule caps (PR#1 rounded-joint cutter, render-level). */
export function buildScene(pose: Pose, persona: Persona): readonly PaintOp[] {
  const j = pose.joints; const dim = persona.skin;
  return [
    { kind: 'ground', color: '#334155', part: 'ground' },
    cap(pose, xy(pose.neckBase), xy(j.farElbow as never), .045, dim, 'farUpperArm'), cap(pose, xy(j.farElbow as never), xy(j.farHand as never), .038, dim, 'farForearm'),
    cap(pose, xy(pose.hip), xy(j.farKnee as never), .06, persona.shorts, 'farThigh'), cap(pose, xy(j.farKnee as never), xy(j.farAnkle as never), .045, dim, 'farShin'),
    cap(pose, xy(j.farAnkle as never), xy(j.farToe as never), .035, persona.shoe, 'farShoe'),
    cap(pose, xy(pose.hip), xy(pose.neckBase), .085, persona.top, 'torso'),
    { kind: 'circle', from: xy(pose.head), r: .11 * persona.scale, color: persona.skin, part: 'head' },
    cap(pose, xy(pose.hip), xy(j.nearKnee as never), .065, persona.shorts, 'nearThigh'), cap(pose, xy(j.nearKnee as never), xy(j.nearAnkle as never), .05, persona.skin, 'nearShin'),
    cap(pose, xy(j.nearAnkle as never), xy(j.nearToe as never), .038, persona.shoe, 'nearShoe'),
    cap(pose, xy(pose.neckBase), xy(j.nearElbow as never), .048, persona.skin, 'nearUpperArm'), cap(pose, xy(j.nearElbow as never), xy(j.nearHand as never), .04, persona.skin, 'nearForearm'),
  ];
}
