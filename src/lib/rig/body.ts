export interface BodyMetrics {
  readonly id: string;
  readonly statureMetres: number;
  readonly thighLength: number;
  readonly shinLength: number;
  readonly hipStandHeight: number;
  readonly torsoLength: number;
  readonly neckLength: number;
  readonly headRadius: number;
  readonly upperArmLength: number;
  readonly forearmLength: number;
  readonly footBall: number;
  readonly footToe: number;
  readonly footSole: number;
}

const shared = {
  hipStandHeight: 0.5,
  torsoLength: 0.31,
  neckLength: 0.04,
  headRadius: 0.065,
  footBall: 0.046,
  footToe: 0.108,
  footSole: 0.05,
} as const;

export const MALE_BODY: BodyMetrics = {
  ...shared,
  id: "sg-chinese-male",
  statureMetres: 1.73,
  thighLength: 0.245,
  shinLength: 0.235,
  upperArmLength: 0.18,
  forearmLength: 0.16,
};

export const FEMALE_BODY: BodyMetrics = {
  ...shared,
  id: "sg-chinese-female",
  statureMetres: 1.6,
  thighLength: 0.238,
  shinLength: 0.228,
  upperArmLength: 0.17,
  forearmLength: 0.155,
};

export type PersonaId = "sg-chinese-male" | "sg-chinese-female";

export function bodyFor(id: PersonaId): BodyMetrics {
  return id === "sg-chinese-female" ? FEMALE_BODY : MALE_BODY;
}
