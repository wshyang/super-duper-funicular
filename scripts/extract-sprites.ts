import path from 'node:path';
import { deduplicateAndFileImages } from '../src/pipeline/dedupe-catalog.js';
import { extractSpritesFromSheet } from '../src/pipeline/sprite-extractor.js';

function runExtractCli(): void {
  const repoRoot = process.cwd();
  deduplicateAndFileImages({
    repoRoot,
    srcImagesDir: path.join(repoRoot, 'src/images'),
    publicCatalogPath: path.join(repoRoot, 'public/sprites/catalog.json'),
  });
  const sourceSheetPath = path.join(
    repoRoot,
    'src/images/spritesheets/runner-8frame-6color-flawed-sheet.jpeg',
  );
  const outputPublicDir = path.join(repoRoot, 'public/sprites/extracted');
  const result = extractSpritesFromSheet({
    sourceSheetPath,
    outputPublicDir,
    publicUrlPrefix: '/sprites/extracted',
  });
  console.log(
    `[extract] Cut out ${result.manifest.totalExtractedFrames} sprites (${result.manifest.rows} rows x ${result.manifest.cols} cols) -> ${result.manifest.totalUniquePoses} unique poses (${result.manifest.uniquePosesPerRow} per row) into public/sprites/extracted/`,
  );
}

runExtractCli();
