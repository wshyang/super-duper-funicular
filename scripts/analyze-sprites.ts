import fs from 'node:fs';
import path from 'node:path';
import {
  analyzeExtractedSpriteFlaws,
  formatFlawAnalysisMarkdown,
} from '../src/pipeline/flaw-analyzer.js';
import { extractSpritesFromSheet } from '../src/pipeline/sprite-extractor.js';

function runAnalyzeCli(): void {
  const repoRoot = process.cwd();
  const sourceSheetPath = path.join(
    repoRoot,
    'src/images/spritesheets/runner-8frame-6color-flawed-sheet.jpeg',
  );
  const outputPublicDir = path.join(repoRoot, 'public/sprites/extracted');
  const extraction = extractSpritesFromSheet({
    sourceSheetPath,
    outputPublicDir,
    publicUrlPrefix: '/sprites/extracted',
  });
  const report = analyzeExtractedSpriteFlaws(extraction);
  const analysisJsonPath = path.join(outputPublicDir, 'analysis.json');
  fs.writeFileSync(analysisJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  const docsDir = path.join(repoRoot, 'docs');
  fs.mkdirSync(docsDir, { recursive: true });
  const markdownPath = path.join(docsDir, 'SPRITE_ANIMATION_FLAW_ANALYSIS.md');
  fs.writeFileSync(markdownPath, formatFlawAnalysisMarkdown(report), 'utf8');
  console.log(
    `[analyze] Wrote flaw analysis to public/sprites/extracted/analysis.json & docs/SPRITE_ANIMATION_FLAW_ANALYSIS.md (mean half-cycle IoU: ${(report.meanHalfCycleIoU * 100).toFixed(1)}%, unique poses/row: ${report.actualUniquePoseCountPerRow}/8).`,
  );
}

runAnalyzeCli();
