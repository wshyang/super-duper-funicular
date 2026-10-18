import reportJson from './compose-report.json';

export interface GroundAdherenceEntry {
  readonly frameIndex: number;
  readonly phase: number;
  readonly soleY: number;
  readonly groundDeltaPx: number;
  readonly liftPx: number;
  readonly baseKeyPhase: number;
  readonly blendKeyPhase: number | null;
  readonly blendWeight: number;
}

export interface ComposeReport {
  readonly personaId: string;
  readonly canvas: { readonly widthPx: number; readonly heightPx: number; readonly groundY: number };
  readonly groundAdherence: readonly GroundAdherenceEntry[];
  readonly composedAtUtc: string;
}

export const COMPOSE_REPORT = reportJson as ComposeReport;

const PLATE_URLS = import.meta.glob<string>('/src/images/p2/sg-chinese-female/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

function plateUrl(fileName: string): string {
  const entry = PLATE_URLS[`/src/images/p2/sg-chinese-female/${fileName}`];
  if (entry === undefined) throw new Error(`Missing plate asset: ${fileName}`);
  return entry;
}

export interface FrameManifestEntry {
  readonly index: number;
  readonly phase: number;
  readonly src: string;
  readonly groundDeltaPx: number;
  readonly liftPx: number;
  readonly baseKeyPhase: number;
  readonly blendKeyPhase: number | null;
  readonly blendWeight: number;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export const SEQUENCE_FRAMES: FrameManifestEntry[] = COMPOSE_REPORT.groundAdherence.map((entry) => ({
  index: entry.frameIndex,
  phase: entry.phase,
  src: `/sprites/p2/sg-chinese-female/frames/frame-${pad2(entry.frameIndex)}.png`,
  groundDeltaPx: entry.groundDeltaPx,
  liftPx: entry.liftPx,
  baseKeyPhase: entry.baseKeyPhase,
  blendKeyPhase: entry.blendKeyPhase,
  blendWeight: entry.blendWeight,
}));

export interface KeyframeManifestEntry {
  readonly phase: number;
  readonly src: string;
  readonly label: string;
}

export const KEYFRAMES: KeyframeManifestEntry[] = (
  [
    ['key-01-phi-000.png', 0],
    ['key-02-phi-125.png', 0.125],
    ['key-03-phi-250.png', 0.25],
    ['key-04-phi-375.png', 0.375],
    ['key-05-phi-500.png', 0.5],
    ['key-06-phi-625.png', 0.625],
    ['key-07-phi-750.png', 0.75],
    ['key-08-phi-875.png', 0.875],
  ] as const
).map(([fileName, phase]) => ({
  phase,
  src: plateUrl(fileName),
  label: `φ ${phase.toFixed(3)}`,
}));

export const MASTER_PLATE_URL = plateUrl('00-master.png');
export const APNG_URL = '/sprites/p2/sg-chinese-female/runner-16phase.apng';
export const CONTACT_SHEET_URL = '/sprites/p2/sg-chinese-female/contact-sheet-16frame-1x.png';
export const SPRITESHEET_URL = '/sprites/p2/sg-chinese-female/spritesheet-8frame.png';
