export type PersonaId = "wei-ming" | "mei-lin" | "mei-lin-photo";
export interface Persona {
  id: PersonaId;
  renderStyle: "pixel" | "photo";
  name: string;
  label: string;
  skin: string;
  shade: string;
  hair: string;
  hairHighlight: string;
  hairstyle: "cropped" | "ponytail";
  torsoWidth: number;
  shortsWidth: number;
  shortsLength: number;
}
// Fictional individuals, not anatomical templates for an ethnicity or gender.
// Both skins use the same tested skeleton and gait; styling does not change ability.
export const personas: Record<PersonaId, Persona> = {
  "wei-ming": {
    id: "wei-ming",
    renderStyle: "pixel",
    name: "Wei Ming",
    label: "Male runner",
    skin: "#d9a77d",
    shade: "#ad785a",
    hair: "#232329",
    hairHighlight: "#46434a",
    hairstyle: "cropped",
    torsoWidth: 20,
    shortsWidth: 13,
    shortsLength: 0.6,
  },
  "mei-lin": {
    id: "mei-lin",
    renderStyle: "pixel",
    name: "Mei Lin",
    label: "Female runner",
    skin: "#e2b28d",
    shade: "#b98566",
    hair: "#26232c",
    hairHighlight: "#4b414e",
    hairstyle: "ponytail",
    torsoWidth: 17,
    shortsWidth: 11,
    shortsLength: 0.45,
  },
  "mei-lin-photo": {
    id: "mei-lin-photo",
    renderStyle: "photo",
    name: "Mei Lin · Photo",
    label: "Photographic · Female",
    skin: "#e2b28d",
    shade: "#b98566",
    hair: "#26232c",
    hairHighlight: "#4b414e",
    hairstyle: "cropped",
    torsoWidth: 17,
    shortsWidth: 11,
    shortsLength: 0.45,
  },
};
export const personaList = Object.values(personas);
export function getPonytailAngle(phase: number) {
  return -0.35 + 0.32 * Math.sin(phase * Math.PI * 4 - 0.8);
}
