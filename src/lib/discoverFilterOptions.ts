import { QUESTION_GROUPS } from "./profileQuestionOptions";
import { PURPOSE_OPTIONS } from "../screens/Onboarding/vibesOnboardingContent";
import { isCountryCode } from "../constants/countries";

export const DISCOVER_ANSWER_FILTER_FIELDS: { key: string; label: string; options: readonly string[] }[] = [
  { key: "openTo", label: "Me trae a Vibes", options: PURPOSE_OPTIONS.map(option => option.label) },
  ...QUESTION_GROUPS.flatMap(group => group.fields.flatMap(field =>
    "options" in field && field.key !== "gender" && field.key !== "lookingFor"
      ? [{ key: field.key, label: field.key === "interestedIn" ? "Está interesado en" : field.label, options: field.options as readonly string[] }]
      : []
  )),
];

/** Drop retired options and migrate the old duplicate diet/smoking controls. */
export function readDiscoverAnswerFilters(raw: unknown, legacy: Record<string, any> = {}): Record<string, string[]> {
  const source = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const result: Record<string, string[]> = {};
  for (const field of DISCOVER_ANSWER_FILTER_FIELDS) {
    const values = source[field.key];
    if (Array.isArray(values)) result[field.key] = values.filter((value): value is string => typeof value === "string" && field.options.includes(value));
  }
  if (Array.isArray(source.nationalityCode)) result.nationalityCode = source.nationalityCode.filter(isCountryCode);
  if (!("diet" in source)) {
    const diets = legacy.discoverDiets ?? legacy.discover_diets;
    if (Array.isArray(diets)) {
      result.diet = diets.flatMap(value => value === "vegetarian" ? ["Vegetariana"] : value === "nonVegetarian" ? ["Omnívora (como de todo)"] : value === "other" ? ["Vegana", "Pescetariana"] : []);
    }
  }
  if (!("smoking" in source)) {
    const smoking = legacy.discoverSmoking ?? legacy.discover_smoking;
    const value = ({ no: "No", yes: "Sí", occasionally: "A veces" } as Record<string, string>)[smoking];
    if (value) result.smoking = [value];
  }
  return result;
}
