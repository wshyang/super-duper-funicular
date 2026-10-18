import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { SOURCE_PATH, SOURCE_SHA256 } from '../shared/constants';
import type { SourceAnalysis, SpriteManifest } from '../shared/types';
import { analyseExtraction, renderAnalysisMarkdown } from './analysis';
import { decodeJpeg, encodePng, sha256 } from './image-codec';
import { extractSpriteSheet, finalizePngHashes, type ExtractionResult } from './extractor';

export interface PipelineResult {
  readonly extraction: ExtractionResult;
  readonly analysis: SourceAnalysis;
}

export const runPipeline = (root = process.cwd()): PipelineResult => {
  const sourcePath = resolve(root, SOURCE_PATH);
  const sourceBytes = readFileSync(sourcePath);
  const sourceSha256 = sha256(sourceBytes);
  if (sourceSha256 !== SOURCE_SHA256)
    throw new Error(`Unexpected source image SHA-256: ${sourceSha256}`);
  const image = decodeJpeg(sourceBytes);
  const extraction = finalizePngHashes(extractSpriteSheet(image, sourceBytes));
  const analysis = analyseExtraction(extraction);
  writeGeneratedFiles(root, extraction.manifest, extraction.frames, analysis);
  return { extraction, analysis };
};

const writeGeneratedFiles = (
  root: string,
  manifest: SpriteManifest,
  frames: ExtractionResult['frames'],
  analysis: SourceAnalysis,
): void => {
  const outputRoot = join(root, 'public', 'sprites');
  mkdirSync(outputRoot, { recursive: true });
  for (const { record, image } of frames) {
    const destination = resolve(
      outputRoot,
      'reference',
      record.palette,
      `frame-${String(record.column + 1).padStart(2, '0')}.png`,
    );
    mkdirSync(resolve(destination, '..'), { recursive: true });
    writeFileSync(destination, encodePng(image));
  }
  writeFileSync(join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(join(outputRoot, 'analysis.json'), `${JSON.stringify(analysis, null, 2)}\n`);
  mkdirSync(join(root, 'docs'), { recursive: true });
  writeFileSync(join(root, 'docs', 'SPRITE-FLAW-ANALYSIS.md'), renderAnalysisMarkdown(analysis));
};

export const summarizePipeline = (result: PipelineResult): string => {
  const { grid } = result.extraction;
  const spill = result.analysis.magentaSpillPixels;
  const nearPairs = result.analysis.rows.reduce(
    (sum, row) => sum + row.nearDuplicatePairs.length,
    0,
  );
  return `grid ${grid.columns}×${grid.rows} header=${grid.headerPx}px cell=${grid.cellWidth}×${grid.cellHeight} · frames=${result.analysis.frameCount} near-pairs=${nearPairs} spill=${spill}`;
};
