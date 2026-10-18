import { enclosedHoles, labelOpaqueComponents } from './connected-components.ts';
import {
  computeOpaqueBounds,
  getPixel,
  isMagentaSpill,
  isWhiteFabric,
  luminance,
  type RgbaImage,
} from './rgba-image.ts';

export type PartContractId =
  | 'PC-01' | 'PC-02' | 'PC-03' | 'PC-04' | 'PC-05' | 'PC-06'
  | 'PC-07' | 'PC-08' | 'PC-09' | 'PC-10' | 'PC-11' | 'PC-12';

export interface PartContractCheck {
  readonly pcId: PartContractId;
  readonly applicable: boolean;
  readonly passed: boolean;
  readonly measured: string;
  readonly threshold: string;
  readonly note: string;
}

export interface ContractContext {
  readonly stage: 'plate' | 'cutout';
  readonly partId: string;
  readonly expectedComponents?: number;
  readonly minComponentPx?: number;
  readonly marginPx?: number;
  readonly marginFraction?: number;
  readonly luminanceBand?: readonly [number, number];
  readonly expectedLowestRow?: number;
  readonly lowestRowTolerance?: number;
  readonly stripeOwner?: string;
  readonly stripePresence?: Readonly<Record<string, number>>;
  readonly orientationProbe?: { readonly frontCount: number; readonly backCount: number };
  readonly occluderCount?: number;
  readonly occluderCanvas?: RgbaImage;
  readonly widthParityPartner?: RgbaImage;
  readonly planRatioCheck?: { readonly measured: number; readonly min: number; readonly max: number };
}

export function checkSingleSubject(image: RgbaImage, ctx: ContractContext): PartContractCheck {
  const minPx = ctx.minComponentPx ?? 500;
  const summary = labelOpaqueComponents(image);
  const big = summary.sizes.filter((size) => size >= minPx);
  const occluded = (ctx.occluderCount ?? 0) > 0;
  const passed = ctx.stage === 'plate'
    ? big.length === (ctx.expectedComponents ?? 1)
    : big.length >= 1 && big.length <= (occluded ? 2 : 1);
  return {
    pcId: 'PC-01',
    applicable: true,
    passed,
    measured: `components>=${minPx}px: ${big.length} (sizes ${summary.sizes.slice(0, 3).join(',')})`,
    threshold: ctx.stage === 'plate' ? `exactly ${ctx.expectedComponents ?? 1}` : occluded ? '<=2 (occluder split allowed)' : 'exactly 1',
    note: 'single subject (plate) / deterministic occluder split only (cutout, ADD-007)',
  };
}

export function checkBackdropPurity(image: RgbaImage, ctx: ContractContext): PartContractCheck {
  let spill = 0;
  let outsideAlpha = 0;
  const bounds = computeOpaqueBounds(image);
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const pixel = getPixel(image, x, y);
      if (isMagentaSpill(pixel)) spill += 1;
      const outside = bounds !== null && (x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY);
      if (outside && pixel.a !== 0) outsideAlpha += 1;
    }
  }
  const passed = ctx.stage === 'plate' ? spill === 0 : spill === 0 && outsideAlpha === 0;
  return {
    pcId: 'PC-02',
    applicable: true,
    passed,
    measured: `spill=${spill}, nonZeroAlphaOutsideBBox=${outsideAlpha}`,
    threshold: 'spill=0; cutout alpha=0 outside bbox',
    note: 'backdrop purity / no chroma spill',
  };
}

export function checkOrientation(ctx: ContractContext): PartContractCheck {
  const probe = ctx.orientationProbe;
  const applicable = probe !== undefined;
  return {
    pcId: 'PC-03',
    applicable,
    passed: applicable && probe.frontCount > probe.backCount,
    measured: probe === undefined ? 'n/a' : `front=${probe.frontCount} back=${probe.backCount}`,
    threshold: 'front > back',
    note: 'anterior mass on +x per record probe',
  };
}

export function checkFramingMargin(image: RgbaImage, ctx: ContractContext): PartContractCheck {
  const bounds = computeOpaqueBounds(image);
  if (bounds === null) {
    return { pcId: 'PC-04', applicable: true, passed: false, measured: 'empty image', threshold: 'inset margin', note: 'framing margin' };
  }
  const inset = Math.min(bounds.minX, bounds.minY, image.width - 1 - bounds.maxX, image.height - 1 - bounds.maxY);
  const fraction = ctx.marginFraction ?? 0.04;
  const required = ctx.stage === 'plate' ? Math.ceil(Math.min(image.width, image.height) * fraction) : (ctx.marginPx ?? 2);
  return {
    pcId: 'PC-04',
    applicable: true,
    passed: inset >= required,
    measured: `inset=${inset}px`,
    threshold: `>=${required}px (${ctx.stage === 'plate' ? `${fraction * 100}% plate` : 'cutout'})`,
    note: 'framing margin, no contour crop',
  };
}

export function checkWidthParity(image: RgbaImage, ctx: ContractContext): PartContractCheck {
  const partner = ctx.widthParityPartner;
  const applicable = partner !== undefined;
  const measured = applicable ? `${medianShaftWidth(image)} vs ${medianShaftWidth(partner)}` : 'n/a (medial synthesis lands in P3)';
  const delta = applicable ? Math.abs(medianShaftWidth(image) - medianShaftWidth(partner)) / Math.max(1, medianShaftWidth(partner)) : 0;
  return {
    pcId: 'PC-05',
    applicable,
    passed: applicable && delta < 0.15,
    measured: `${measured}, delta=${(delta * 100).toFixed(1)}%`,
    threshold: '<15% contralateral shaft width delta',
    note: 'medial vs lateral width parity',
  };
}

function medianShaftWidth(image: RgbaImage): number {
  const bounds = computeOpaqueBounds(image);
  if (bounds === null) return 0;
  const widths: number[] = [];
  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    let first = -1;
    let last = -1;
    for (let x = 0; x < image.width; x += 1) {
      if (getPixel(image, x, y).a <= 20) continue;
      if (first < 0) first = x;
      last = x;
    }
    if (first >= 0) widths.push(last - first + 1);
  }
  widths.sort((a, b) => a - b);
  return widths[Math.floor(widths.length / 2)] ?? 0;
}

export function checkLuminanceBand(image: RgbaImage, ctx: ContractContext): PartContractCheck {
  const band = ctx.luminanceBand;
  const applicable = band !== undefined;
  const values: number[] = [];
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const pixel = getPixel(image, x, y);
      if (pixel.a > 20) values.push(luminance(pixel));
    }
  }
  values.sort((a, b) => a - b);
  const median = values[Math.floor(values.length / 2)] ?? 0;
  return {
    pcId: 'PC-06',
    applicable,
    passed: applicable && median >= band[0] && median <= band[1],
    measured: `medianL=${median.toFixed(1)}`,
    threshold: applicable ? `[${band[0]}, ${band[1]}]` : 'record band',
    note: 'luminance continuity with master',
  };
}

export function checkChiralityMarker(ctx: ContractContext): PartContractCheck {
  return {
    pcId: 'PC-07',
    applicable: false,
    passed: true,
    measured: 'n/a',
    threshold: 'palm/thumb probes on medial L-bend plates',
    note: 'applies to medial plates only (P3)',
  };
}

export function checkStripeSingularity(ctx: ContractContext): PartContractCheck {
  const presence = ctx.stripePresence;
  const owner = ctx.stripeOwner;
  const applicable = presence !== undefined && owner !== undefined;
  const others = presence === undefined ? [] : Object.entries(presence).filter(([id]) => id !== owner);
  const ownerCount = owner === undefined ? 0 : (presence?.[owner] ?? 0);
  const leaked = others.filter(([, count]) => count >= 20);
  const passed = applicable && (owner === 'none' ? leaked.length === 0 : ownerCount > 50 && leaked.length === 0);
  return {
    pcId: 'PC-08',
    applicable,
    passed,
    measured: presence === undefined ? 'n/a' : Object.entries(presence).map(([id, c]) => `${id}:${c}`).join(' '),
    threshold: `stripe owner '${owner}'; others < 20 px`,
    note: 'garment stripe singularity',
  };
}

export function checkGroundRegistration(image: RgbaImage, ctx: ContractContext): PartContractCheck {
  const expected = ctx.expectedLowestRow;
  const applicable = expected !== undefined;
  const bounds = computeOpaqueBounds(image);
  const tolerance = ctx.lowestRowTolerance ?? 1;
  const lowest = bounds?.maxY ?? -1;
  return {
    pcId: 'PC-09',
    applicable,
    passed: applicable && Math.abs(lowest - expected) <= tolerance,
    measured: `lowestRow=${lowest}`,
    threshold: applicable ? `${expected} +/-${tolerance}` : 'record ground convention',
    note: 'ground/pivot registration',
  };
}

export function checkAnatomyRatios(ctx: ContractContext): PartContractCheck {
  const ratio = ctx.planRatioCheck;
  const applicable = ratio !== undefined;
  return {
    pcId: 'PC-10',
    applicable,
    passed: applicable && ratio.measured >= ratio.min && ratio.measured <= ratio.max,
    measured: ratio === undefined ? 'n/a' : `armLegRatio=${ratio.measured.toFixed(3)}`,
    threshold: applicable ? `[${ratio.min}, ${ratio.max}]` : 'body-plan table +/-10%',
    note: 'anthropometric ratio class',
  };
}

export const SOCKET_HOLE_MIN_PX = 60;

export function checkNoMannequinTopology(image: RgbaImage, ctx: ContractContext): PartContractCheck {
  const holes = enclosedHoles(image, ctx.occluderCanvas)
    .filter((hole) => hole.size > SOCKET_HOLE_MIN_PX && hole.designedOverlap < 0.5);
  return {
    pcId: 'PC-11',
    applicable: ctx.stage === 'cutout',
    passed: holes.length === 0,
    measured: `socketScaleHoles=${holes.length} (sizes ${holes.map((h) => h.size).slice(0, 3).join(',') || 'none'})`,
    threshold: `0 enclosed holes > ${SOCKET_HOLE_MIN_PX}px`,
    note: 'no mannequin socket topology; small photographic gaps and designed occluder holes tolerated (ADD-007)',
  };
}

export function evaluatePartContract(image: RgbaImage, ctx: ContractContext): PartContractCheck[] {
  return [
    checkSingleSubject(image, ctx),
    checkBackdropPurity(image, ctx),
    checkOrientation(ctx),
    checkFramingMargin(image, ctx),
    checkWidthParity(image, ctx),
    checkLuminanceBand(image, ctx),
    checkChiralityMarker(ctx),
    checkStripeSingularity(ctx),
    checkGroundRegistration(image, ctx),
    checkAnatomyRatios(ctx),
    checkNoMannequinTopology(image, ctx),
  ];
}

export function contractPassed(checks: PartContractCheck[]): boolean {
  return checks.every((check) => !check.applicable || check.passed);
}

export function countStripePixels(image: RgbaImage): number {
  let count = 0;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (isWhiteFabric(getPixel(image, x, y))) count += 1;
    }
  }
  return count;
}
