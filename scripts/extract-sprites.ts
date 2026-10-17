import { RUNNER_SHEET_SPEC } from "../src/pipeline/runner-sheet-spec.ts";
import { extractSheet } from "../src/pipeline/extract-sheet.ts";

async function main(): Promise<void> {
  const manifest = await extractSheet(RUNNER_SHEET_SPEC);
  const variants = manifest.variants.map((variant) => variant.id).join(", ");
  console.log(`Extracted ${manifest.frames.length} frames (${variants}) at ${manifest.canvas.width}x${manifest.canvas.height}.`);
  console.log(`Output: ${RUNNER_SHEET_SPEC.outputDirectory}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
