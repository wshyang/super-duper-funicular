import { runPipeline, summarizeExtraction } from '../src/pipeline/run-pipeline.ts';
import { join } from 'node:path';

const mode = (process.argv[2] ?? 'all') as 'all' | 'extract' | 'analyse' | 'dedupe';
if (!['all', 'extract', 'analyse', 'dedupe'].includes(mode)) {
  console.error(`Unknown pipeline mode "${mode}". Use all | extract | analyse | dedupe.`);
  process.exit(1);
}
const root = process.cwd();
const result = runPipeline(root, mode);
if (result.extraction) {
  console.log(`Sprite extraction: ${summarizeExtraction(result.extraction)}`);
}
if (result.dedupe) {
  const duplicates = result.dedupe.files.filter((file) => file.duplicateOf !== null).length;
  console.log(
    `Asset dedupe: ${result.dedupe.files.length} files, ${duplicates} deprecated duplicate(s).`,
  );
}
if (mode === 'all' || mode === 'analyse') {
  console.log(
    `Analysis written to ${join(root, 'public/sprites/analysis.json')} and docs/SPRITE_FLAW_ANALYSIS.md`,
  );
}
