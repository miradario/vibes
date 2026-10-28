type InterestProfile = { spiritualPath?: string[]; preferences?: string[] } | null | undefined;
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

const interests = (profile: InterestProfile): string[] => [
  ...(profile?.spiritualPath ?? []),
  ...(profile?.preferences ?? []).flatMap(value => {
    const separator = value.indexOf(":");
    if (separator < 0 || !["intereses", "planes", "actividad fisica", "camino espiritual", "comunidad"].includes(normalize(value.slice(0, separator)))) return [];
    return value.slice(separator + 1).split(",");
  }),
].map(value => value.trim()).filter(Boolean);

export function getSharedInterests(own: InterestProfile, other: InterestProfile): string[] {
  const otherInterests = new Set(interests(other).map(normalize));
  const seen = new Set<string>();
  return interests(own).filter(value => {
    const key = normalize(value);
    if (!otherInterests.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getMatchIcebreakers(shared: string[]): string[] {
  if (!shared.length) return ["¿Un plan tranquilo o algo más movido?", "¿Café, paseo o música?"];
  const topicQuestions = shared.flatMap(interest => {
    const key = normalize(interest);
    const specific: Record<string, string> = {
      meditacion: "¿Meditación con música o en silencio?",
      yoga: "¿Yoga suave o con un poco más de movimiento?",
      musica: "¿Una canción para ponerle buena onda al día?",
      viajes: "¿Mar, montaña o ciudad?",
      arte: "¿Una muestra de arte o música en vivo?",
      deportes: "¿Deporte al aire libre o bajo techo?",
      gastronomia: "¿Dulce o salado?",
      cafe: "¿Café o té?",
      caminar: "¿Paseo por un parque o por la ciudad?",
    };
    return [specific[key] ?? `¿Alguna recomendación de ${interest.toLowerCase()}?`, `¿Algo de ${interest.toLowerCase()} para recomendar?`];
  });
  return shared.length > 1
    ? [`¿Hoy pinta más ${shared[0].toLowerCase()} o ${shared[shared.length - 1].toLowerCase()}?`, ...topicQuestions]
    : topicQuestions;
}
