export const ENERGY_SOURCES = [
  "Dormir",
  "Comida",
  "Respiración consciente",
  "Meditación o estado feliz de la mente",
] as const;

const QUESTIONS = [
  { kind: "mood", title: "¿Cómo estás hoy?" },
  { kind: "energy", title: "¿Cómo están tus fuentes de energía?" },
  { kind: "service", title: "¿Has hecho algún servicio hoy?" },
  { kind: "tip", title: "¿Querés saber cómo tener un gran día?" },
  { kind: "person", title: "¿Querés que te recomiende una persona de la app?" },
] as const;

export function getVibiDailyPrompt(day: string, userId: string) {
  const [year, month, date] = day.split("-").map(Number);
  // UTC calendar arithmetic keeps consecutive local dates one day apart across DST.
  const dayNumber = Math.floor(Date.UTC(year, month - 1, date) / 86400000);
  const offset = Array.from(userId).reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0
  );
  return {
    ...QUESTIONS[(dayNumber + offset) % QUESTIONS.length],
  };
}

// Keep this outside Home so navigation and remounts cannot repeat the greeting.
// A new app runtime starts a new session with an empty set.
const greetedUsers = new Set<string>();
export function claimVibiDailyGreeting(userId: string) {
  if (greetedUsers.has(userId)) return false;
  greetedUsers.add(userId);
  return true;
}
