import { CANONICAL_PHASE_NAMES } from '../runner/gait.js';

export type PoseBankFrameKey = 'H00' | 'H01' | 'H02' | 'H03' | 'H04' | 'H05' | 'H06' | 'H07' | 'H08';
export type VisibilityScore = 0 | 1 | 2 | 3;
export type PoseCandidateStatus = 'planned' | 'accepted' | 'conditional' | 'rejected' | 'needs-regeneration';

export interface PoseBankCharacterProfile {
  readonly characterId: string;
  readonly masterImagePath: string;
  readonly identityLock: string;
  readonly wardrobeLock: string;
  readonly cameraLock?: string;
  readonly backgroundLock?: string;
}

export interface PoseBankFrameSpec {
  readonly key: PoseBankFrameKey;
  readonly phase: number | null;
  readonly phaseName: string;
  readonly target: string;
  readonly mustShow: readonly string[];
}

export const POSE_BANK_FRAME_SPECS: readonly PoseBankFrameSpec[] = [
  { key: 'H00', phase: null, phaseName: 'Neutral right-facing profile', target: 'identity, proportions, clothing, baseline pivots', mustShow: ['full hair-to-sole silhouette', 'head and footwear inside frame'] },
  { key: 'H01', phase: 0, phaseName: CANONICAL_PHASE_NAMES[0] ?? 'Right Contact (Midfoot Strike)', target: 'near-side contact and opposite recovery', mustShow: ['near support contact', 'far recovery limb', 'both shoes'] },
  { key: 'H02', phase: 0.125, phaseName: CANONICAL_PHASE_NAMES[1] ?? 'Right Down (Sole Roll & Cushion)', target: 'loaded stance, knee cushion and sole roll', mustShow: ['loaded support knee', 'grounded support shoe', 'opposite swing limb'] },
  { key: 'H03', phase: 0.25, phaseName: CANONICAL_PHASE_NAMES[2] ?? 'Right Pass (Heel-Off & Toe Roll)', target: 'toe-off support and forward swing', mustShow: ['support forefoot contact', 'raised support heel', 'forward swing knee and shoe'] },
  { key: 'H04', phase: 0.375, phaseName: CANONICAL_PHASE_NAMES[3] ?? 'Right Flight (Forward Fall Drive)', target: 'airborne leg separation', mustShow: ['both shoes airborne', 'negative space around knees and ankles'] },
  { key: 'H05', phase: 0.5, phaseName: CANONICAL_PHASE_NAMES[4] ?? 'Left Contact (Midfoot Strike)', target: 'opposite support half-cycle', mustShow: ['far-side contact', 'near-side recovery', 'same camera-side identity'] },
  { key: 'H06', phase: 0.625, phaseName: CANONICAL_PHASE_NAMES[5] ?? 'Left Down (Sole Roll & Cushion)', target: 'opposite loaded stance and knee cushion', mustShow: ['loaded far-side support knee', 'sole roll', 'near-side swing limb'] },
  { key: 'H07', phase: 0.75, phaseName: CANONICAL_PHASE_NAMES[6] ?? 'Left Pass (Heel-Off & Toe Roll)', target: 'opposite toe-off and forward swing', mustShow: ['far-side toe-off', 'raised heel', 'near-side forward swing'] },
  { key: 'H08', phase: 0.875, phaseName: CANONICAL_PHASE_NAMES[7] ?? 'Left Flight (Forward Fall Drive)', target: 'contralateral airborne leg separation', mustShow: ['both shoes airborne', 'near/far ordering unchanged'] },
];

export interface PoseBankPlanFrame extends PoseBankFrameSpec {
  readonly poseGuidePath: string | null;
  readonly promptPath: string | null;
  readonly status: PoseCandidateStatus;
  readonly attempts: readonly PoseCandidateAttempt[];
  readonly visibility: Readonly<Record<string, VisibilityScore>>;
}

export interface PoseCandidateAttempt {
  readonly attemptId: string;
  readonly candidatePath: string;
  readonly promptPath: string;
  readonly promptSha256?: string;
  readonly masterSha256: string;
  readonly candidateSha256: string;
  readonly poseGuidePath?: string;
  readonly poseGuideSha256?: string;
  readonly status: Exclude<PoseCandidateStatus, 'planned' | 'needs-regeneration'>;
  readonly reviewNote: string;
}

export interface CanonicalJigSource {
  readonly canonicalPartId: string;
  readonly anatomicalSide: 'near' | 'far' | 'midline';
  readonly sourceFrameKey: PoseBankFrameKey;
  readonly sourceCandidatePath: string;
  readonly sourceCandidateSha256: string;
  readonly pivot: { readonly x: number; readonly y: number };
  readonly visibilityScore: VisibilityScore;
  readonly manualCleanupNotes: string;
}

export interface JigPoseVariant {
  readonly variantId: string;
  readonly canonicalPartId: string;
  readonly sourceFrameKey: PoseBankFrameKey;
  readonly sourceCandidatePath: string;
  readonly sourceCandidateSha256: string;
  readonly reason: string;
  readonly pivot: { readonly x: number; readonly y: number };
  readonly scale: number;
  readonly paletteId: string;
}

export interface JigPoseInstance {
  readonly frameKey: PoseBankFrameKey;
  readonly canonicalPartId: string;
  readonly variantId?: string;
  readonly transform: { readonly x: number; readonly y: number; readonly rotationDeg: number; readonly scale: number };
  readonly zOrder: number;
  readonly visible: boolean;
}

export interface PoseBankManifest {
  readonly schemaVersion: 1;
  readonly characterId: string;
  readonly identityAnchor: { readonly path: string; readonly sha256: string };
  readonly frames: readonly PoseBankPlanFrame[];
  readonly canonicalJigSources: readonly CanonicalJigSource[];
  readonly poseVariants: readonly JigPoseVariant[];
  readonly poseInstances: readonly JigPoseInstance[];
}

export interface PoseBankScaffold {
  readonly manifest: PoseBankManifest;
  readonly prompts: Readonly<Record<Exclude<PoseBankFrameKey, 'H00'>, string>>;
}

export function createPoseBankScaffold(
  profile: PoseBankCharacterProfile,
  masterSha256: string,
  guideDirectory: string,
  promptDirectory: string,
): PoseBankScaffold {
  const prompts = Object.fromEntries(
    POSE_BANK_FRAME_SPECS.filter((frame) => frame.key !== 'H00').map((frame) => [
      frame.key,
      buildPosePrompt(profile, frame),
    ]),
  ) as PoseBankScaffold['prompts'];

  const frames: PoseBankPlanFrame[] = POSE_BANK_FRAME_SPECS.map((frame) => ({
    ...frame,
    poseGuidePath: frame.key === 'H00' ? null : `${guideDirectory}/${frame.key}-pose-guide.png`,
    promptPath: frame.key === 'H00' ? null : `${promptDirectory}/${frame.key}.txt`,
    status: frame.key === 'H00' ? 'accepted' : 'planned',
    attempts: [],
    visibility: {},
  }));

  return {
    manifest: {
      schemaVersion: 1,
      characterId: profile.characterId,
      identityAnchor: { path: profile.masterImagePath, sha256: masterSha256 },
      frames,
      canonicalJigSources: [],
      poseVariants: [],
      poseInstances: [],
    },
    prompts,
  };
}

export function buildPosePrompt(profile: PoseBankCharacterProfile, frame: PoseBankFrameSpec): string {
  if (frame.key === 'H00') throw new Error('H00 is the accepted neutral master and is not regenerated by this prompt builder.');
  const camera = profile.cameraLock ?? 'strict 90-degree orthographic right-facing lateral profile; fixed camera, subject scale, and full-body framing';
  const background = profile.backgroundLock ?? 'flat, shadowless magenta chroma background matching the accepted master';
  const target = phaseSpecificPrompt(frame);
  return [
    `Generate one photorealistic full-body studio image of the exact same subject shown in reference image 1. Image 1 is the sole source for identity, face, proportions, skin tone, hair, outfit, footwear, camera, lighting and scale. Image 2 is only a pose guide: copy joint positions and near/far limb ordering, not its appearance, colors, pixels or background.`,
    `Identity lock: ${profile.identityLock}`,
    `Wardrobe lock: ${profile.wardrobeLock}`,
    `${frame.key}, phi ${frame.phase?.toFixed(3)}: ${target}`,
    `Required visible landmarks: ${frame.mustShow.join('; ')}. Keep every target segment and endpoint in frame, distinct from adjacent silhouettes.`,
    `${camera}; full hair-to-sole figure centered in a 1408 by 768 landscape image. One person only; anatomically plausible frozen instant; no motion blur, trails, duplicated or missing limbs, fused joints/shoes, crop, perspective, camera turn, text, logos, props or collage.`,
    `${background}; no visible floor, horizon, gradient, texture, contact patch or cast shadow; crisp even studio lighting.`,
  ].join(' ');
}

function phaseSpecificPrompt(frame: PoseBankFrameSpec): string {
  switch (frame.key) {
    case 'H01': return 'Right Contact / midfoot strike. The camera-near leg is the support leg with a forefoot/midfoot landing and softly flexed knee; the far leg trails behind with a lifted shoe. Arms counter-swing.';
    case 'H02': return 'Right Down / sole roll and cushion. Load the camera-near support leg, flex its knee and lower the pelvis; roll the shoe through a grounded sole. The far leg trails in recovery.';
    case 'H03': return 'Right Pass / heel-off and toe roll. Keep the camera-near support knee close beneath the hip, lower leg angled back, forefoot/toes on the ground and heel raised; the far knee passes forward with a bent shin and airborne shoe.';
    case 'H04': return 'Right Flight / forward-fall drive. Both shoes are clearly airborne; keep the near leg trailing through toe-off/recovery and the far leg reaching forward with a bent knee, matching the guide rather than inventing a high-knee sprint.';
    case 'H05': return 'Left Contact / midfoot strike. This is the opposite support half-cycle, not a camera swap: the far/background leg contacts with a softly flexed knee, and the near/foreground leg swings back with a lifted shoe.';
    case 'H06': return 'Left Down / sole roll and cushion. The far/background leg is loaded, knee flexed and shoe rolling through a grounded sole; the near/foreground leg trails in swing recovery.';
    case 'H07': return 'Left Pass / heel-off and toe roll. The far/background support leg has its heel raised with only the forefoot/toes at the baseline; the near/foreground leg swings through with a bent knee and lifted shoe.';
    case 'H08': return 'Left Flight / forward-fall drive. Both shoes are visibly airborne; the near leg reaches forward while the far leg trails through toe-off/recovery, with near/far identity unchanged.';
    case 'H00': return 'Neutral reference.';
  }
}

export function selectBestHarvestFrame(
  visibilityByFrame: Readonly<Partial<Record<PoseBankFrameKey, VisibilityScore>>>,
  acceptedFrames: readonly PoseBankFrameKey[],
  minimumScore: VisibilityScore = 2,
): PoseBankFrameKey | null {
  const accepted = new Set(acceptedFrames);
  return POSE_BANK_FRAME_SPECS
    .filter((frame) => accepted.has(frame.key))
    .map((frame) => ({ key: frame.key, score: visibilityByFrame[frame.key] ?? 0 }))
    .filter((entry) => entry.score >= minimumScore)
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))[0]?.key ?? null;
}

export function selectManifestHarvestFrame(
  manifest: PoseBankManifest,
  canonicalPartId: string,
  minimumScore: VisibilityScore = 2,
): PoseBankFrameKey | null {
  const scores = Object.fromEntries(
    manifest.frames.map((frame) => [frame.key, frame.visibility[canonicalPartId] ?? 0]),
  ) as Partial<Record<PoseBankFrameKey, VisibilityScore>>;
  const acceptedFrames = manifest.frames
    .filter((frame) => frame.status === 'accepted')
    .map((frame) => frame.key);
  return selectBestHarvestFrame(scores, acceptedFrames, minimumScore);
}

export function assertJigPoseVariant(variant: JigPoseVariant): void {
  if (!variant.variantId.trim() || !variant.canonicalPartId.trim() || !variant.sourceCandidatePath.trim() || !variant.sourceCandidateSha256.trim()) {
    throw new Error('A pose variant must link to a canonical part and immutable source candidate/hash.');
  }
  if (!variant.reason.trim()) throw new Error('A pose variant requires a documented silhouette-change reason.');
  if (!Number.isFinite(variant.scale) || variant.scale <= 0) throw new Error('A pose variant scale must be finite and positive.');
  if (!Number.isFinite(variant.pivot.x) || !Number.isFinite(variant.pivot.y)) throw new Error('A pose variant requires a finite pivot.');
}
