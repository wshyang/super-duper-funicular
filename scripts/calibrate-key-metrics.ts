import fs from 'node:fs';
import path from 'node:path';
import { readImageFile } from '../src/pipeline/image-io.js';
import {
  evaluateKeyGate,
  findLowestFigureEdge,
  measureBackgroundUniformity,
  measureFloorShadow,
  measureSoleEdgeContrast,
} from '../src/pipeline/pose-key-metrics.js';

// Expected frame type per candidate (contact vs flight), from the harvest log.
const FRAME_TYPE: Record<string, 'flight' | 'contact'> = {
  'H01-right-contact-refined.png': 'contact',
  'H01-right-contact.png': 'contact',
  'H02-right-down.png': 'contact',
  'H03-right-pass-refined.png': 'contact',
  'H03-right-pass.png': 'contact',
  'H04-right-flight.png': 'flight',
  'H05-left-contact.png': 'contact',
  'H06-left-down.png': 'contact',
  'H07-left-pass.png': 'contact',
  'H08-left-flight.png': 'flight',
  'X01-near-arm-forward.png': 'contact',
  'X02-near-arm-rear-color-refinement.png': 'contact',
  'X02-near-arm-rear.png': 'contact',
  'X04-leg-scissor.png': 'flight',
  'X04-opposed-leg-custom-guide.png': 'flight',
  'X04-tucked-flight-refinement.png': 'flight',
  'X05-far-forearm-forward-up.png': 'contact',
  'X06-far-forearm-back-down.png': 'contact',
};

const dir = process.argv[2] ?? 'src/images/photoreal-female-pose-bank/candidates';
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
for (const file of files) {
  const rel = path.join(dir, file);
  const raster = readImageFile(rel);
  const uni = measureBackgroundUniformity(raster);
  const sh = measureFloorShadow(raster, 0.15, 28);
  const frameType = FRAME_TYPE[file] ?? 'contact';
  let sole = '';
  let soleEdge;
  if (frameType === 'contact') {
    const edge = findLowestFigureEdge(raster);
    if (edge) {
      soleEdge = measureSoleEdgeContrast(raster, edge.soleX, 45, edge.soleBottomY - 60, edge.soleBottomY + 4);
      sole = ` soleX=${edge.soleX} soleY=${edge.soleBottomY} edge=${soleEdge.contrast}@${soleEdge.edgeY}`;
    } else {
      sole = ' soleX=? (no figure edge found)';
    }
  }
  const gate = evaluateKeyGate(uni, sh, frameType, soleEdge);
  const box = sh.boundingBox
    ? `${sh.boundingBox.maxX - sh.boundingBox.minX + 1}x${sh.boundingBox.maxY - sh.boundingBox.minY + 1}`
    : '-';
  console.log(
    `${gate.pass ? 'PASS' : 'FAIL'} ${file} | bgStd=${uni.stdDev} shadow=${sh.pixelCount}(${box}) ` +
      `dip=${sh.maxDip} contact=${sh.contactPixelCount}${sole}` +
      (gate.pass ? '' : ` | ${gate.failures.join('; ')}`),
  );
}
