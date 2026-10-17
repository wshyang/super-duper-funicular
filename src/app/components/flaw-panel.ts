import { buildCycleReport, type CycleReport } from "../../lib/analysis/cycle.ts";
import { proceduralLandmarks } from "../../lib/analysis/procedural.ts";
import { resolveGait } from "../../lib/gait/gait.ts";
import referenceAnalysis from "../../generated/reference-analysis.json";
import type { AppSettings } from "../state/settings.ts";

export interface FlawPanel {
  readonly element: HTMLElement;
  update(settings: AppSettings): void;
}

interface Finding {
  readonly title: string;
  readonly body: string;
  readonly reference: string;
  readonly generated: (report: CycleReport) => string;
}

const PIXELS_PER_BODY = 231;

const FINDINGS: readonly Finding[] = [
  {
    title: "Four poses, not eight",
    body:
      "Frames 1–4 repeat exactly as frames 5–8, so the same leg leads twice. The loop stutters instead of alternating.",
    reference: `${referenceAnalysis.reference.uniquePoses} unique poses of ${referenceAnalysis.reference.frameCount}`,
    generated: (report) => `${report.uniquePoses} unique poses of ${report.frameCount}`,
  },
  {
    title: "Almost never on the ground",
    body:
      "Only two of the eight frames put a foot on the ground line. The rest float 16–20 px above it, so no frame carries weight.",
    reference: `${referenceAnalysis.reference.framesOnGround} of ${referenceAnalysis.reference.frameCount} frames touch the ground`,
    generated: (report) => `${report.framesOnGround} of ${report.frameCount} frames touch the ground`,
  },
  {
    title: "The figure drifts across the cell",
    body:
      "The head moves about 51 px sideways across the cycle because each frame was drawn in its own composition. Played in place, the character slides.",
    reference: `${referenceAnalysis.reference.headDriftPx.toFixed(0)} px head drift`,
    generated: (report) => `${report.headDriftPx.toFixed(0)} px head drift`,
  },
  {
    title: "The figure changes size",
    body:
      "Frame height ranges over 20 px, so the character grows and shrinks as it runs instead of holding its proportions.",
    reference: `${referenceAnalysis.reference.figureHeightRangePx.toFixed(0)} px height range`,
    generated: (report) => `${report.figureHeightRangePx.toFixed(0)} px (pelvis bob only)`,
  },
  {
    title: "No depth between the legs",
    body:
      "Both legs use the same values, so which leg is in front is ambiguous. The eye flips between readings on every loop.",
    reference: "Near and far limbs share one palette",
    generated: () => "Far limb shaded to 84% value",
  },
];

export function createFlawPanel(initial: AppSettings): FlawPanel {
  const element = document.createElement("section");
  element.className = "panel flaws";
  element.dataset.testid = "flaws__panel";
  const header = document.createElement("header");
  header.className = "panel__header";
  const title = document.createElement("h2");
  title.textContent = "What is wrong with the reference cycle";
  const subtitle = document.createElement("p");
  subtitle.textContent = `Measured from the artwork itself: ${referenceAnalysis.layout.rows} colourways × ${referenceAnalysis.layout.columns} frames.`;
  header.append(title, subtitle);
  element.append(header);

  const list = document.createElement("ol");
  list.className = "findings";
  const generatedCells: Array<(report: CycleReport) => string> = [];
  const generatedOutputs: HTMLElement[] = [];
  for (const finding of FINDINGS) {
    const item = document.createElement("li");
    item.className = "finding";
    const headingRow = document.createElement("div");
    headingRow.className = "finding__head";
    const heading = document.createElement("h3");
    heading.textContent = finding.title;
    headingRow.append(heading);
    const text = document.createElement("p");
    text.textContent = finding.body;
    const compare = document.createElement("div");
    compare.className = "finding__compare";
    const referenceCell = document.createElement("span");
    referenceCell.className = "tag tag--bad";
    referenceCell.textContent = finding.reference;
    const generatedCell = document.createElement("span");
    generatedCell.className = "tag tag--good";
    generatedOutputs.push(generatedCell);
    generatedCells.push(finding.generated);
    compare.append(referenceCell, generatedCell);
    item.append(headingRow, text, compare);
    list.append(item);
  }
  element.append(list);

  const legend = document.createElement("p");
  legend.className = "flaws__legend";
  legend.textContent = "Red: reference sheet. Green: this generator, live with the controls on this page.";
  element.append(legend);

  const update = (settings: AppSettings) => {
    const report = buildCycleReport(
      "generated",
      proceduralLandmarks(resolveGait(settings.gait), 8, PIXELS_PER_BODY),
      0.02,
    );
    generatedCells.forEach((read, index) => {
      const output = generatedOutputs[index];
      if (output !== undefined) output.textContent = read(report);
    });
  };
  update(initial);
  return { element, update };
}
