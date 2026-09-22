export type DiscoverAnswerFilters = Record<string, string[]>;

export function matchesDiscoverAnswers(
  candidate: Record<string, any>,
  filters: DiscoverAnswerFilters
): boolean {
  const answers = candidate.profileAnswers ?? candidate.profile_answers ?? {};
  return Object.entries(filters).every(([key, selected]) => {
    if (!selected.length) return true;
    if (key === "heightMin" || key === "heightMax") {
      const height = Number(candidate.heightCm ?? candidate.height_cm);
      if (!Number.isFinite(height) || height <= 0) return false;
      return key === "heightMin"
        ? height >= Number(selected[0])
        : height <= Number(selected[0]);
    }
    const value =
      answers[key] ??
      candidate[key] ??
      candidate[key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)];
    const values = Array.isArray(value)
      ? value
      : typeof value === "string"
      ? [value]
      : [];
    return selected.some((option) => values.includes(option));
  });
}
