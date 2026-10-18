import fs from 'node:fs';
import path from 'node:path';
import type { DedupeFileEntry, ImageCatalogManifest } from '../shared/types.js';
import { computeDHash64, sha256Buffer, sha256Raster } from './hashing.js';
import { decodeImageBuffer } from './image-io.js';

export interface DedupeWorkspaceConfig {
  readonly repoRoot: string;
  readonly srcImagesDir: string;
  readonly publicCatalogPath: string;
}

interface CandidateMapping {
  readonly sourceRelPath: string;
  readonly targetRelPath: string;
  readonly category: 'spritesheet-reference' | 'spritesheet-algorithmic' | 'backdrop';
  readonly description: string;
}

const KNOWN_FILE_MAPPINGS: readonly CandidateMapping[] = [
  {
    sourceRelPath: 'incorrect running sprites.jpeg',
    targetRelPath: 'src/images/spritesheets/runner-8frame-6color-flawed-sheet.jpeg',
    category: 'spritesheet-reference',
    description:
      'Original magenta-backed 6-color × 8-frame running sprite sheet (contains 4 unique poses doubled per row; unilateral non-alternating gait).',
  },
  {
    sourceRelPath: 'src/images/spritesheets/runner-8frame-6color-flawed-sheet.jpeg',
    targetRelPath: 'src/images/spritesheets/runner-8frame-6color-flawed-sheet.jpeg',
    category: 'spritesheet-reference',
    description:
      'Original magenta-backed 6-color × 8-frame running sprite sheet (contains 4 unique poses doubled per row; unilateral non-alternating gait).',
  },
  {
    sourceRelPath: 'src/images/spritesheets/runner-8frame-6color-algorithmic-sheet.png',
    targetRelPath: 'src/images/spritesheets/runner-8frame-6color-algorithmic-sheet.png',
    category: 'spritesheet-algorithmic',
    description:
      'Algorithmically generated 6-color × 8-frame Singapore Chinese Male runner sprite sheet (articulated neck, forward-fall lean, midfoot-to-toe foot roll, 2-bone IK).',
  },
  {
    sourceRelPath: 'src/images/spritesheets/runner-8frame-6color-female-algorithmic-sheet.png',
    targetRelPath: 'src/images/spritesheets/runner-8frame-6color-female-algorithmic-sheet.png',
    category: 'spritesheet-algorithmic',
    description:
      'Algorithmically generated 6-color × 8-frame Singapore Chinese Female runner sprite sheet (articulated ponytail, cervical neck pivot, forward-fall lean, midfoot-to-toe foot roll).',
  },
  {
    sourceRelPath: 'src/images/spritesheets/runner-8frame-6color-photoreal-female-sheet.png',
    targetRelPath: 'src/images/spritesheets/runner-8frame-6color-photoreal-female-sheet.png',
    category: 'spritesheet-algorithmic',
    description:
      'Photorealistic 6-color × 8-frame Singaporean Chinese Female (Athletic Build) runner sprite sheet composed from 10 studio photographic cutouts.',
  },
  {
    sourceRelPath: 'src/images/spritesheets/runner-8frame-6color-photoreal-female-average-sheet.png',
    targetRelPath: 'src/images/spritesheets/runner-8frame-6color-photoreal-female-average-sheet.png',
    category: 'spritesheet-algorithmic',
    description:
      'Photorealistic 6-color × 8-frame Singaporean Chinese Female (Average / Everyday Body-Positive Build) runner sprite sheet composed from 10 studio photographic cutouts with swinging long flowing hair.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female/01-master-lateral-profile-reference.png',
    targetRelPath: 'src/images/photoreal-female/01-master-lateral-profile-reference.png',
    category: 'spritesheet-reference',
    description: 'Master right-facing sagittal studio photograph of Singaporean Chinese female sprinter on #FF00FF magenta.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female/02-head-profile-right.png',
    targetRelPath: 'src/images/photoreal-female/02-head-profile-right.png',
    category: 'spritesheet-reference',
    description: 'Photorealistic cutout source: Right-facing head & facial profile of Singaporean Chinese female sprinter.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female/03-ponytail-hair-accessory.png',
    targetRelPath: 'src/images/photoreal-female/03-ponytail-hair-accessory.png',
    category: 'spritesheet-reference',
    description: 'Photorealistic cutout source: Sleek black ponytail & crimson scrunchie hair tie.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female/04-cervical-neck-cylinder.png',
    targetRelPath: 'src/images/photoreal-female/04-cervical-neck-cylinder.png',
    category: 'spritesheet-reference',
    description: 'Photorealistic cutout source: Articulated cervical neck cylinder.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female/05-torso-racerback-singlet.png',
    targetRelPath: 'src/images/photoreal-female/05-torso-racerback-singlet.png',
    category: 'spritesheet-reference',
    description: 'Photorealistic cutout source: Red-and-white Singapore Athletics racerback crop singlet & midriff.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female/06-pelvis-sprinter-shorts.png',
    targetRelPath: 'src/images/photoreal-female/06-pelvis-sprinter-shorts.png',
    category: 'spritesheet-reference',
    description: 'Photorealistic cutout source: Pelvis & dark charcoal fitted sprinter shorts.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female/07-near-right-arm-lateral-outside.png',
    targetRelPath: 'src/images/photoreal-female/07-near-right-arm-lateral-outside.png',
    category: 'spritesheet-reference',
    description: 'Photorealistic cutout source: Right (Near) arm viewed from OUTSIDE (lateral deltoid, forearm, sky-blue sweatband & dorsal fist).',
  },
  {
    sourceRelPath: 'src/images/photoreal-female/08-far-left-arm-medial-inside-palm.png',
    targetRelPath: 'src/images/photoreal-female/08-far-left-arm-medial-inside-palm.png',
    category: 'spritesheet-reference',
    description: 'Photorealistic cutout source: Left (Far) arm viewed from INSIDE (medial biceps, cubital elbow crease, inner forearm & palm).',
  },
  {
    sourceRelPath: 'src/images/photoreal-female/09-near-right-leg-lateral-outside-shoe.png',
    targetRelPath: 'src/images/photoreal-female/09-near-right-leg-lateral-outside-shoe.png',
    category: 'spritesheet-reference',
    description: 'Photorealistic cutout source: Right (Near) leg & shoe viewed from OUTSIDE (lateral thigh, calf & lateral swoosh racing shoe).',
  },
  {
    sourceRelPath: 'src/images/photoreal-female/10-far-left-leg-medial-inside-shoe.png',
    targetRelPath: 'src/images/photoreal-female/10-far-left-leg-medial-inside-shoe.png',
    category: 'spritesheet-reference',
    description: 'Photorealistic cutout source: Left (Far) leg & shoe viewed from INSIDE (medial thigh, inner calf, white sock & medial arch shoe).',
  },
  {
    sourceRelPath: 'src/images/photoreal-female-average/01-master-lateral-profile-reference.png',
    targetRelPath: 'src/images/photoreal-female-average/01-master-lateral-profile-reference.png',
    category: 'spritesheet-reference',
    description: 'Master right-facing sagittal studio photograph of everyday average-build Singaporean Chinese woman on #FF00FF magenta.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female-average/02-head-profile-right.png',
    targetRelPath: 'src/images/photoreal-female-average/02-head-profile-right.png',
    category: 'spritesheet-reference',
    description: 'Photorealistic cutout source (Average Build): Right-facing head & softer fuller facial profile with crimson headband.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female-average/03-ponytail-hair-accessory.png',
    targetRelPath: 'src/images/photoreal-female-average/03-ponytail-hair-accessory.png',
    category: 'spritesheet-reference',
    description: 'Photorealistic cutout source (Average Build): Loose long flowing dark hair cascade plume.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female-average/04-cervical-neck-cylinder.png',
    targetRelPath: 'src/images/photoreal-female-average/04-cervical-neck-cylinder.png',
    category: 'spritesheet-reference',
    description: 'Photorealistic cutout source (Average Build): Articulated cervical neck cylinder.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female-average/05-torso-racerback-singlet.png',
    targetRelPath: 'src/images/photoreal-female-average/05-torso-racerback-singlet.png',
    category: 'spritesheet-reference',
    description: 'Photorealistic cutout source (Average Build): Full-waist crimson sleeveless running top with softer fuller waist contour.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female-average/06-pelvis-sprinter-shorts.png',
    targetRelPath: 'src/images/photoreal-female-average/06-pelvis-sprinter-shorts.png',
    category: 'spritesheet-reference',
    description: 'Photorealistic cutout source (Average Build): Fuller everyday hip and glute contour in charcoal mid-thigh running shorts.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female-average/07-near-right-arm-lateral-outside.png',
    targetRelPath: 'src/images/photoreal-female-average/07-near-right-arm-lateral-outside.png',
    category: 'spritesheet-reference',
    description: 'Photorealistic cutout source (Average Build): Right (Near) softer non-muscular arm viewed from OUTSIDE.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female-average/08-far-left-arm-medial-inside-palm.png',
    targetRelPath: 'src/images/photoreal-female-average/08-far-left-arm-medial-inside-palm.png',
    category: 'spritesheet-reference',
    description: 'Photorealistic cutout source (Average Build): Left (Far) softer arm in 90-degree running L-bend viewed from INSIDE.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female-average/09-near-right-leg-lateral-outside-shoe.png',
    targetRelPath: 'src/images/photoreal-female-average/09-near-right-leg-lateral-outside-shoe.png',
    category: 'spritesheet-reference',
    description: 'Photorealistic cutout source (Average Build): Right (Near) fuller leg & cushioned everyday running shoe viewed from OUTSIDE.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female-average/10-far-left-leg-medial-inside-shoe.png',
    targetRelPath: 'src/images/photoreal-female-average/10-far-left-leg-medial-inside-shoe.png',
    category: 'spritesheet-reference',
    description: 'Photorealistic cutout source (Average Build): Left (Far) fuller leg & cushioned everyday running shoe viewed from INSIDE.',
  },
  {
    sourceRelPath: 'src/images/spritesheets/runner-8frame-6color-photoreal-female-petite-sheet.png',
    targetRelPath: 'src/images/spritesheets/runner-8frame-6color-photoreal-female-petite-sheet.png',
    category: 'spritesheet-algorithmic',
    description:
      'Photorealistic 6-color × 8-frame Singaporean Chinese Female (Slim Petite UK 4-6 Build) runner sprite sheet composed from 10 studio photographic cutouts.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female-petite/01-master-lateral-profile-reference.png',
    targetRelPath: 'src/images/photoreal-female-petite/01-master-lateral-profile-reference.png',
    category: 'spritesheet-reference',
    description: 'Master right-facing sagittal studio photograph of slim petite Singaporean Chinese female runner on #FF00FF magenta.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female-petite/02-head-profile-right.png',
    targetRelPath: 'src/images/photoreal-female-petite/02-head-profile-right.png',
    category: 'spritesheet-reference',
    description: 'Photorealistic cutout source (Slim Petite Build): Delicate oval right-facing head & facial profile.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female-petite/03-ponytail-hair-accessory.png',
    targetRelPath: 'src/images/photoreal-female-petite/03-ponytail-hair-accessory.png',
    category: 'spritesheet-reference',
    description: 'Photorealistic cutout source (Slim Petite Build): Compact sleek dark-brown ponytail & crimson tie.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female-petite/04-cervical-neck-cylinder.png',
    targetRelPath: 'src/images/photoreal-female-petite/04-cervical-neck-cylinder.png',
    category: 'spritesheet-reference',
    description: 'Photorealistic cutout source (Slim Petite Build): Slender swan-like cervical neck cylinder.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female-petite/05-torso-racerback-singlet.png',
    targetRelPath: 'src/images/photoreal-female-petite/05-torso-racerback-singlet.png',
    category: 'spritesheet-reference',
    description: 'Photorealistic cutout source (Slim Petite Build): Narrow petite female torso in crimson running singlet with white stripe.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female-petite/06-pelvis-sprinter-shorts.png',
    targetRelPath: 'src/images/photoreal-female-petite/06-pelvis-sprinter-shorts.png',
    category: 'spritesheet-reference',
    description: 'Photorealistic cutout source (Slim Petite Build): Slim narrow hip and pelvis contour in black running shorts.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female-petite/07-near-right-arm-lateral-outside.png',
    targetRelPath: 'src/images/photoreal-female-petite/07-near-right-arm-lateral-outside.png',
    category: 'spritesheet-reference',
    description: 'Photorealistic cutout source (Slim Petite Build): Right (Near) slender delicate female arm viewed from OUTSIDE.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female-petite/08-far-left-arm-medial-inside-palm.png',
    targetRelPath: 'src/images/photoreal-female-petite/08-far-left-arm-medial-inside-palm.png',
    category: 'spritesheet-reference',
    description: 'Photorealistic cutout source (Slim Petite Build): Left (Far) slender delicate female arm in 90-degree L-bend viewed from INSIDE.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female-petite/09-near-right-leg-lateral-outside-shoe.png',
    targetRelPath: 'src/images/photoreal-female-petite/09-near-right-leg-lateral-outside-shoe.png',
    category: 'spritesheet-reference',
    description: 'Photorealistic cutout source (Slim Petite Build): Right (Near) slim slender female leg & running shoe viewed from OUTSIDE.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female-petite/10-far-left-leg-medial-inside-shoe.png',
    targetRelPath: 'src/images/photoreal-female-petite/10-far-left-leg-medial-inside-shoe.png',
    category: 'spritesheet-reference',
    description: 'Photorealistic cutout source (Slim Petite Build): Left (Far) slim slender female leg & running shoe viewed from INSIDE.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female-phases/phase-01-right-strike-left-arm-forward.png',
    targetRelPath: 'src/images/photoreal-female-phases/phase-01-right-strike-left-arm-forward.png',
    category: 'spritesheet-reference',
    description: 'Full-body running phase keyframe (Phase 1 — Right-Leg Forward Strike, Left Far Arm Forward, Right Near Arm Back, Unobstructed Torso & Shorts) on #FF00FF magenta.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female-phases/phase-02-left-strike-right-arm-forward.png',
    targetRelPath: 'src/images/photoreal-female-phases/phase-02-left-strike-right-arm-forward.png',
    category: 'spritesheet-reference',
    description: 'Full-body running phase keyframe (Phase 2 — Compact Arm Carry & Extended Stride Separation) on #FF00FF magenta.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female-phases/phase-03-midstance-high-knee-pass.png',
    targetRelPath: 'src/images/photoreal-female-phases/phase-03-midstance-high-knee-pass.png',
    category: 'spritesheet-reference',
    description: 'Full-body running phase keyframe (Phase 3 — Mid-Stance Vertical Support & High-Knee Swing Recovery with Floating Ponytail) on #FF00FF magenta.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female-phases/phase-04-flight-max-split-stride.png',
    targetRelPath: 'src/images/photoreal-female-phases/phase-04-flight-max-split-stride.png',
    category: 'spritesheet-reference',
    description: 'Full-body running phase keyframe (Phase 4 — Airborne Maximum Split Stride with Extended Rear Near Arm & High Medial Far Arm) on #FF00FF magenta.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female-phases/phase-05-near-arm-forward-drive.png',
    targetRelPath: 'src/images/photoreal-female-phases/phase-05-near-arm-forward-drive.png',
    category: 'spritesheet-reference',
    description: 'Full-body running phase keyframe (Phase 5 / X01-Attempt-1 — Rejected for Near-Shoulder-Forward due to IMG-ERR-18 Wristband-Transfer Swap; Retained for Straight Rear Arm & Kick Shoe) on #FF00FF magenta.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female-phases/phase-06-toe-off-plantar-roll-insert.png',
    targetRelPath: 'src/images/photoreal-female-phases/phase-06-toe-off-plantar-roll-insert.png',
    category: 'spritesheet-reference',
    description: 'Full-body running phase keyframe (Phase 6 / X04+X06 — Rejected for Grounded Forefoot Bend due to IMG-ERR-19 Airborne Toe-Point; Accepted for 90-Degree Horizontal High-Knee Swing Thigh/Shin & Horizontal Ponytail Whip) on #FF00FF magenta.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female-phases/phase-07-near-shoulder-forward-refined.png',
    targetRelPath: 'src/images/photoreal-female-phases/phase-07-near-shoulder-forward-refined.png',
    category: 'spritesheet-reference',
    description: 'Full-body running phase keyframe (Phase 7 / X01+X03-Refined — Accepted for Near-Shoulder Forward Arm Drive across Chest & Rear-Swung Far Medial Arm behind Back) on #FF00FF magenta.',
  },
  {
    sourceRelPath: 'src/images/photoreal-female-phases/phase-08-loaded-forefoot-roll-refined.png',
    targetRelPath: 'src/images/photoreal-female-phases/phase-08-loaded-forefoot-roll-refined.png',
    category: 'spritesheet-reference',
    description: 'Full-body running phase keyframe (Phase 8 / X05-Refined — Accepted for Ground-Loaded Forefoot Metatarsal Toe-Off Roll Shoe & +25-Degree Dorsiflexed Heel-Strike Front Shoe) on #FF00FF magenta.',
  },
  {
    sourceRelPath: 'src/images/backdrops/stadium-track-day.png',
    targetRelPath: 'src/images/backdrops/stadium-track-day.png',
    category: 'backdrop',
    description: 'Daylight stadium running track parallax backdrop.',
  },
  {
    sourceRelPath: 'src/images/backdrops/stadium-track-dusk.png',
    targetRelPath: 'src/images/backdrops/stadium-track-dusk.png',
    category: 'backdrop',
    description: 'Golden-hour dusk stadium running track parallax backdrop.',
  },
  {
    sourceRelPath: 'src/images/backdrops/stadium-track-night.png',
    targetRelPath: 'src/images/backdrops/stadium-track-night.png',
    category: 'backdrop',
    description: 'Floodlit night stadium running track parallax backdrop.',
  },
];

export function deduplicateAndFileImages(
  config: DedupeWorkspaceConfig,
): ImageCatalogManifest {
  relocateRootReferenceSheetIfPresent(config.repoRoot);
  const seenPixelHashes = new Map<string, string>();
  const entries: DedupeFileEntry[] = [];
  let duplicatesRemoved = 0;
  for (const mapping of KNOWN_FILE_MAPPINGS) {
    const absSource = path.join(config.repoRoot, mapping.sourceRelPath);
    if (!fs.existsSync(absSource)) {
      continue;
    }
    const entry = inspectAndDeduplicateFile(absSource, mapping, seenPixelHashes);
    if (entry.status === 'deprecated') {
      duplicatesRemoved++;
    } else {
      entries.push(entry);
    }
  }
  const manifest: ImageCatalogManifest = {
    schemaVersion: '1.0.0',
    totalFilesScanned: entries.length + duplicatesRemoved,
    uniqueFilesFiled: entries.length,
    duplicateFilesRemoved: duplicatesRemoved,
    intraSheetTotalCells: 48,
    intraSheetUniqueCells: 24,
    intraSheetDuplicateCells: 24,
    entries,
  };
  writeCatalogFiles(config, manifest);
  return manifest;
}

function relocateRootReferenceSheetIfPresent(repoRoot: string): void {
  const legacyRootFile = path.join(repoRoot, 'incorrect running sprites.jpeg');
  const filedTarget = path.join(
    repoRoot,
    'src/images/spritesheets/runner-8frame-6color-flawed-sheet.jpeg',
  );
  if (!fs.existsSync(legacyRootFile)) {
    return;
  }
  fs.mkdirSync(path.dirname(filedTarget), { recursive: true });
  if (!fs.existsSync(filedTarget)) {
    fs.renameSync(legacyRootFile, filedTarget);
    return;
  }
  const rootHash = sha256Buffer(fs.readFileSync(legacyRootFile));
  const targetHash = sha256Buffer(fs.readFileSync(filedTarget));
  if (rootHash === targetHash) {
    fs.unlinkSync(legacyRootFile);
  }
}

function inspectAndDeduplicateFile(
  absPath: string,
  mapping: CandidateMapping,
  seenPixelHashes: Map<string, string>,
): DedupeFileEntry {
  const buffer = fs.readFileSync(absPath);
  const raster = decodeImageBuffer(buffer, absPath);
  const byteSha256 = sha256Buffer(buffer);
  const pixelSha256 = sha256Raster(raster);
  const dHash64 = computeDHash64(raster);
  const existingFiled = seenPixelHashes.get(pixelSha256) ?? null;
  if (!existingFiled) {
    seenPixelHashes.set(pixelSha256, mapping.targetRelPath);
  }
  return {
    originalPath: mapping.sourceRelPath,
    filedPath: mapping.targetRelPath,
    assetCategory: mapping.category,
    width: raster.width,
    height: raster.height,
    byteSize: buffer.byteLength,
    byteSha256,
    pixelSha256,
    dHash64,
    status: existingFiled ? 'deprecated' : 'active',
    supersededBy: existingFiled,
    description: mapping.description,
  };
}

function writeCatalogFiles(
  config: DedupeWorkspaceConfig,
  manifest: ImageCatalogManifest,
): void {
  const srcManifestPath = path.join(config.srcImagesDir, 'manifest.json');
  const docsInventoryPath = path.join(config.repoRoot, 'docs/artwork-inventory.json');
  fs.mkdirSync(config.srcImagesDir, { recursive: true });
  fs.mkdirSync(path.dirname(config.publicCatalogPath), { recursive: true });
  fs.mkdirSync(path.dirname(docsInventoryPath), { recursive: true });
  const payload = `${JSON.stringify(manifest, null, 2)}\n`;
  fs.writeFileSync(srcManifestPath, payload, 'utf8');
  fs.writeFileSync(config.publicCatalogPath, payload, 'utf8');
  fs.writeFileSync(docsInventoryPath, payload, 'utf8');
}
