import { matchesDiscoverAnswers } from "./discoverAnswerFilters";
import { matchesDatingPreferences } from "../../supabase/functions/vibi-chat/dating";
import { matchesDiscoverSpiritualPaths, readDiscoverSpiritualPaths } from "./discoverSpiritualPaths";

export function matchesSavedDiscoverExtras(candidate: Record<string, any>, preferences: Record<string, any> | null | undefined, gender: string) {
  if (!matchesDatingPreferences(preferences ?? {}, candidate)) return false;
  const genders = preferences?.discoverGenders ?? preferences?.discover_genders;
  if (Array.isArray(genders) && genders.length && !genders.includes(gender)) return false;
  const diets = preferences?.discoverDiets ?? preferences?.discover_diets;
  const value = String(candidate.vegetarian ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const diet = ["si", "yes", "vegetarian", "vegetariano", "vegetariana"].includes(value) ? "vegetarian"
    : ["no", "non-vegetarian", "no vegetariano", "no vegetariana"].includes(value) ? "nonVegetarian"
    : value ? "other" : "unknown";
  if (Array.isArray(diets) && diets.length && !diets.includes(diet)) return false;
  if (!matchesDiscoverSpiritualPaths(candidate, readDiscoverSpiritualPaths(preferences?.discoverSpiritualPaths ?? preferences?.discover_spiritual_paths))) return false;
  return matchesDiscoverAnswers(candidate, preferences?.discoverAnswerFilters ?? preferences?.discover_answer_filters ?? {});
}
