/**
 * Deterministic mesh + texture factories for the Route B proof-of-concept
 * (`docs/PIPELINE_REVISION_PROPOSAL.md §11`). The capsule chain deliberately
 * overlaps each segment's rounded cap into the next segment's start — the 3D
 * analogue of the 2D pivot-centred semicircular caps retained from PR #1.
 */
import type { SkinMesh, Texture } from './software-renderer.js';

export interface CapsuleSegmentSpec {
  readonly radius: number;
  readonly length: number;
  readonly radialSegments: number;
  readonly rings: number;
}

interface Builder {
  positions: number[];
  uvs: number[];
  indices: number[];
  boneIndex: number[];
}

function pushVertex(b: Builder, x: number, y: number, z: number, u: number, v: number, bone: number): number {
  b.positions.push(x, y, z);
  b.uvs.push(u, v);
  b.boneIndex.push(bone);
  return b.positions.length / 3 - 1;
}

function loftRing(
  b: Builder,
  seg: CapsuleSegmentSpec,
  yTop: number,
  yBot: number,
  vTop: number,
  vBot: number,
  bone: number,
): number[][] {
  const rings: number[][] = [];
  for (let ring = 0; ring <= seg.rings; ring++) {
    const t = ring / seg.rings;
    const y = yTop + (yBot - yTop) * t;
    const v = vTop + (vBot - vTop) * t;
    const row: number[] = [];
    for (let s = 0; s < seg.radialSegments; s++) {
      const a = (s / seg.radialSegments) * Math.PI * 2;
      row.push(pushVertex(b, Math.cos(a) * seg.radius, y, Math.sin(a) * seg.radius, s / seg.radialSegments, v, bone));
    }
    rings.push(row);
  }
  return rings;
}

function stitchRings(b: Builder, rings: readonly (readonly number[])[]): void {
  for (let r = 0; r < rings.length - 1; r++) {
    const top = rings[r] ?? [];
    const bot = rings[r + 1] ?? [];
    for (let s = 0; s < top.length; s++) {
      const s2 = (s + 1) % top.length;
      b.indices.push(top[s] ?? 0, bot[s] ?? 0, bot[s2] ?? 0, top[s] ?? 0, bot[s2] ?? 0, top[s2] ?? 0);
    }
  }
}

/** One bone = cylinder shaft + rounded proximal cap; cap overlaps the parent segment. */
function buildSegment(b: Builder, seg: CapsuleSegmentSpec, yStart: number, bone: number, vStart: number): number {
  const vSpan = 0.8 / 1;
  const shaft = loftRing(b, seg, yStart, yStart - seg.length, vStart, vStart + vSpan, bone);
  stitchRings(b, shaft);
  const capRows: number[][] = [shaft[shaft.length - 1] ?? []];
  const capRings = 3;
  for (let c = 1; c <= capRings; c++) {
    const phi = (c / capRings) * (Math.PI / 2);
    const radius = Math.cos(phi) * seg.radius;
    const y = yStart - seg.length - Math.sin(phi) * seg.radius * 0.6;
    const row: number[] = [];
    for (let s = 0; s < seg.radialSegments; s++) {
      const a = (s / seg.radialSegments) * Math.PI * 2;
      row.push(pushVertex(b, Math.cos(a) * radius, y, Math.sin(a) * radius, s / seg.radialSegments, vStart + vSpan, bone));
    }
    capRows.push(row);
  }
  stitchRings(b, capRows);
  return yStart - seg.length - seg.radius * 0.6;
}

export function buildCapsuleChainMesh(segments: readonly CapsuleSegmentSpec[]): SkinMesh {
  const b: Builder = { positions: [], uvs: [], indices: [], boneIndex: [] };
  let v = 0;
  segments.forEach((seg, bone) => {
    // Bone-local rest space: shaft top pokes `overlap` into the parent segment so
    // the rounded cap union stays connected under any sagittal rotation.
    const yStart = bone === 0 ? 0 : seg.radius * 0.5;
    buildSegment(b, seg, yStart, bone, v);
    v += 0.8;
  });
  return { positions: b.positions, uvs: b.uvs, indices: b.indices, boneIndex: b.boneIndex };
}

/** Synthetic photographic-stand-in albedo: skin gradient + garment stripe + UV grid. */
export function makeSyntheticTexture(width: number, height: number): Texture {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const stripe = x > width * 0.42 && x < width * 0.5 ? 1 : 0;
      const grid = x % 32 < 1 || y % 32 < 1 ? 1 : 0;
      const shade = 0.75 + 0.25 * Math.sin((y / height) * Math.PI);
      data[i] = stripe ? 240 : 178 * shade;
      data[i + 1] = stripe ? 240 : 132 * shade;
      data[i + 2] = stripe ? 244 : 106 * shade;
      data[i + 3] = grid ? 255 : 255;
      if (grid) {
        data[i] = 40;
        data[i + 1] = 40;
        data[i + 2] = 44;
      }
    }
  }
  return { width, height, data };
}
