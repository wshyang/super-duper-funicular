import { mkdirSync, writeFileSync } from 'node:fs';
import { MOTION_IDS, MOTION_PROFILES, PERSONA_IDS, PERSONAS } from '../src/lib/rig/body.ts';
import { AUDIT_PHASES, auditPanels } from '../src/app/model/exporters.ts';
import { createRaster } from '../src/lib/render/raster.ts';
import { paintCell } from '../src/lib/render/paint-raster.ts';
import { encodePng } from '../src/lib/pipeline/image-io.ts';

const CELL = 160;
const COLS = 3;

/**
 * 16-phase audit sheets (ADD-010): per phase a light, dark and joint-overlay
 * panel, rendered by the same solver + painter as the app. Panel labels live
 * in the sidecar JSON (the pure-TS raster has no font renderer); the browser
 * export draws text labels.
 */
function main(): void {
  mkdirSync('public/renders', { recursive: true });
  const labels: Record<string, string[]> = {};
  for (const personaId of PERSONA_IDS) {
    for (const motion of MOTION_IDS) {
      const panels = auditPanels(MOTION_PROFILES[motion], PERSONAS[personaId], CELL);
      const rows = AUDIT_PHASES;
      const raster = createRaster(COLS * CELL, rows * CELL);
      panels.forEach((panel, i) => {
        const x = (i % COLS) * CELL;
        const y = Math.floor(i / COLS) * CELL;
        paintCell(raster, panel.ops, panel.background, panel.transform, CELL, CELL, x, y);
      });
      const name = `audit-${personaId}-${motion}`;
      writeFileSync(`public/renders/${name}.png`, encodePng(raster));
      labels[name] = panels.map((p) => p.label);
      console.log(`public/renders/${name}.png (${COLS * CELL}×${rows * CELL})`);
    }
  }
  writeFileSync('public/renders/audit-labels.json', `${JSON.stringify(labels, null, 2)}\n`);
}

main();
