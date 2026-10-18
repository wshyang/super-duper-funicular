import { mkdirSync, writeFileSync } from 'node:fs';
import { MOTION_PROFILES, PERSONAS } from '../src/lib/rig/body.ts';
import { solvePose } from '../src/lib/gait/pose.ts';
import { stitchSvgFrame } from '../src/lib/vector/stitch.ts';

const WIDTH = 200;
const HEIGHT = 200;
const GROUND_Y = 170;

function main(): void {
  mkdirSync('public/renders/svg', { recursive: true });
  for (let i = 0; i < 8; i += 1) {
    const pose = solvePose(i / 8, MOTION_PROFILES.run);
    const svg = stitchSvgFrame(pose, PERSONAS['wei-ming'], WIDTH, HEIGHT, GROUND_Y);
    writeFileSync(`public/renders/svg/frame-${String(i + 1).padStart(2, '0')}.svg`, `${svg}\n`);
  }
  console.log('public/renders/svg/frame-01..08.svg (17 matrix-stitched parts each)');
}

main();
