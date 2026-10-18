import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import type { GaitSettings, MotionId, PaletteId, PersonaId } from '../src/shared/types.ts';
import { CANVAS, DEFAULT_GAIT, PALETTE_BY_ID, PERSONA_BY_ID } from '../src/shared/constants.ts';
import { buildScene } from '../src/runner/scene.ts';
import { solvePose } from '../src/runner/pose.ts';
import { renderSceneToRaster, type RasterImage } from '../src/runner/paint-raster.ts';

const OUTPUT = process.argv[2] ?? '/tmp/funicular-cycle-audit';
const PHASES = Number.parseInt(process.argv[3] ?? '16', 10);
const persona = (process.argv[4] ?? DEFAULT_GAIT.persona) as PersonaId;
const palette = (process.argv[5] ?? DEFAULT_GAIT.palette) as PaletteId;
const motion = (process.argv[6] ?? 'run') as MotionId;

if (!PERSONA_BY_ID[persona]) throw new Error(`Unknown persona "${persona}".`);
if (!PALETTE_BY_ID[palette]) throw new Error(`Unknown palette "${palette}".`);
if (!['run', 'brisk-walk', 'walk'].includes(motion)) throw new Error(`Unknown motion "${motion}".`);

const settings: GaitSettings = { ...DEFAULT_GAIT, persona, palette, motion };
const scale = 2;
const panelWidth = CANVAS.width * scale;
const panelHeight = CANVAS.height * scale;
const footer = 22;
const backgrounds = ['#f4f4f5', '#101318'] as const;

const writePng = (image: RasterImage, path: string): void => {
  const png = new PNG({ width: image.width, height: image.height });
  png.data = Buffer.from(image.data);
  writeFileSync(path, PNG.sync.write(png));
};

const hexToRgb = (color: string): [number, number, number] => {
  const value = color.replace('#', '');
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
};

const blank = (width: number, height: number, color: string): RasterImage => {
  const data = new Uint8ClampedArray(width * height * 4);
  const [r, g, b] = hexToRgb(color);
  for (let index = 0; index < data.length; index += 4) {
    data[index] = r;
    data[index + 1] = g;
    data[index + 2] = b;
    data[index + 3] = 255;
  }
  return { width, height, data };
};

const blit = (target: RasterImage, source: RasterImage, offsetX: number, offsetY: number): void => {
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const targetX = offsetX + x;
      const targetY = offsetY + y;
      if (targetX < 0 || targetY < 0 || targetX >= target.width || targetY >= target.height)
        continue;
      const from = (y * source.width + x) * 4;
      const to = (targetY * target.width + targetX) * 4;
      const alpha = (source.data[from + 3] ?? 0) / 255;
      if (alpha <= 0) continue;
      target.data[to] = (source.data[from] ?? 0) * alpha + (target.data[to] ?? 0) * (1 - alpha);
      target.data[to + 1] =
        (source.data[from + 1] ?? 0) * alpha + (target.data[to + 1] ?? 0) * (1 - alpha);
      target.data[to + 2] =
        (source.data[from + 2] ?? 0) * alpha + (target.data[to + 2] ?? 0) * (1 - alpha);
      target.data[to + 3] = 255;
    }
  }
};

interface PanelTelemetry {
  readonly index: number;
  readonly phase: number;
  readonly deskewDegrees: number;
  readonly flight: boolean;
  readonly doubleSupport: boolean;
  readonly alphaCoverage: number;
  readonly nearSoleY: number;
  readonly farSoleY: number;
  readonly footSeparationPx: number;
}

const soleY = (foot: { heel: { y: number }; ball: { y: number }; toe: { y: number } }): number =>
  Math.max(foot.heel.y, foot.ball.y, foot.toe.y);

const telemetryFor = (index: number): PanelTelemetry => {
  const phase = index / PHASES;
  const frame = solvePose(settings, phase);
  const raster = renderSceneToRaster(buildScene(settings, phase), { scale: 1 });
  let opaque = 0;
  for (let offset = 3; offset < raster.data.length; offset += 4) {
    if ((raster.data[offset] ?? 0) > 16) opaque += 1;
  }
  return {
    index,
    phase: Number(phase.toFixed(4)),
    deskewDegrees: Math.round(phase * 360),
    flight: frame.isFlight,
    doubleSupport: frame.isDoubleSupport,
    alphaCoverage: Number((opaque / (raster.width * raster.height)).toFixed(4)),
    nearSoleY: Number(soleY(frame.pose.nearLeg.foot).toFixed(2)),
    farSoleY: Number(soleY(frame.pose.farLeg.foot).toFixed(2)),
    footSeparationPx: Number(
      Math.abs(frame.pose.nearLeg.foot.ankle.x - frame.pose.farLeg.foot.ankle.x).toFixed(2),
    ),
  };
};

mkdirSync(join(OUTPUT, 'frames'), { recursive: true });
const telemetry: PanelTelemetry[] = [];
const contactHeight = backgrounds.length * (panelHeight + footer);
const contact = blank(PHASES * panelWidth, contactHeight, '#0b0e13');

for (let index = 0; index < PHASES; index += 1) {
  const phase = index / PHASES;
  const scene = buildScene(settings, phase);
  backgrounds.forEach((background, row) => {
    const raster = renderSceneToRaster(scene, { scale, background });
    const plate = blank(panelWidth, panelHeight + footer, '#0b0e13');
    blit(plate, raster, 0, 0);
    const name = `audit-frame-${String(index).padStart(2, '0')}-deg-${String(Math.round(phase * 360)).padStart(3, '0')}.png`;
    writePng(plate, join(OUTPUT, 'frames', name));
    blit(contact, plate, index * panelWidth, row * (panelHeight + footer));
  });
  telemetry.push(telemetryFor(index));
}

writePng(contact, join(OUTPUT, 'contact-sheet.png'));
writeFileSync(
  join(OUTPUT, 'audit-report.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), settings, phases: PHASES, scale, telemetry }, null, 2)}\n`,
);
console.log(`Audit written to ${OUTPUT}`);
console.log(
  `  ${PHASES} phases × ${backgrounds.length} backgrounds at ${panelWidth}x${panelHeight}`,
);
const flight = telemetry.filter((panel) => panel.flight).length;
const double = telemetry.filter((panel) => panel.doubleSupport).length;
const minCoverage = Math.min(...telemetry.map((panel) => panel.alphaCoverage));
console.log(
  `  flight panels=${flight} double-support panels=${double} min coverage=${minCoverage}`,
);
console.log('  Panel presence is not seamlessness: open contact-sheet.png and inspect it.');
