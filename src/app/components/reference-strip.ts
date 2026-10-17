import referenceAnalysis from "../../generated/reference-analysis.json";

export interface ReferenceStrip {
  readonly element: HTMLElement;
}

interface FrameEntry {
  readonly file: string;
  readonly row: number;
  readonly column: number;
  readonly poseSignature: string;
}

interface Manifest {
  readonly colorways: ReadonlyArray<{ readonly row: number; readonly id: string; readonly folder: string }>;
  readonly frames: readonly FrameEntry[];
  readonly registration: { readonly canvas: { readonly width: number; readonly height: number } };
}

/** Loads the extraction manifest written by `npm run sprites:extract`. */
export async function createReferenceStrip(fetchJson: (url: string) => Promise<Manifest>): Promise<ReferenceStrip> {
  const element = document.createElement("section");
  element.className = "panel reference";
  element.dataset.testid = "reference__panel";
  const header = document.createElement("header");
  header.className = "panel__header";
  const title = document.createElement("h2");
  title.textContent = "Reference frames, extracted";
  const subtitle = document.createElement("p");
  subtitle.textContent = "Chromakeyed, cut out, registered on one canvas. Repeats are marked.";
  header.append(title, subtitle);
  element.append(header);

  const body = document.createElement("div");
  body.className = "reference__body";
  element.append(body);

  try {
    const manifest = await fetchJson("/sprites/manifest.json");
    renderStrip(body, manifest);
  } catch (error) {
    const failure = document.createElement("p");
    failure.className = "reference__error";
    failure.textContent = `Run npm run sprites:extract first: ${(error as Error).message}`;
    body.append(failure);
  }
  return { element };
}

function renderStrip(container: HTMLElement, manifest: Manifest): void {
  const row = document.createElement("div");
  row.className = "reference__row";
  const firstRow = manifest.frames.filter((frame) => frame.row === 0);
  const duplicates = new Set(referenceAnalysis.reference.duplicateGroups.flatMap((group) => group.frames));
  firstRow.forEach((frame, index) => {
    const cell = document.createElement("figure");
    cell.className = "reference__cell";
    if (duplicates.has(index)) cell.classList.add("reference__cell--duplicate");
    const image = document.createElement("img");
    image.src = frame.file;
    image.alt = `Reference frame ${index + 1}`;
    image.loading = "lazy";
    const caption = document.createElement("figcaption");
    caption.textContent = `f${index + 1}`;
    const badge = document.createElement("span");
    badge.className = "reference__badge";
    badge.textContent = duplicates.has(index) ? "repeat" : "unique";
    cell.append(image, caption, badge);
    row.append(cell);
  });
  container.append(row);

  const note = document.createElement("p");
  note.className = "reference__note";
  note.textContent =
    `Registered canvas ${manifest.registration.canvas.width}×${manifest.registration.canvas.height}. ` +
    `Pivot: pelvis. Duplicate frames are the finding, not a rendering artifact.`;
  container.append(note);
}
