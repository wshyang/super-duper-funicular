/** Three diagnostic backgrounds at every sixteenth; never samples phase 1 twice. */
const WIDTH = 240;
const HEIGHT = 360;
export const AUDIT_WIDTH = WIDTH * 3 * 4;
export const AUDIT_HEIGHT = HEIGHT * 4;
export type AuditPanel = "light" | "dark" | "joints";
export interface AuditCell {
  readonly phase: number;
  readonly panel: AuditPanel;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
export function auditCells(): AuditCell[] {
  const panels: AuditPanel[] = ["light", "dark", "joints"];
  return Array.from({ length: 16 }, (_, index) =>
    panels.map((panel, column) => ({
      phase: index / 16, panel,
      x: ((index % 4) * 3 + column) * WIDTH,
      y: Math.floor(index / 4) * HEIGHT,
      width: WIDTH, height: HEIGHT,
    })),
  ).flat();
}
