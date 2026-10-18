import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const personaDir = process.argv[2] ?? 'photoreal-female-masters';
const personaId = process.argv[3] ?? 'photo-sg-chinese-female-masters';
const root = process.cwd();
const outDir = path.join(root, 'docs/evidence/masters-cycle-01');
fs.mkdirSync(outDir, { recursive: true });

function drawLine(png: PNG, x0: number, y0: number, x1: number, y1: number): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / steps);
    const y = Math.round(y0 + ((y1 - y0) * i) / steps);
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const idx = ((y + dy) * png.width + (x + dx)) * 4;
      png.data[idx] = 0;
      png.data[idx + 1] = 255;
      png.data[idx + 2] = 0;
      png.data[idx + 3] = 255;
    }
  }
}

for (const poseId of ['master', 'A1', 'A2', 'A3']) {
  const cal = JSON.parse(fs.readFileSync(path.join(root, 'src/calibration', personaId, `${poseId}.json`), 'utf8'));
  const files: Record<string, string> = {
    master: '01-master-lateral-profile-reference.png',
    A1: '02-atlas-A1-contact-right.png',
    A2: '03-atlas-A2-flight-pass.png',
    A3: '04-atlas-A3-recovery-high.png',
  };
  const png = PNG.sync.read(fs.readFileSync(path.join(root, 'src/images', personaDir, files[poseId])));
  const lm = cal.landmarks as Record<string, number[]>;
  if (lm.neckBase && lm.skullTop && !lm.skullBase) {
    lm.skullBase = [lm.neckBase[0] + 2, lm.neckBase[1] - 24];
    lm.hairPivot = [lm.neckBase[0] - 16, lm.neckBase[1] - 68];
    lm.hairTip = [lm.neckBase[0] - 52, lm.neckBase[1] - 8];
    lm.femoralCut = [lm.hip[0] + (lm.knee[0] - lm.hip[0]) * 0.22, lm.hip[1] + (lm.knee[1] - lm.hip[1]) * 0.22];
  }
  const bones: [string, string][] = [
    ['neckBase', 'skullBase'], ['skullBase', 'skullTop'], ['collar', 'waist'], ['waist', 'femoralCut'],
    ['shoulderNear', 'elbowNear'], ['elbowNear', 'wristNear'], ['wristNear', 'handTipNear'],
    ['shoulderFar', 'elbowFar'], ['elbowFar', 'wristFar'], ['wristFar', 'handTipFar'],
    ['hipNear', 'kneeNear'], ['kneeNear', 'ankleNear'], ['ankleNear', 'ballNear'],
    ['hipFar', 'kneeFar'], ['kneeFar', 'ankleFar'], ['ankleFar', 'ballFar'],
    ['hairPivot', 'hairTip'],
  ];
  for (const [a, b] of bones) {
    if (lm[a] && lm[b]) drawLine(png, lm[a][0], lm[a][1], lm[b][0], lm[b][1]);
  }
  for (const [id, p] of Object.entries(lm)) {
    drawLine(png, p[0] - 6, p[1], p[0] + 6, p[1]);
    drawLine(png, p[0], p[1] - 6, p[0], p[1] + 6);
    void id;
  }
  fs.writeFileSync(path.join(outDir, `calibration-overlay-${poseId}.png`), PNG.sync.write(png));
}
console.log('overlays written');
