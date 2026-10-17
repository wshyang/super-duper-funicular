import { FEMALE_BODY, MALE_BODY, type BodyMetrics } from "./body.ts";
import {
  buildAllParts,
  type HairStyle,
  type PartBuilder,
  type PartGeometry,
  type PartId,
} from "./parts/index.ts";
import {
  buildPalette,
  findColorway,
  hex,
  shadeRgb,
  lightenRgb,
  type Palette,
  type Rgb,
} from "./palette.ts";

export type PersonaId = "sg-chinese-male" | "sg-chinese-female";

/**
 * A skin is the swappable presentation layer: palette, hair silhouette, and
 * optional replacement builders for individual parts. The anatomy lives in
 * `BodyMetrics`; the skin never changes joint positions, so every skin runs
 * the same gait.
 */
export interface Skin {
  readonly id: string;
  readonly label: string;
  readonly hair: HairStyle;
  readonly skin: Rgb;
  readonly skinShade: Rgb;
  readonly skinLight: Rgb;
  readonly defaultColorwayId: string;
  /** Hook: replace any part's geometry without touching the rig or gait. */
  readonly partOverrides?: Partial<Record<PartId, PartBuilder>>;
}

export interface Persona {
  readonly id: PersonaId;
  readonly label: string;
  readonly blurb: string;
  readonly body: BodyMetrics;
  readonly skin: Skin;
}

const MALE_SKIN: Skin = {
  id: "sg-track-male",
  label: "Track singlet, short hair",
  hair: "short",
  skin: hex("#c98052"),
  skinShade: hex("#a25f36"),
  skinLight: hex("#e6a274"),
  defaultColorwayId: "red",
};

const FEMALE_SKIN: Skin = {
  id: "sg-track-female",
  label: "Track crop, ponytail",
  hair: "ponytail",
  skin: hex("#d99a74"),
  skinShade: hex("#b37350"),
  skinLight: hex("#f0bd99"),
  defaultColorwayId: "blue",
};

export const PERSONAS: readonly Persona[] = [
  {
    id: "sg-chinese-male",
    label: "Singaporean Chinese, male",
    blurb: "1.73 m · longer legs, broader shoulders, short hair",
    body: MALE_BODY,
    skin: MALE_SKIN,
  },
  {
    id: "sg-chinese-female",
    label: "Singaporean Chinese, female",
    blurb: "1.61 m · wider pelvis, narrower shoulders, ponytail",
    body: FEMALE_BODY,
    skin: FEMALE_SKIN,
  },
];

export function findPersona(id: string): Persona {
  const persona = PERSONAS.find((candidate) => candidate.id === id);
  if (persona === undefined) throw new Error(`Unknown persona: ${id}`);
  return persona;
}

/** Everything the renderer needs for one drawn runner. */
export interface SpriteLook {
  readonly personaId: PersonaId;
  readonly body: BodyMetrics;
  readonly palette: Palette;
  readonly hair: HairStyle;
  readonly overrides: Partial<Record<PartId, PartBuilder>>;
}

/** Re-colours the shared palette's skin family for a persona's skin tone. */
export function skinPalette(skin: Skin, colorwayId: string): Palette {
  const base = buildPalette(findColorway(colorwayId));
  return {
    ...base,
    skin: skin.skin,
    skinShade: skin.skinShade,
    skinLight: skin.skinLight,
  };
}

export function lookFor(personaId: string, colorwayId: string): SpriteLook {
  const persona = findPersona(personaId);
  return {
    personaId: persona.id,
    body: persona.body,
    palette: skinPalette(persona.skin, colorwayId),
    hair: persona.skin.hair,
    overrides: persona.skin.partOverrides ?? {},
  };
}

/** Default palette for the atlas and other palette-only consumers. */
export function personaPalette(personaId: string, colorwayId?: string): Palette {
  const persona = findPersona(personaId);
  return skinPalette(persona.skin, colorwayId ?? persona.skin.defaultColorwayId);
}

/** Builds the nine parts, then applies any skin overrides by id. */
export function partsFor(look: SpriteLook): readonly PartGeometry[] {
  return buildAllParts(look.body, look.hair).map((part) => {
    const override = look.overrides[part.id];
    return override === undefined ? part : override();
  });
}

export { shadeRgb, lightenRgb };
