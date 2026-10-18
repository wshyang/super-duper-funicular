import { mkdirSync, writeFileSync } from 'node:fs';
import { PERSONA_IDS, PERSONAS, MOTION_PROFILES } from '../src/lib/rig/body.ts';
import { filmstripPanels } from '../src/app/model/exporters.ts';
import { createRaster, clear, parseHex } from '../src/lib/render/raster.ts';
import { paintCell } from '../src/lib/render/paint-raster.ts';
import { encodePng } from '../src/lib/pipeline/image-io.ts';

const CELL = 140;

function main(): void {
  mkdirSync('public/renders', { recursive: true });
  for (const personaId of PERSONA_IDS) {
    const panels = filmstripPanels(MOTION_PROFILES.run, PERSONAS[personaId], CELL);
    const raster = createRaster(CELL * 8, CELL);
    clear(raster, parseHex('#f5f5f5'));
    panels.forEach((panel, i) => {
      paintCell(raster, panel.ops, 'light', panel.transform, CELL, CELL, i * CELL, 0);
    });
    writeFileSync(`public/renders/filmstrip-${personaId}-run.png`, encodePng(raster));
    console.log(`public/renders/filmstrip-${personaId}-run.png (${CELL * 8}×${CELL})`);
  }
}

main();
