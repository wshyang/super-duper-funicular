export type MotionType = "run" | "walk" | "brisk-walk";
export interface MotionProfile {
  id: MotionType;
  name: string;
  description: string;
  stance: number;
  defaults: { cadence: number; stride: number; lift: number; lean: number };
  limits: {
    cadence: [number, number];
    stride: [number, number];
    lift: [number, number];
    lean: [number, number];
  };
}
export const motions: Record<MotionType, MotionProfile> = {
  run: {
    id: "run",
    name: "Running",
    description: "Alternating support with an airborne phase.",
    stance: 0.36,
    defaults: { cadence: 168, stride: 36, lift: 25, lean: 10 },
    limits: {
      cadence: [90, 220],
      stride: [18, 48],
      lift: [12, 38],
      lean: [0, 20],
    },
  },
  walk: {
    id: "walk",
    name: "Walking",
    description: "Heel-to-toe steps with double support and no flight.",
    stance: 0.62,
    defaults: { cadence: 108, stride: 28, lift: 7, lean: 2 },
    limits: {
      cadence: [60, 140],
      stride: [14, 36],
      lift: [3, 14],
      lean: [0, 8],
    },
  },
  "brisk-walk": {
    id: "brisk-walk",
    name: "Brisk walking",
    description: "Quicker steps, stronger arm swing, shorter double support.",
    stance: 0.56,
    defaults: { cadence: 132, stride: 32, lift: 9, lean: 4 },
    limits: {
      cadence: [90, 160],
      stride: [18, 38],
      lift: [4, 16],
      lean: [0, 10],
    },
  },
};
export const motionList = Object.values(motions);
export function getMotionDefaults(motion: MotionType) {
  return { ...motions[motion].defaults, motion };
}
