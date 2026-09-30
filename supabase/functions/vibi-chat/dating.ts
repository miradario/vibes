/** Shared by Discovery and Vibi. Missing answers never imply “Todos”. */
type Preferences = Record<string, any>;
export const INTERESTED_IN_OPTIONS = ["Hombre", "Mujer", "Todos"] as const;
export function interestedIn(preferences: Preferences): string {
  const value = (preferences.profileAnswers ?? preferences.profile_answers)?.interestedIn;
  return INTERESTED_IN_OPTIONS.includes(value) ? value : "";
}
const lookingFor = (p: Preferences): string[] => {
  const value = p.lookingFor ?? p.looking_for ?? [];
  return Array.isArray(value) ? value : [];
};
const accepts = (interest: string, gender: unknown) =>
  !interest || !["Hombre", "Mujer", "Otro"].includes(String(gender)) ||
  interest === "Todos" || interest === gender;

export function matchesDatingPreferences(own: Preferences, candidate: Preferences): boolean {
  const seeking = lookingFor(own);
  if (seeking.length !== 1 || seeking[0] !== "Citas") return true;
  const candidateSeeking = lookingFor(candidate);
  if (candidateSeeking.length && !candidateSeeking.includes("Citas")) return false;
  return accepts(interestedIn(own), candidate.gender) &&
    accepts(interestedIn(candidate), own.gender);
}

export function matchesInterestedInFilter(candidate: Preferences, selected: string[]): boolean {
  if (!selected.length) return true;
  const answer = interestedIn(candidate);
  return !!answer && selected.some(option => answer === option || answer === "Todos");
}
