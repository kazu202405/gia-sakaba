export const PALETTES = [
  { key: "ai", label: "藍" },
  { key: "fukamidori", label: "深緑" },
] as const;

export type PaletteKey = (typeof PALETTES)[number]["key"];
export const DEFAULT_PALETTE: PaletteKey = "ai";
export const CONSTRUCTION_PALETTE_COOKIE = "sakaba-construction-palette";

export function resolvePalette(value: unknown): PaletteKey {
  return PALETTES.find((palette) => palette.key === value)?.key ?? DEFAULT_PALETTE;
}
