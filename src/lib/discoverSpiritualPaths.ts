import {
  getSelectedSpiritualPaths,
  SPIRITUAL_PATH_OPTIONS,
} from "./spiritualPaths";

const normalize = (value: string) => {
  const text = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return ["arte de vivir", "art of living"].includes(text)
    ? "el arte de vivir"
    : text;
};

export const readDiscoverSpiritualPaths = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const selected = new Set(
    value.filter((v): v is string => typeof v === "string").map(normalize)
  );
  return SPIRITUAL_PATH_OPTIONS.filter((option) =>
    selected.has(normalize(option))
  );
};

export const matchesDiscoverSpiritualPaths = (
  profile: Record<string, any>,
  selected: string[]
): boolean => {
  if (selected.length === 0) return true;
  const paths = new Set(
    getSelectedSpiritualPaths(
      profile.spiritualPath ?? profile.spiritual_path,
      profile.spiritualPathDetails ?? profile.spiritual_path_details
    ).map(normalize)
  );
  return selected.some((path) => paths.has(normalize(path)));
};
