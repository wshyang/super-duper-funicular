export interface Palette {
  readonly id: string;
  readonly skin: string;
  readonly hair: string;
  readonly jersey: string;
  readonly shorts: string;
  readonly shoes: string;
}

export const PALETTES: readonly Palette[] = [
  { id: "blue", skin: "#e8c4a8", hair: "#1a120c", jersey: "#2a62c9", shorts: "#1a3a86", shoes: "#f2f2f2" },
  { id: "green", skin: "#e8c4a8", hair: "#1a120c", jersey: "#259d24", shorts: "#145c14", shoes: "#f2f2f2" },
  { id: "orange", skin: "#e8c4a8", hair: "#1a120c", jersey: "#f87708", shorts: "#b35300", shoes: "#f2f2f2" },
  { id: "purple", skin: "#e8c4a8", hair: "#1a120c", jersey: "#7a3ea8", shorts: "#4c2470", shoes: "#f2f2f2" },
  { id: "red", skin: "#e8c4a8", hair: "#1a120c", jersey: "#d12626", shorts: "#8a1212", shoes: "#f2f2f2" },
  { id: "yellow", skin: "#e8c4a8", hair: "#1a120c", jersey: "#e6c200", shorts: "#9a7a00", shoes: "#f2f2f2" },
];

export function paletteById(id: string): Palette {
  return PALETTES.find((item) => item.id === id) ?? PALETTES[0]!;
}
