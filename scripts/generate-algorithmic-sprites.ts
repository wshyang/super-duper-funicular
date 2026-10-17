import path from 'node:path';
import { generateAlgorithmicSpritesAndSheet } from '../src/pipeline/algorithmic-sheet-builder.js';
import { generateAllBackdrops } from '../src/pipeline/backdrop-generator.js';
import { deduplicateAndFileImages } from '../src/pipeline/dedupe-catalog.js';

function runGenerateAlgorithmicCli(): void {
  const repoRoot = process.cwd();
  const srcImagesDir = path.join(repoRoot, 'src/images');
  const publicAlgorithmicDir = path.join(repoRoot, 'public/sprites/algorithmic');
  const publicBackdropsDir = path.join(repoRoot, 'public/sprites/backdrops');
  const backdrops = generateAllBackdrops(srcImagesDir, publicBackdropsDir);
  const manifest = generateAlgorithmicSpritesAndSheet({
    srcImagesDir,
    publicAlgorithmicDir,
    publicUrlPrefix: '/sprites/algorithmic',
  });
  const catalog = deduplicateAndFileImages({
    repoRoot,
    srcImagesDir,
    publicCatalogPath: path.join(repoRoot, 'public/sprites/catalog.json'),
  });
  console.log(
    `[generate-sheets] Generated ${manifest.variants.length * manifest.frameCount} algorithmic frames, ${manifest.bodyParts.length} articulated body parts, and ${backdrops.length} backdrops (${catalog.uniqueFilesFiled} unique assets cataloged in src/images/).`,
  );
}

runGenerateAlgorithmicCli();
