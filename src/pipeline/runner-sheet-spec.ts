import { resolve } from "node:path";
import type { SheetSpec } from "./extract-sheet.ts";

const REPOSITORY_ROOT = resolve(import.meta.dirname, "../..");

/**
 * The reference running sheet: 8 columns (animation frames 1 to 8) by 6 rows (colour
 * variants). Row order is the order of the artwork, top to bottom.
 */
export const RUNNER_SHEET_SPEC: SheetSpec = {
  id: "running-cycle-8frame",
  sourcePath: resolve(REPOSITORY_ROOT, "src/images/reference/running-cycle-8frame-6variants.jpeg"),
  outputDirectory: resolve(REPOSITORY_ROOT, "public/sprites/running-cycle-8frame"),
  publicPathPrefix: "/sprites/running-cycle-8frame",
  columns: 8,
  rows: 6,
  rowVariants: [
    { id: "red", label: "Red" },
    { id: "blue", label: "Blue" },
    { id: "green", label: "Green" },
    { id: "yellow", label: "Yellow" },
    { id: "purple", label: "Purple" },
    { id: "orange", label: "Orange" },
  ],
};
