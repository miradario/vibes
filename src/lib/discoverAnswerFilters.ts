import { matchesInterestedInFilter } from "../../supabase/functions/vibi-chat/dating";
export type DiscoverAnswerFilters = Record<string, string[]>;

export function matchesDiscoverAnswers(
  candidate: Record<string, any>,
  filters: DiscoverAnswerFilters
): boolean {
  const answers = candidate.profileAnswers ?? candidate.profile_answers ?? {};
  return Object.entries(filters).every(([key, selected]) => {
    if (!selected.length) return true;
    if (key === "nationalityCode") {
      return selected.includes(candidate.nationalityCode ?? candidate.nationality_code);
    }
    if (key === "interestedIn") return matchesInterestedInFilter(candidate, selected);
    if (key === "heightMin" || key === "heightMax") return true;
    let value =
      answers[key] ??
      candidate[key] ??
      candidate[key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)];
    // Older profiles stored these answers in dedicated preference columns.
    if (key === "diet") {
      const legacy = candidate.vegetarian;
      value = value || ({ "Sí": "Vegetariana", Vegetariano: "Vegetariana", Vegano: "Vegana", Pescetariano: "Pescetariana", No: "Omnívora (como de todo)" } as Record<string, string>)[legacy];
      if (value === "Omnívora") value = "Omnívora (como de todo)";
    }
    if (key === "smoking" && typeof value === "string") {
      value = ({ yes: "Sí", no: "No", occasionally: "A veces", sometimes: "A veces" } as Record<string, string>)[value] ?? value;
    }
    const values = Array.isArray(value)
      ? value
      : typeof value === "string"
      ? [value]
      : [];
    return selected.some((option) => values.includes(option));
  });
}
