import { vibesTheme } from "../theme/vibesTheme";

export function discoverProfileColor(gender?: string | null) {
  const value = gender?.trim().toLowerCase();
  if (["man", "male", "hombre"].includes(value ?? "")) return vibesTheme.colors.accentBlue;
  if (["woman", "female", "mujer"].includes(value ?? "")) return vibesTheme.colors.accentCoral;
  return vibesTheme.colors.background;
}
