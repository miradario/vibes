type Profile = Record<string, any>;
type Range = { ageMin: number | null; ageMax: number | null };
const normalized = (value: unknown) => typeof value === "string"
  ? value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() : "";
const selected = (profile: Profile, key: string, alias: string) =>
  new Set<string>((Array.isArray(profile[key] ?? profile[alias]) ? profile[key] ?? profile[alias] : [])
    .map(normalized).filter(Boolean));
const overlap = (own: Set<string>, other: Set<string>) =>
  own.size ? [...own].filter((value) => other.has(value)).length / own.size : 0;

// Rank only eligible candidates; the Home's explicit filters remain authoritative.
export function homeSuggestionScore(candidate: Profile, own: Profile, range: Range): number {
  const age = Number(candidate.suggestionAge);
  const ownAge = Number(own.suggestionAge);
  let ageScore = 0;
  if (candidate.suggestionAge != null && Number.isFinite(age)) {
    if (range.ageMin !== null || range.ageMax !== null) {
      ageScore = (range.ageMin === null || age >= range.ageMin) &&
        (range.ageMax === null || age <= range.ageMax) ? 1 : 0;
    } else if (own.suggestionAge != null && Number.isFinite(ownAge)) {
      ageScore = Math.max(0, 1 - Math.abs(age - ownAge) / 15);
    }
  }
  const distance = candidate.distanceKm;
  const ownCity = normalized(own.location ?? own.city);
  const candidateCity = normalized(candidate.location ?? candidate.city);
  const locationScore = typeof distance === "number" && Number.isFinite(distance) && distance >= 0
    ? 1 / (1 + distance / 30)
    : ownCity && ownCity === candidateCity ? 1 : 0;
  const tastes = overlap(selected(own, "spiritualPath", "spiritual_path"), selected(candidate, "spiritualPath", "spiritual_path"));
  const purposes = overlap(selected(own, "openTo", "open_to"), selected(candidate, "openTo", "open_to"));
  return ageScore + locationScore + tastes + purposes;
}

export function rankHomeSuggestions<T extends Profile>(candidates: T[], own: Profile, range: Range): T[] {
  return candidates.map((candidate, index) => ({ candidate, index, score: homeSuggestionScore(candidate, own, range) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ candidate }) => candidate);
}
