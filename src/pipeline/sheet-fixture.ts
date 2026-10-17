import { resolve } from "node:path";

/** Repository-relative path of the reference running sheet (the only source artwork). */
export const RUNNER_SHEET_PATH = resolve(
  import.meta.dirname,
  "../images/reference/running-cycle-8frame-6variants.jpeg",
);
