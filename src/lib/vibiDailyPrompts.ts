import AsyncStorage from "@react-native-async-storage/async-storage";

export const ENERGY_SOURCES = [
  "Dormir",
  "Comida",
  "Respiración consciente",
  "Meditación o estado feliz de la mente",
] as const;

const QUESTIONS = [
  { kind: "mood", title: "¿Cómo estás hoy?" },
  { kind: "energy", title: "¿Cómo están tus fuentes de energía?" },
  { kind: "service", title: "¿Ayudaste a alguien hoy?" },
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

// Once Vibi's daily card was shown (seen or dismissed) it stays hidden for the
// rest of that local day, also across app restarts.
const seenKey = (userId: string, day: string) =>
  `vibiDailySeen:${userId}:${day}`;
export async function claimVibiDailyGreetingForDay(
  userId: string,
  day: string
) {
  if (!claimVibiDailyGreeting(userId)) return false;
  try {
    if (await AsyncStorage.getItem(seenKey(userId, day))) return false;
    await AsyncStorage.setItem(seenKey(userId, day), "1");
  } catch {
    /* Storage failure: fall back to once per session. */
  }
  return true;
}

export function resetVibiDailyGreeting(userId?: string) {
  if (userId) greetedUsers.delete(userId);
  else greetedUsers.clear();
}
