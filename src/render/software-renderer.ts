/**
 * Pure-TypeScript orthographic software renderer (Sprint 3B proof-of-concept core).
 *
 * Exists to derisk Route B (`docs/PIPELINE_REVISION_PROPOSAL.md §11`): a textured,
 * skinned 3D mesh can be rasterised deterministically with zero native/GL
 * dependencies (`#nfr-purity`), at sprite scale, byte-identically across runs.
 * Not a production renderer: no mipmaps, no perspective, flat Lambert per triangle.
 */

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface SkinMesh {
  readonly positions: readonly number[];
  readonly uvs: readonly number[];
  readonly indices: readonly number[];
  readonly boneIndex: readonly number[];
}

export interface Texture {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export interface Framebuffer {
  readonly width: number;
  readonly height: number;
  readonly color: Uint8ClampedArray;
  readonly depth: Float32Array;
}

export interface BoneFrame {
  readonly cos: number;
  readonly sin: number;
  readonly tx: number;
  readonly ty: number;
}

export interface RenderSpec {
  readonly width: number;
  readonly height: number;
  readonly boneAngles: readonly number[];
  readonly boneLengths: readonly number[];
  readonly origin: Vec3;
  readonly lightDir: Vec3;
  readonly pixelsPerUnit: number;
}

export function createFramebuffer(width: number, height: number): Framebuffer {
  return {
    width,
    height,
    color: new Uint8ClampedArray(width * height * 4),
    depth: new Float32Array(width * height).fill(Number.POSITIVE_INFINITY),
  };
}

/** Cumulative sagittal (XY-plane) bone frames for a chain rooted at `origin`. */
export function cumulateBoneFrames(spec: RenderSpec): BoneFrame[] {
  const frames: BoneFrame[] = [];
  let angle = 0;
  let px = spec.origin.x;
  let py = spec.origin.y;
  for (let bone = 0; bone < spec.boneAngles.length; bone++) {
    angle += spec.boneAngles[bone] ?? 0;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    frames.push({ cos, sin, tx: px, ty: py });
    px += sin * (spec.boneLengths[bone] ?? 0);
    py += -cos * (spec.boneLengths[bone] ?? 0);
  }
  return frames;
}

/** Rest-space vertex (chain grows along -Y) skinned into world space. */
export function skinVertex(mesh: SkinMesh, frames: readonly BoneFrame[], vi: number): Vec3 {
  const bone = mesh.boneIndex[vi] ?? 0;
  const frame = frames[bone] ?? frames[0] ?? { cos: 1, sin: 0, tx: 0, ty: 0 };
  const rx = mesh.positions[vi * 3] ?? 0;
  const ry = mesh.positions[vi * 3 + 1] ?? 0;
  const rz = mesh.positions[vi * 3 + 2] ?? 0;
  return {
    x: frame.tx + frame.cos * rx - frame.sin * ry,
    y: frame.ty + frame.sin * rx + frame.cos * ry,
    z: rz,
  };
}

export function projectOrthographic(p: Vec3, spec: RenderSpec): Vec3 {
  return {
    x: spec.width / 2 + p.x * spec.pixelsPerUnit,
    y: spec.height / 2 - p.y * spec.pixelsPerUnit,
    z: p.z,
  };
}

export function sampleBilinear(tex: Texture, u: number, v: number): readonly number[] {
  const fu = Math.min(Math.max(u, 0), 0.999999) * tex.width;
  const fv = Math.min(Math.max(v, 0), 0.999999) * tex.height;
  const x0 = Math.floor(fu);
  const y0 = Math.floor(fv);
  const x1 = Math.min(x0 + 1, tex.width - 1);
  const y1 = Math.min(y0 + 1, tex.height - 1);
  const fx = fu - x0;
  const fy = fv - y0;
  const out = [0, 0, 0, 0];
  const corners = [
    [x0, y0, (1 - fx) * (1 - fy)],
    [x1, y0, fx * (1 - fy)],
    [x0, y1, (1 - fx) * fy],
    [x1, y1, fx * fy],
  ] as const;
  for (const [cx, cy, w] of corners) {
    const i = (cy * tex.width + cx) * 4;
    out[0] += (tex.data[i] ?? 0) * w;
    out[1] += (tex.data[i + 1] ?? 0) * w;
    out[2] += (tex.data[i + 2] ?? 0) * w;
    out[3] += (tex.data[i + 3] ?? 0) * w;
  }
  return out;
}

function edge(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

export function rasterizeTriangle(
  fb: Framebuffer,
  tex: Texture,
  a: Vec3,
  b: Vec3,
  c: Vec3,
  uvA: readonly number[],
  uvB: readonly number[],
  uvC: readonly number[],
  intensity: number,
): void {
  const minX = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x)));
  const maxX = Math.min(fb.width - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
  const minY = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y)));
  const maxY = Math.min(fb.height - 1, Math.ceil(Math.max(a.y, b.y, c.y)));
  const area = edge(a.x, a.y, b.x, b.y, c.x, c.y);
  if (area === 0) return;
  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      const w0 = edge(b.x, b.y, c.x, c.y, px, py);
      const w1 = edge(c.x, c.y, a.x, a.y, px, py);
      const w2 = edge(a.x, a.y, b.x, b.y, px, py);
      if ((w0 < 0 || w1 < 0 || w2 < 0) && (w0 > 0 || w1 > 0 || w2 > 0)) continue;
      const l0 = w0 / area;
      const l1 = w1 / area;
      const l2 = w2 / area;
      const depth = l0 * a.z + l1 * b.z + l2 * c.z;
      const idx = py * fb.width + px;
      if (depth >= (fb.depth[idx] ?? Infinity)) continue;
      fb.depth[idx] = depth;
      const u = l0 * (uvA[0] ?? 0) + l1 * (uvB[0] ?? 0) + l2 * (uvC[0] ?? 0);
      const v = l0 * (uvA[1] ?? 0) + l1 * (uvB[1] ?? 0) + l2 * (uvC[1] ?? 0);
      const rgba = sampleBilinear(tex, u, v);
      const o = idx * 4;
      fb.color[o] = (rgba[0] ?? 0) * intensity;
      fb.color[o + 1] = (rgba[1] ?? 0) * intensity;
      fb.color[o + 2] = (rgba[2] ?? 0) * intensity;
      fb.color[o + 3] = 255;
    }
  }
}

export function renderMesh(
  mesh: SkinMesh,
  tex: Texture,
  spec: RenderSpec,
  fb: Framebuffer,
): void {
  const frames = cumulateBoneFrames(spec);
  const world: Vec3[] = [];
  for (let vi = 0; vi < mesh.positions.length / 3; vi++) {
    world.push(skinVertex(mesh, frames, vi));
  }
  const light = normalize(spec.lightDir);
  for (let ti = 0; ti < mesh.indices.length; ti += 3) {
    const ia = mesh.indices[ti] ?? 0;
    const ib = mesh.indices[ti + 1] ?? 0;
    const ic = mesh.indices[ti + 2] ?? 0;
    const pa = world[ia] as Vec3;
    const pb = world[ib] as Vec3;
    const pc = world[ic] as Vec3;
    const normal = normalize(cross(sub(pb, pa), sub(pc, pa)));
    const intensity = 0.55 + 0.45 * Math.abs(dot(normal, light));
    rasterizeTriangle(
      fb,
      tex,
      projectOrthographic(pa, spec),
      projectOrthographic(pb, spec),
      projectOrthographic(pc, spec),
      [mesh.uvs[ia * 2] ?? 0, mesh.uvs[ia * 2 + 1] ?? 0],
      [mesh.uvs[ib * 2] ?? 0, mesh.uvs[ib * 2 + 1] ?? 0],
      [mesh.uvs[ic * 2] ?? 0, mesh.uvs[ic * 2 + 1] ?? 0],
      intensity,
    );
  }
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function normalize(a: Vec3): Vec3 {
  const len = Math.hypot(a.x, a.y, a.z) || 1;
  return { x: a.x / len, y: a.y / len, z: a.z / len };
}

export function countOpaquePixels(fb: Framebuffer): number {
  let count = 0;
  for (let i = 3; i < fb.color.length; i += 4) {
    if ((fb.color[i] ?? 0) > 0) count++;
  }
  return count;
}

/** 4-connected opaque component count (3D analogue of the 2D detached-island gate). */
export function countOpaqueComponents(fb: Framebuffer): number {
  const seen = new Uint8Array(fb.width * fb.height);
  const stack: number[] = [];
  let components = 0;
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || (fb.color[start * 4 + 3] ?? 0) === 0) continue;
    components++;
    stack.push(start);
    seen[start] = 1;
    while (stack.length > 0) {
      const cur = stack.pop() ?? 0;
      const cx = cur % fb.width;
      const neighbors = [
        cx > 0 ? cur - 1 : -1,
        cx < fb.width - 1 ? cur + 1 : -1,
        cur - fb.width,
        cur + fb.width,
      ];
      for (const n of neighbors) {
        if (n < 0 || n >= seen.length || seen[n] || (fb.color[n * 4 + 3] ?? 0) === 0) continue;
        seen[n] = 1;
        stack.push(n);
      }
    }
  }
  return components;
}
