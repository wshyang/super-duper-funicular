import { join } from 'node:path';
import { buildVectors } from '../src/pipeline/vector-pipeline.ts';

const root = process.cwd();
const started = Date.now();
const manifest = buildVectors(root);
const bytes = manifest.frames.reduce((sum, frame) => sum + frame.bytes, 0);
console.log(
  [
    `vectors=${String(manifest.frames.length)}`,
    `meanMaskIou=${manifest.meanMaskIou.toFixed(3)}`,
    `meanColourAgreement=${manifest.meanColourAgreement.toFixed(3)}`,
    `svgKiB=${(bytes / 1024).toFixed(0)}`,
    `ms=${String(Date.now() - started)}`,
  ].join(' '),
);
console.log(`Manifest: ${join(root, 'public/vectors/manifest.json')}`);
