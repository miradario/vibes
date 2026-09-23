import { parseBirthDate } from "./birthDate";

/** Conventional sun-sign calendar, using the birth date without UTC conversion. */
export function zodiacFromBirthDate(value?: string | null): string | undefined {
  const date = parseBirthDate(value);
  if (!date) return undefined;
  const month = date.getMonth();
  const boundaries = [20, 19, 21, 20, 21, 21, 23, 23, 23, 23, 22, 22];
  const signs = ["Capricornio", "Acuario", "Piscis", "Aries", "Tauro", "Géminis",
    "Cáncer", "Leo", "Virgo", "Libra", "Escorpio", "Sagitario"];
  return signs[(month + (date.getDate() >= boundaries[month] ? 1 : 0)) % 12];
}
