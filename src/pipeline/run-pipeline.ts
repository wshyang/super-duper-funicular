import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { analyseExtraction, renderAnalysisMarkdown } from './analysis.ts';
import { dedupeImages, type ImageManifest } from './dedupe.ts';
import { decodeSource, extractFrames, writeExtraction, type ExtractionSet } from './extractor.ts';

export const SOURCE_RELATIVE = 'src/images/source/runner-8frame-6-colorways-source.jpeg';
export const PUBLIC_SPRITES = 'public/sprites';

export interface PipelineResult {
  readonly extraction: ExtractionSet | null;
  readonly dedupe: ImageManifest | null;
}

export const runExtraction = (root: string): ExtractionSet => {
  const sourcePath = join(root, SOURCE_RELATIVE);
  const source = decodeSource(sourcePath);
  const set = extractFrames(source, sourcePath);
  writeExtraction(set, { publicDir: join(root, PUBLIC_SPRITES), sourceLabel: SOURCE_RELATIVE });
  return set;
};

export const runAnalysis = (root: string, set: ExtractionSet): void => {
  const analysis = analyseExtraction(set);
  mkdirSync(join(root, PUBLIC_SPRITES), { recursive: true });
  mkdirSync(join(root, 'docs'), { recursive: true });
  writeFileSync(
    join(root, PUBLIC_SPRITES, 'analysis.json'),
    `${JSON.stringify(analysis, null, 2)}\n`,
  );
  writeFileSync(
    join(root, 'docs', 'SPRITE_FLAW_ANALYSIS.md'),
    renderAnalysisMarkdown(analysis, SOURCE_RELATIVE),
  );
};

export const runPipeline = (
  root: string,
  mode: 'all' | 'extract' | 'analyse' | 'dedupe' = 'all',
): PipelineResult => {
  mkdirSync(join(root, PUBLIC_SPRITES), { recursive: true });
  const dedupe = mode === 'all' || mode === 'dedupe' ? dedupeImages(root) : null;
  if (mode === 'dedupe') return { extraction: null, dedupe };
  const extraction = runExtraction(root);
  if (mode === 'all' || mode === 'analyse') runAnalysis(root, extraction);
  return { extraction, dedupe };
};

export const summarizeExtraction = (set: ExtractionSet): string => {
  const spill = set.frames.reduce((sum, frame) => sum + frame.magentaSpill, 0);
  const duplicates = set.frames.filter((frame) => frame.duplicateOf !== null).length;
  const grid = set.grid;
  return [
    `grid ${grid.columns}x${grid.rows} header=${grid.headerPx}px cell=${grid.cellWidth}x${grid.cellHeight}`,
    `frames=${set.frames.length} duplicates=${duplicates} magentaSpill=${spill}`,
    `canvas=${grid.cellWidth}x${grid.cellHeight}`,
  ].join(' · ');
};
