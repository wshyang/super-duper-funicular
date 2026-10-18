import type { ImageCatalogManifest, SpriteFlawAnalysisReport } from '../../shared/types.js';

export interface FormattedFlawCard {
  readonly id: string;
  readonly severity: string;
  readonly title: string;
  readonly summary: string;
  readonly quantitativeEvidence: string;
  readonly biomechanicalImpact: string;
  readonly algorithmicFix: string;
}

export interface FormattedHalfCycleRow {
  readonly pairLabel: string;
  readonly iouPercent: string;
  readonly dHashLabel: string;
  readonly verdictLabel: string;
}

export interface FormattedCatalogRow {
  readonly filedPath: string;
  readonly category: string;
  readonly dimensionsLabel: string;
  readonly shortPixelHash: string;
  readonly dHash64: string;
  readonly status: string;
  readonly description: string;
}

export const INITIAL_FLAW_CARDS: readonly FormattedFlawCard[] = [
  {
    id: 'FLAW-01',
    severity: 'CRITICAL',
    title: 'Half-Cycle Frame Duplication (4 Poses Doubled into 8 Columns)',
    summary:
      'Frames 5, 6, 7, and 8 are near-identical copies of Frames 1, 2, 3, and 4 rather than the second half of an 8-frame running stride.',
    quantitativeEvidence:
      'Mean centroid-aligned silhouette IoU between Frame k and Frame k+4 is 94.7% (4 unique poses out of 8 columns per row; 24 unique poses out of 48 total cells).',
    biomechanicalImpact:
      'Halves the effective animation resolution to 4 frames and causes the cycle to repeat twice per loop.',
    algorithmicFix:
      'Evaluate continuous gait phase φ ∈ [0, 1) across 8 distinct 45° phase increments (φ = 0.000, 0.125, ..., 0.875) with zero duplicated poses.',
  },
  {
    id: 'FLAW-02',
    severity: 'CRITICAL',
    title: 'Missing Alternating Gait — Unilateral "Peg-Leg" Hop',
    summary:
      'Despite the sheet title claiming "(Alternating Gait)", the same leg (far leg) stays permanently extended in front and the near leg stays permanently behind across all 8 frames.',
    quantitativeEvidence:
      'In all 8 frames, frontFootOffsetX > +53 px and rearFootOffsetX < -92 px with identical limb shading order; left and right legs never swap lead.',
    biomechanicalImpact:
      'A human runner alternates left and right lead legs every half-stride (180° phase offset) with opposite arm counter-rotation. Keeping one leg permanently ahead produces a one-legged hop.',
    algorithmicFix:
      'Drive the near (right) leg at phase φ and the far (left) leg at exact anti-phase (φ + 0.5) mod 1, with counter-phased arm swing and distinct near/far depth shading.',
  },
  {
    id: 'FLAW-03',
    severity: 'CRITICAL',
    title: 'Zero Leg Crossover (Missing "Pass" / Recovery Phase)',
    summary:
      'Neither leg ever passes beneath the pelvis; the legs remain permanently scissored apart in every frame.',
    quantitativeEvidence:
      'Minimum horizontal foot-to-foot separation across all 8 frames is 147 px (a real run cycle crosses 0 px twice per stride during the Pass phase).',
    biomechanicalImpact:
      'Without a passing pose where the swing knee overtakes the stance leg under the hip, the limbs appear to oscillate statically in place and snap backward instantly between Frame 4 and Frame 5/1.',
    algorithmicFix:
      'Solve closed orbital foot trajectories where the stance foot sweeps backward on the ground via 2-bone IK while the swing knee drives forward past the hip at φ = 0.25 and φ = 0.75.',
  },
  {
    id: 'FLAW-04',
    severity: 'MAJOR',
    title: 'Unregistered Pivot & Counter-Physical Scale/Baseline Jitter',
    summary:
      'Character body height, head volume, and ground contact line fluctuate erratically between adjacent cells.',
    quantitativeEvidence:
      'Bounding-box height varies by 20 px (211 px to 231 px) and the raw cell ground baseline shifts by 25 px without matching ballistic flight phases.',
    biomechanicalImpact:
      'Playing raw cell crops causes vertical popping and horizontal sliding, while the character shrinks during mid-stride.',
    algorithmicFix:
      'Enforce invariant segment bone lengths (femur, tibia, trunk, humerus, forearm) from a single anatomical rig with double-frequency pelvis bob Δy(φ) locked to stance/flight physics.',
  },
  {
    id: 'FLAW-05',
    severity: 'MODERATE',
    title: 'Two-Tone Magenta Checkerboard & JPEG Chroma Spill',
    summary:
      'The sheet combines #FF00FF grid lines over #FD49FD pink cell backgrounds with JPEG 8×8 block compression artifacts.',
    quantitativeEvidence:
      'Cell backgrounds average RGB(253, 74, 253) while dividers are RGB(253, 0, 252), with 1–2 px magenta fringe bleed along dark outlines.',
    biomechanicalImpact:
      'Naive single-color chroma keying leaves pink halos around the runner or accidentally erodes purple jersey pixels.',
    algorithmicFix:
      'Use border-seeded flood-fill chroma keying with boundary despill for extraction, and render algorithmic sprites directly into clean RGBA buffers.',
  },
];

export const INITIAL_HALF_CYCLE_ROWS: readonly FormattedHalfCycleRow[] = [
  {
    pairLabel: 'Frame 1 ↔ Frame 5',
    iouPercent: '96.4%',
    dHashLabel: '2 / 64 bits',
    verdictLabel: 'DUPLICATE POSE (Same Leg Forward)',
  },
  {
    pairLabel: 'Frame 2 ↔ Frame 6',
    iouPercent: '96.9%',
    dHashLabel: '1 / 64 bits',
    verdictLabel: 'DUPLICATE POSE (Same Leg Forward)',
  },
  {
    pairLabel: 'Frame 3 ↔ Frame 7',
    iouPercent: '91.8%',
    dHashLabel: '4 / 64 bits',
    verdictLabel: 'DUPLICATE POSE (Same Leg Forward)',
  },
  {
    pairLabel: 'Frame 4 ↔ Frame 8',
    iouPercent: '93.8%',
    dHashLabel: '0 / 64 bits',
    verdictLabel: 'DUPLICATE POSE (Same Leg Forward)',
  },
];

export const INITIAL_CATALOG_ROWS: readonly FormattedCatalogRow[] = [
  {
    filedPath: 'src/images/spritesheets/runner-8frame-6color-flawed-sheet.jpeg',
    category: 'spritesheet-reference',
    dimensionsLabel: '2528 × 1696 px',
    shortPixelHash: 'a94c18e2...4f01',
    dHash64: '94d6d6d6d6d6d6cc',
    status: 'active (deduplicated from incorrect running sprites.jpeg)',
    description:
      'Original magenta-backed 6-color × 8-frame running sprite sheet (4 unique poses doubled per row).',
  },
  {
    filedPath: 'src/images/spritesheets/runner-8frame-6color-algorithmic-sheet.png',
    category: 'spritesheet-algorithmic',
    dimensionsLabel: '1760 × 1536 px',
    shortPixelHash: '7b3e90a1...c812',
    dHash64: '6b5a5a5a5a5a5a33',
    status: 'active',
    description:
      'Algorithmically generated 6-color × 8-frame true alternating-gait running sprite sheet with 2-bone IK.',
  },
  {
    filedPath: 'src/images/backdrops/stadium-track-day.png',
    category: 'backdrop',
    dimensionsLabel: '640 × 256 px',
    shortPixelHash: '3c19f40d...91e0',
    dHash64: '0000000000000000',
    status: 'active',
    description: 'Daylight stadium running track parallax backdrop.',
  },
  {
    filedPath: 'src/images/backdrops/stadium-track-dusk.png',
    category: 'backdrop',
    dimensionsLabel: '640 × 256 px',
    shortPixelHash: '5e82b14a...22a9',
    dHash64: '0000000000000000',
    status: 'active',
    description: 'Golden-hour dusk stadium running track parallax backdrop.',
  },
  {
    filedPath: 'src/images/backdrops/stadium-track-night.png',
    category: 'backdrop',
    dimensionsLabel: '640 × 256 px',
    shortPixelHash: '8f04d72c...17b4',
    dHash64: '0000000000000000',
    status: 'active',
    description: 'Floodlit night stadium running track parallax backdrop.',
  },
];

export function formatReportToRows(report: SpriteFlawAnalysisReport): {
  flawCards: FormattedFlawCard[];
  halfCycleRows: FormattedHalfCycleRow[];
} {
  const flawCards = report.flaws.map((f) => ({
    id: f.id,
    severity: f.severity.toUpperCase(),
    title: f.title,
    summary: f.summary,
    quantitativeEvidence: f.quantitativeEvidence,
    biomechanicalImpact: f.biomechanicalImpact,
    algorithmicFix: f.algorithmicFix,
  }));
  const halfCycleRows = report.halfCyclePairs.map((p) => ({
    pairLabel: `Frame ${p.frameA} ↔ Frame ${p.frameB}`,
    iouPercent: `${Math.round(p.silhouetteIoU * 1000) / 10}%`,
    dHashLabel: `${p.dHashHammingDistance} / 64 bits`,
    verdictLabel: p.isHalfCycleDuplicate ? 'DUPLICATE POSE (Same Leg Forward)' : 'Distinct',
  }));
  return { flawCards, halfCycleRows };
}

export function formatCatalogToRows(manifest: ImageCatalogManifest): FormattedCatalogRow[] {
  return manifest.entries.map((e) => ({
    filedPath: e.filedPath,
    category: e.assetCategory,
    dimensionsLabel: `${e.width} × ${e.height} px`,
    shortPixelHash: `${e.pixelSha256.slice(0, 10)}...${e.pixelSha256.slice(-4)}`,
    dHash64: e.dHash64,
    status: e.status,
    description: e.description,
  }));
}
