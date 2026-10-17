import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { encodePng } from "../src/pipeline/image-io.ts";
import { scaleNearest, tileRasters } from "../src/pipeline/raster.ts";
import { findVariant } from "../src/runner/palette.ts";
import { defaultRequest, renderRunnerFrame, renderRunnerWithSkeleton } from "../src/runner/render-frame.ts";

/**
 * Renders one full cycle of the procedural runner (8 phases) as a contact sheet.
 * Row 1: figure only. Row 2: figure with the skeleton overlay. Output: docs/runner-preview.png.
 */
const FRAME_COUNT = 8;
const SCALE = 3;
const BACKGROUND: readonly [number, number, number] = [0x2a, 0x2a, 0x2e];
const OUTPUT = resolve(import.meta.dirname, "../docs/runner-preview.png");

async function main(): Promise<void> {
  const variant = findVariant(process.argv[2] ?? "red");
  const phases = Array.from({ length: FRAME_COUNT }, (_, index) => index / FRAME_COUNT);
  const bodies = phases.map((phase) => renderRunnerFrame(defaultRequest(phase, variant)));
  const rigs = phases.map((phase) => renderRunnerWithSkeleton(defaultRequest(phase, variant)));
  const sheet = tileRasters([...bodies, ...rigs].map((tile) => scaleNearest(tile, SCALE)), FRAME_COUNT, BACKGROUND);
  await mkdir(resolve(OUTPUT, ".."), { recursive: true });
  await writeFile(OUTPUT, encodePng(sheet));
  console.log(`Wrote ${OUTPUT} (${sheet.width}x${sheet.height}) for variant ${variant.id}.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
