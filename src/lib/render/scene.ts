import { boundsUnion, polygonBounds, transformPolygon, type Bounds, type Polygon } from "../geometry/poly.ts";
import type { Vec2 } from "../geometry/vec.ts";
import type { RunnerPose } from "../gait/pose.ts";
import type { MaterialKey, PartGeometry } from "../rig/parts/index.ts";
import { partsFor, type SpriteLook } from "../rig/persona.ts";
import { shadePalette, type Palette, type Rgb } from "../rig/palette.ts";

/** One filled polygon plus the optional seam it should not have. */
export interface ShapeCommand {
  readonly points: Polygon;
  readonly fill: Rgb;
}

/**
 * A part's shapes, grouped. The painter draws the group twice: an expanded
 * outline pass, then the fills. Overlapping fills cover the inner half of the
 * outline, so each part keeps exactly one silhouette edge - the paper-cut-out
 * look of the source sheet, produced without any hand-drawn outline artwork.
 */
export interface CommandGroup {
  readonly id: string;
  readonly shapes: readonly ShapeCommand[];
  readonly outline: Rgb | null;
}

export interface Scene {
  readonly groups: readonly CommandGroup[];
  readonly bounds: Bounds;
}

const OUTLINE_WIDTH = 0.0044;

export const sceneOutlineWidth = (): number => OUTLINE_WIDTH;

export function resolveMaterial(palette: Palette, material: MaterialKey): Rgb {
  if (material === "none") return { r: 0, g: 0, b: 0 };
  return palette[material];
}

export function partToGroup(
  part: PartGeometry,
  palette: Palette,
  angle: number,
  origin: Vec2,
  idSuffix = "",
): CommandGroup {
  return {
    id: `${part.id}${idSuffix}`,
    outline: palette.outline,
    shapes: part.shapes.map((shape) => ({
      points: transformPolygon(shape.points, angle, origin),
      fill: resolveMaterial(palette, shape.material),
    })),
  };
}

/** Whole-silhouette outline on its own, for parts whose seams must stay hidden. */
export function mergeBounds(groups: readonly CommandGroup[]): Bounds {
  return groups.reduce<Bounds>(
    (accumulator, group) => {
      return group.shapes.reduce(
        (inner, shape) => boundsUnion(inner, polygonBounds(shape.points)),
        accumulator,
      );
    },
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );
}

function partById(parts: readonly PartGeometry[], id: string): PartGeometry {
  const part = parts.find((candidate) => candidate.id === id);
  if (part === undefined) throw new Error(`Unknown part: ${id}`);
  return part;
}

interface PartJob {
  readonly part: string;
  readonly angle: number;
  readonly origin: Vec2;
  readonly suffix: string;
}

/**
 * Lower body for one side. The shoe is two parts: the hindfoot rotates about
 * the ankle, the forefoot about the ball. That split is what lets the heel peel
 * up while the toes stay planted.
 */
function lowerBodyJobs(side: "near" | "far", pose: RunnerPose): PartJob[] {
  const leg = pose[side].leg;
  return [
    { part: "thigh", angle: leg.thighAngle, origin: leg.hip, suffix: `-${side}` },
    { part: "shin", angle: leg.shinAngle, origin: leg.knee, suffix: `-${side}` },
    { part: "shoe", angle: leg.hindAngle, origin: leg.ankle, suffix: `-${side}` },
    { part: "shoeToe", angle: leg.foreAngle, origin: leg.foot.ball, suffix: `-${side}` },
  ];
}

function armJobs(side: "near" | "far", pose: RunnerPose): PartJob[] {
  const arm = pose[side].arm;
  return [
    { part: "upperArm", angle: arm.upperAngle, origin: arm.shoulder, suffix: `-${side}` },
    { part: "forearm", angle: arm.forearmAngle, origin: arm.elbow, suffix: `-${side}` },
  ];
}

interface ShadedJob {
  readonly job: PartJob;
  readonly palette: Palette;
}

/**
 * Draw order: far limbs, torso, neck, near leg, head, near arm. The far side is
 * drawn in a cooled shadow palette, which is the depth cue the source sheet
 * lacks. Torso and head never share one rigid transform: the neck sits between
 * them and absorbs part of the trunk lean.
 */
export function composeRunner(pose: RunnerPose, look: SpriteLook): Scene {
  const parts = partsFor(look);
  const farPalette = shadePalette(look.palette, 0.84);
  const jobs: ShadedJob[] = [
    ...lowerBodyJobs("far", pose).map((job) => ({ job, palette: farPalette })),
    ...armJobs("far", pose).map((job) => ({ job, palette: farPalette })),
    { job: { part: "torso", angle: -pose.torsoAngle, origin: pose.hip, suffix: "" }, palette: look.palette },
    { job: { part: "neck", angle: -pose.neckAngle, origin: pose.neckBase, suffix: "" }, palette: look.palette },
    ...lowerBodyJobs("near", pose).map((job) => ({ job, palette: look.palette })),
    { job: { part: "head", angle: -pose.headAngle, origin: pose.headBase, suffix: "" }, palette: look.palette },
    ...armJobs("near", pose).map((job) => ({ job, palette: look.palette })),
  ];
  const groups = jobs.map(({ job, palette }) =>
    partToGroup(partById(parts, job.part), palette, job.angle, job.origin, job.suffix),
  );
  return { groups, bounds: mergeBounds(groups) };
}

/** Scene for the part inspector: one part, drawn at the origin, unposed. */
export function singlePartScene(part: PartGeometry, palette: Palette): Scene {
  const groups = [partToGroup(part, palette, 0, { x: 0, y: 0 })];
  return { groups, bounds: mergeBounds(groups) };
}
