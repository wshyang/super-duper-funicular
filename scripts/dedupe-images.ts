import path from 'node:path';
import { deduplicateAndFileImages } from '../src/pipeline/dedupe-catalog.js';

function runDedupeCli(): void {
  const repoRoot = process.cwd();
  const manifest = deduplicateAndFileImages({
    repoRoot,
    srcImagesDir: path.join(repoRoot, 'src/images'),
    publicCatalogPath: path.join(repoRoot, 'public/sprites/catalog.json'),
  });
  console.log(
    `[dedupe] Scanned ${manifest.totalFilesScanned} files -> ${manifest.uniqueFilesFiled} unique filed in src/images/ (${manifest.duplicateFilesRemoved} duplicates removed).`,
  );
}

runDedupeCli();
