export function selectBirthDateParts(year: number, month: number, day: number, minimum: Date, maximum: Date) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const date = new Date(year, month, Math.min(Math.max(1, day), lastDay));
  if (date < minimum) return new Date(minimum.getFullYear(), minimum.getMonth(), minimum.getDate());
  if (date > maximum) return new Date(maximum.getFullYear(), maximum.getMonth(), maximum.getDate());
  return date;
}
