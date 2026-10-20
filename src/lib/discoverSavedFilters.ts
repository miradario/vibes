import { readDiscoverAnswerFilters } from "./discoverFilterOptions";
import { matchesDiscoverAnswers } from "./discoverAnswerFilters";
import { matchesDatingPreferences } from "../../supabase/functions/vibi-chat/dating";
import { matchesDiscoverSpiritualPaths, readDiscoverSpiritualPaths } from "./discoverSpiritualPaths";

export function matchesSavedDiscoverExtras(candidate: Record<string, any>, preferences: Record<string, any> | null | undefined, gender: string) {
  if (!matchesDatingPreferences(preferences ?? {}, candidate)) return false;
  const genders = preferences?.discoverGenders ?? preferences?.discover_genders;
  if (Array.isArray(genders) && genders.length && !genders.includes(gender)) return false;
  if (!matchesDiscoverSpiritualPaths(candidate, readDiscoverSpiritualPaths(preferences?.discoverSpiritualPaths ?? preferences?.discover_spiritual_paths))) return false;
  return matchesDiscoverAnswers(candidate, readDiscoverAnswerFilters(preferences?.discoverAnswerFilters ?? preferences?.discover_answer_filters, preferences ?? {}));
}
