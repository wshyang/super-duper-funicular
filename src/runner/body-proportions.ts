/** Body dimensions in body units. One unit is one pixel of the reference 1x figure. */
export interface BodyProportions {
  readonly thighLength: number;
  readonly shinLength: number;
  readonly torsoLength: number;
  readonly neckLength: number;
  readonly headRadius: number;
  readonly upperArmLength: number;
  readonly forearmLength: number;
  readonly handRadius: number;
  readonly footLength: number;
  readonly thighRadius: number;
  readonly kneeRadius: number;
  readonly shinRadius: number;
  readonly ankleRadius: number;
  readonly upperArmRadius: number;
  readonly forearmRadius: number;
  readonly torsoRadius: number;
  readonly waistRadius: number;
  readonly shortsRadius: number;
}

export const DEFAULT_BODY: BodyProportions = {
  thighLength: 25,
  shinLength: 24,
  torsoLength: 29,
  neckLength: 3,
  headRadius: 7.5,
  upperArmLength: 14,
  forearmLength: 13,
  handRadius: 3,
  footLength: 9,
  thighRadius: 4.6,
  kneeRadius: 3.6,
  shinRadius: 3.6,
  ankleRadius: 2.6,
  upperArmRadius: 3.2,
  forearmRadius: 2.6,
  torsoRadius: 8.4,
  waistRadius: 7.2,
  shortsRadius: 7.6,
};

/** Full leg length, hip joint to ankle, used for reach limits. */
export function fullLegLength(body: BodyProportions): number {
  return body.thighLength + body.shinLength;
}
