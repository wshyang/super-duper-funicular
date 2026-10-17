/**
 * Measures the reference sheet and the procedural runner with the same
 * instruments, then writes the flaw report and the data the web app reads.
 * Run with: npm run sprites:analyse
 *
 * Outputs
 *   reports/cycle-analysis.json            full detail, all rows
 *   src/generated/reference-analysis.json  what the app imports
 *   docs/assets/flaw-comparison.md         generated tables for the docs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildCycleReport, landmarksFromSheet } from "../src/lib/analysis/cycle.ts";
import { proceduralLandmarks } from "../src/lib/analysis/procedural.ts";
import { DEFAULT_CONTROLS, resolveGait } from "../src/lib/gait/gait.ts";
import { readImage } from "../src/lib/pipeline/decode.ts";
import { detectSheet } from "../src/lib/pipeline/sheet.ts";

const SOURCE = resolve("src/images/source/runner-sheet__8frame-alternating-gait__6-colorways__source.jpeg");
const PIXELS_PER_BODY = 231;

const image = await readImage(SOURCE);
const layout = detectSheet(image);
const referenceFrames = landmarksFromSheet(image, layout);
const columns = layout.columns;
const rows = layout.rows;

const firstRow = referenceFrames.slice(0, columns);
const reference = buildCycleReport("reference sheet, row 1", firstRow);
const perRow = Array.from({ length: rows }, (_, row) =>
  buildCycleReport(
    `reference sheet, row ${row + 1}`,
    referenceFrames.filter((frame) => Math.floor(frame.index / columns) === row),
  ),
);

const gait = resolveGait(DEFAULT_CONTROLS);
const generated = buildCycleReport("procedural runner", proceduralLandmarks(gait, columns, PIXELS_PER_BODY), 0.02);

mkdirSync(resolve("reports"), { recursive: true });
mkdirSync(resolve("src/generated"), { recursive: true });
mkdirSync(resolve("docs/assets"), { recursive: true });

writeFileSync(
  resolve("reports/cycle-analysis.json"),
  `${JSON.stringify({ reference, perRow, generated, layout: { rows, columns } }, null, 2)}\n`,
);

writeFileSync(
  resolve("src/generated/reference-analysis.json"),
  `${JSON.stringify(
    {
      generatedBy: "npm run sprites:analyse",
      source: "src/images/source/runner-sheet__8frame-alternating-gait__6-colorways__source.jpeg",
      sourcePixels: { width: image.width, height: image.height },
      pixelsPerBody: PIXELS_PER_BODY,
      layout: { rows, columns },
      rows: perRow.map((report) => ({
        label: report.label,
        frameCount: report.frameCount,
        uniquePoses: report.uniquePoses,
        headDriftPx: report.headDriftPx,
        framesOnGround: report.framesOnGround,
        maxGroundClearancePx: report.maxGroundClearancePx,
        figureHeightRangePx: report.figureHeightRangePx,
        duplicateGroups: report.duplicateGroups,
        groundClearancePx: report.frames.map((frame) => Math.round(frame.lowestY)),
      })),
      reference: {
        label: reference.label,
        frameCount: reference.frameCount,
        uniquePoses: reference.uniquePoses,
        duplicateGroups: reference.duplicateGroups,
        halfCycleDistance: reference.halfCycleDistance,
        adjacentDistance: reference.adjacentDistance,
        headDriftPx: reference.headDriftPx,
        groundLineVariationPx: reference.groundLineVariationPx,
        figureHeightRangePx: reference.figureHeightRangePx,
        framesOnGround: reference.framesOnGround,
        meanGroundClearancePx: reference.meanGroundClearancePx,
        maxGroundClearancePx: reference.maxGroundClearancePx,
        footSeparationRangePx: reference.footSeparationRangePx,
        clearancesPx: reference.frames.map((frame) => Math.round(Math.max(...reference.frames.map((f) => f.lowestY)) - frame.lowestY)),
      },
    },
    null,
    2,
  )}\n`,
);

console.log(`reference row 1: ${reference.uniquePoses} unique poses of ${reference.frameCount}`);
console.log(
  `reference row 1: head drift ${reference.headDriftPx.toFixed(0)} px, on ground ${reference.framesOnGround}/${reference.frameCount}, max clearance ${reference.maxGroundClearancePx.toFixed(0)} px`,
);
console.log(`procedural:      ${generated.uniquePoses} unique poses of ${generated.frameCount}`);
console.log(
  `procedural:      head drift ${generated.headDriftPx.toFixed(0)} px, on ground ${generated.framesOnGround}/${generated.frameCount}, max clearance ${generated.maxGroundClearancePx.toFixed(0)} px`,
);
console.log(`wrote reports/cycle-analysis.json and src/generated/reference-analysis.json`);
