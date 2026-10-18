import type { ParityStatus } from './types.ts';

export interface ParityRow {
  readonly capability: string;
  readonly spriteMotionLab: ParityStatus;
  readonly strideLab: ParityStatus;
  readonly funicular: ParityStatus;
  readonly proceduralRunner: ParityStatus;
  readonly ours: ParityStatus;
  readonly acceptance: string;
}

/**
 * The capability union of every sibling branch. The live narrative, hashes and
 * adoption queue live in docs/N_WAY_COMPARISON.md; this table is the in-app view.
 * A discipline test keeps every capability name present in the markdown ledger.
 */
export const PARITY_ROWS: readonly ParityRow[] = [
  {
    capability: 'Source dedupe + magenta-key extraction',
    spriteMotionLab: 'yes',
    strideLab: 'yes',
    funicular: 'yes',
    proceduralRunner: 'yes',
    ours: 'yes',
    acceptance: 'Real JPEG decoded; 48 frames; zero magenta spill; reproducible manifest.',
  },
  {
    capability: 'Original-frame gallery + manifest',
    spriteMotionLab: 'yes',
    strideLab: 'yes',
    funicular: 'yes',
    proceduralRunner: 'yes',
    ours: 'yes',
    acceptance: 'All 48 public PNGs listed, framed and inspectable.',
  },
  {
    capability: 'Quantified source flaw report',
    spriteMotionLab: 'yes',
    strideLab: 'partial',
    funicular: 'partial',
    proceduralRunner: 'partial',
    ours: 'yes',
    acceptance: 'IoU, jitter, foot separation and stance lock computed from real pixels.',
  },
  {
    capability: 'Articulated neck + forward lean',
    spriteMotionLab: 'yes',
    strideLab: 'yes',
    funicular: 'yes',
    proceduralRunner: 'yes',
    ours: 'yes',
    acceptance: 'Neck counter-pitch is a function of torso lean; visible at 0.25x speed.',
  },
  {
    capability: 'Two-bone IK limbs',
    spriteMotionLab: 'yes',
    strideLab: 'yes',
    funicular: 'yes',
    proceduralRunner: 'partial',
    ours: 'yes',
    acceptance: 'Analytic solver with clamped reach; telemetry gates in tests.',
  },
  {
    capability: 'Rolling two-segment shoe',
    spriteMotionLab: 'yes',
    strideLab: 'partial',
    funicular: 'yes',
    proceduralRunner: 'partial',
    ours: 'yes',
    acceptance: 'Heel–ball–toe roll; sole lowest point never penetrates the ground line.',
  },
  {
    capability: 'Run / walk / brisk-walk profiles',
    spriteMotionLab: 'yes',
    strideLab: 'yes',
    funicular: 'gap',
    proceduralRunner: 'gap',
    ours: 'yes',
    acceptance: 'Duty 0.38/0.56/0.62; flight for run, double support for walks.',
  },
  {
    capability: 'Male + female procedural personas',
    spriteMotionLab: 'yes',
    strideLab: 'yes',
    funicular: 'yes',
    proceduralRunner: 'yes',
    ours: 'yes',
    acceptance: 'Distinct skin, silhouette, hair and ponytail secondary motion.',
  },
  {
    capability: 'Six colourways',
    spriteMotionLab: 'yes',
    strideLab: 'yes',
    funicular: 'yes',
    proceduralRunner: 'yes',
    ours: 'yes',
    acceptance: 'Palette switch preserves phase, persona and motion.',
  },
  {
    capability: 'Ponytail secondary motion',
    spriteMotionLab: 'yes',
    strideLab: 'yes',
    funicular: 'partial',
    proceduralRunner: 'partial',
    ours: 'yes',
    acceptance: 'Lag amplitude follows cycle; hidden for the male persona.',
  },
  {
    capability: '17-part rig inspector',
    spriteMotionLab: 'yes',
    strideLab: 'partial',
    funicular: 'partial',
    proceduralRunner: 'partial',
    ours: 'yes',
    acceptance: 'Every part has a stable id and an isolation view.',
  },
  {
    capability: 'Skeleton / onion-skin / ground overlays',
    spriteMotionLab: 'yes',
    strideLab: 'yes',
    funicular: 'yes',
    proceduralRunner: 'partial',
    ours: 'yes',
    acceptance: 'Overlays do not alter exported sprite pixels.',
  },
  {
    capability: 'Reference-vs-procedural comparison',
    spriteMotionLab: 'yes',
    strideLab: 'yes',
    funicular: 'yes',
    proceduralRunner: 'yes',
    ours: 'yes',
    acceptance: 'Phase-linked reference frame and live rig share the stage.',
  },
  {
    capability: 'Downloadable sprite sheet export',
    spriteMotionLab: 'yes',
    strideLab: 'yes',
    funicular: 'partial',
    proceduralRunner: 'yes',
    ours: 'yes',
    acceptance: 'Transparent RGBA, 8 cells, origin recorded, filename carries persona/motion.',
  },
  {
    capability: '16-phase multi-background audit export',
    spriteMotionLab: 'yes',
    strideLab: 'yes',
    funicular: 'yes',
    proceduralRunner: 'gap',
    ours: 'yes',
    acceptance: '48 panels sharing the app renderer; light, dark and skeleton columns.',
  },
  {
    capability: 'Photographic persona pipeline',
    spriteMotionLab: 'yes',
    strideLab: 'yes',
    funicular: 'yes',
    proceduralRunner: 'partial',
    ours: 'gap',
    acceptance: 'Not claimed: no studio plates or matte pipeline shipped yet.',
  },
  {
    capability: 'Rounded-end joint cutter / ball sockets',
    spriteMotionLab: 'yes',
    strideLab: 'yes',
    funicular: 'partial',
    proceduralRunner: 'gap',
    ours: 'gap',
    acceptance: 'Procedural joints are capsule-rounded; photo cutter remains deferred.',
  },
  {
    capability: 'Pure-SVG vector output',
    spriteMotionLab: 'yes',
    strideLab: 'gap',
    funicular: 'partial',
    proceduralRunner: 'gap',
    ours: 'yes',
    acceptance: '48 SVGs from real frames; re-rasterised mean mask IoU 0.926, colour match 0.890.',
  },
  {
    capability: 'Interactive joint/hip calibration + exports',
    spriteMotionLab: 'yes',
    strideLab: 'yes',
    funicular: 'gap',
    proceduralRunner: 'gap',
    ours: 'yes',
    acceptance: 'Six clamped offsets; leg roots stay fixed; JSON + calibrated PNG export.',
  },
  {
    capability: 'Asset failure / retry handling',
    spriteMotionLab: 'partial',
    strideLab: 'yes',
    funicular: 'partial',
    proceduralRunner: 'gap',
    ours: 'yes',
    acceptance: 'Manifest/analysis load errors surface with retry; exports disabled.',
  },
  {
    capability: 'Automated discipline gate',
    spriteMotionLab: 'yes',
    strideLab: 'partial',
    funicular: 'partial',
    proceduralRunner: 'partial',
    ours: 'yes',
    acceptance: 'Function/file limits, JSX purity, testids, Docker and ledger checks.',
  },
  {
    capability: 'Live n-way parity ledger',
    spriteMotionLab: 'partial',
    strideLab: 'partial',
    funicular: 'partial',
    proceduralRunner: 'gap',
    ours: 'yes',
    acceptance: 'Five-branch hash table, history JSON, in-app matrix, per-turn update.',
  },
  {
    capability: 'Per-turn learning register',
    spriteMotionLab: 'yes',
    strideLab: 'yes',
    funicular: 'yes',
    proceduralRunner: 'gap',
    ours: 'yes',
    acceptance: 'docs/FDS.md learning entries grow every turn with evidence.',
  },
] as const;

export const countByStatus = (): Record<ParityStatus, number> => {
  const counts: Record<ParityStatus, number> = { yes: 0, partial: 0, gap: 0, unverified: 0 };
  for (const row of PARITY_ROWS) counts[row.ours] += 1;
  return counts;
};
