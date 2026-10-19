import fs from 'node:fs';
import path from 'node:path';
import { validateBackground } from '../../../src/pipeline/background-validator.js';

/**
 * Repeatable helper for Section 5 — validate AC-05 per candidate.
 * Usage: npx tsx .claude/skills/pose-variation-harvest/scripts/validate-candidates.ts --dir src/images/photoreal-female-pose-bank/candidates
 * Optionally: --file <single-png> or --master <master-png>
 */
const args = process.argv.slice(2);
const dir = args[args.indexOf('--dir') + 1] ?? 'src/images/photoreal-female-pose-bank/candidates';
const single = args[args.indexOf('--file') + 1];

function listCandidates(d: string): string[] {
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter(f => f.endsWith('.png')).map(f => path.join(d, f));
}

const files = single ? [single] : listCandidates(dir);
if (files.length === 0) { console.error(`No PNGs in ${dir}`); process.exit(1); }

let pass = 0, fail = 0;
for (const f of files) {
  try {
    const r = validateBackground(f);
    const status = r.passesAC05 ? 'PASS' : 'FAIL';
    if (r.passesAC05) pass++; else fail++;
    console.log(`${status} ${path.basename(f)} variance=${r.backgroundVariance} shadow=${r.lowerCenterShadowScore} notes=${r.notes.join('; ')}`);
  } catch (e: any) {
    console.error(`ERROR ${f}: ${e.message}`);
    fail++;
  }
}
console.log(`\n[validate-candidates] ${pass} pass / ${fail} fail of ${files.length} — AC-05 requires variance<8, shadow<2%, corner non-magenta<3%`);
console.log(`Next: npm run harvest-phases -- /tmp/v2-audit  (AC-06 coverage)`);
console.log(`      npm run dump-cycle -- /tmp/gait-cycle-audit 16 photo-sg-chinese-female red  (AC-05/06/07)`);
if (fail > 0) process.exitCode = 1;
