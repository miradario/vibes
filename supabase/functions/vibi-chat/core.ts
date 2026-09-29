export const CATEGORIES = ["challenge", "event", "person"] as const;
export type Category = (typeof CATEGORIES)[number];
export type Row = Record<string, any>;
export type Candidate = {
  id: string;
  type: Category;
  title: string;
  thumbnail: string | null;
  description: string;
  tags: string[];
  startsAt?: string | null;
  durationDays?: number;
  location?: string | null;
  modality?: string;
  distanceKm?: number | null;
};
export type Recommendation = Candidate & { reason: string };
export class VibiError extends Error {
  constructor(public code: string, public status = 400) {
    super(code);
  }
}
export const text = (value: unknown, max = 2000) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
export const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .filter((v): v is string => typeof v === "string")
        .slice(0, 30)
        .map((v) => text(v, 100))
    : [];
export const isCategory = (value: unknown): value is Category =>
  CATEGORIES.includes(value as Category);
export const isUUID = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export const normalize = (v: unknown) =>
  text(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

// A conservative guard for explicit category words, not a replacement for the
// model's interpretation. Mixed or negated requests remain for the model.
export function requestedCategory(message: string): Category | undefined {
  const value = normalize(message);
  if (/\b(no|ni|sin|excepto|menos|not|without)\b/.test(value)) return undefined;
  const categories: Category[] = [];
  if (/\b(eventos?|events?)\b/.test(value)) categories.push("event");
  if (/\b(desafios?|retos?|challenges?)\b/.test(value))
    categories.push("challenge");
  if (/\b(personas?|gente|people)\b/.test(value)) categories.push("person");
  return categories.length === 1 ? categories[0] : undefined;
}
const number = (v: unknown): number | null =>
  (typeof v === "number" || (typeof v === "string" && v.trim())) &&
  Number.isFinite(Number(v))
    ? Number(v)
    : null;
export const age = (birth: unknown, now = new Date()) => {
  const d = new Date(text(birth));
  if (!Number.isFinite(d.getTime())) return null;
  return (
    now.getUTCFullYear() -
    d.getUTCFullYear() -
    (now.getUTCMonth() < d.getUTCMonth() ||
    (now.getUTCMonth() === d.getUTCMonth() && now.getUTCDate() < d.getUTCDate())
      ? 1
      : 0)
  );
};
export function distance(a: Row, b: Row): number | null {
  const coords = [a.latitude, a.longitude, b.latitude, b.longitude].map(number);
  if (coords.some((v) => v === null)) return null;
  const [lat1, lon1, lat2, lon2] = coords as number[];
  const rad = (v: number) => (v * Math.PI) / 180;
  const h =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) *
      Math.cos(rad(lat2)) *
      Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
const inRange = (v: number | null, min: unknown, max: unknown) => {
  const lo = number(min),
    hi = number(max);
  if (lo === null && hi === null) return true;
  return v !== null && (lo === null || v >= lo) && (hi === null || v <= hi);
};
const gender = (v: unknown, id?: unknown) => {
  const n = normalize(v);
  if (["woman", "female", "mujer"].includes(n)) return "woman";
  if (["man", "male", "hombre"].includes(n)) return "man";
  if (
    [
      "nonbinary",
      "non-binary",
      "no binario",
      "no binaria",
      "other",
      "otro",
      "otra",
      "more",
      "mas",
    ].includes(n)
  )
    return "other";
  return (
    (
      { 1: "woman", 2: "man", 3: "other", 4: "other" } as Record<string, string>
    )[String(id)] ?? "unknown"
  );
};
const smoking = (v: unknown) => {
  const n = normalize(v);
  if (["no", "never", "non"].some((s) => n.includes(s))) return "no";
  if (["occasion", "social", "sometimes", "a veces"].some((s) => n.includes(s)))
    return "occasionally";
  if (["yes", "si", "daily", "smoker", "fuma"].some((s) => n.includes(s)))
    return "yes";
  return "all";
};
const diet = (v: unknown) => {
  const n = normalize(v);
  if (!n) return "unknown";
  if (["si", "yes", "vegetarian", "vegetariano", "vegetariana"].includes(n))
    return "vegetarian";
  if (["no", "non-vegetarian", "no vegetariano", "no vegetariana"].includes(n))
    return "nonVegetarian";
  return "other";
};
const spiritual = (v: string) =>
  ["arte de vivir", "art of living"].includes(normalize(v))
    ? "el arte de vivir"
    : normalize(v);
// Mirrors Discover's stored filters; private coordinates are used only here, never in the model payload.
export function matchesPerson(
  profile: Row,
  preferences: Row,
  own: Row,
  filters: Row,
  now = new Date()
): boolean {
  if (!profile.is_active || profile.deleted_at || profile.id === own.id)
    return false;
  if (
    !inRange(
      age(profile.birth_date, now),
      filters.discover_age_min,
      filters.discover_age_max
    )
  )
    return false;
  if (
    !inRange(
      distance(own, profile),
      filters.discover_distance_min_km,
      filters.discover_distance_max_km
    )
  )
    return false;
  let genders = strings(filters.discover_genders).map((v) => gender(v));
  if (!genders.length && filters.discover_gender_id)
    genders = [gender(null, filters.discover_gender_id)];
  if (
    genders.length &&
    !genders.includes(gender(preferences.gender, profile.gender_id))
  )
    return false;
  if (
    smoking(filters.discover_smoking) !== "all" &&
    smoking(preferences.smoking) !== smoking(filters.discover_smoking)
  )
    return false;
  const diets = strings(filters.discover_diets);
  if (diets.length && !diets.includes(diet(preferences.vegetarian)))
    return false;
  const paths = [
    ...strings(preferences.spiritual_path),
    ...Object.keys(preferences.spiritual_path_details ?? {}),
  ].map(spiritual);
  if (
    strings(filters.discover_spiritual_paths).length &&
    !strings(filters.discover_spiritual_paths).some((v) =>
      paths.includes(spiritual(v))
    )
  )
    return false;
  const answerFilters = filters.discover_answer_filters ?? {};
  if (
    !answerFilters ||
    typeof answerFilters !== "object" ||
    Array.isArray(answerFilters)
  )
    return false;
  return Object.entries(answerFilters).every(([key, selected]) => {
    const choices = strings(selected);
    if (!choices.length) return true;
    if (key === "heightMin" || key === "heightMax") {
      const h = number(preferences.height_cm);
      return (
        h !== null &&
        h > 0 &&
        (key === "heightMin"
          ? h >= Number(choices[0])
          : h <= Number(choices[0]))
      );
    }
    const value =
      preferences.profile_answers?.[key] ??
      preferences[key] ??
      preferences[key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)];
    const values = typeof value === "string" ? [value] : strings(value);
    return choices.some((v) => values.includes(v));
  });
}
export function visibleActivity(
  row: Row,
  type: Category,
  joined: Set<string>,
  creators: Set<string>,
  now = Date.now()
) {
  if (!creators.has(row.created_by) || joined.has(row.id)) return false;
  if (type === "event")
    return (
      row.type === "event" &&
      new Date(row.starts_at).getTime() > now &&
      (row.capacity <= 0 || row.participant_count < row.capacity)
    );
  if (row.visibility !== "public") return false;
  const start = row.description?.match(/\[\[starts_at:([^\]]+)\]\]/)?.[1];
  if (start) {
    const day = new Date(start);
    if (!Number.isFinite(day.getTime())) return false;
    day.setUTCHours(0, 0, 0, 0);
    if (day.getTime() + Math.max(row.duration_days || 1, 1) * 86400000 <= now)
      return false;
  }
  return true;
}
export function preferenceContext(p: Row) {
  return {
    interests: strings(p.other_tags),
    spiritualPaths: strings(p.spiritual_path),
    purpose: strings(p.onboarding_purpose),
    lookingFor: strings(p.looking_for),
    hobbies: strings(p.profile_answers?.hobbies),
    favoritePlans: strings(p.profile_answers?.favoritePlans),
    languages: strings(p.languages),
  };
}
export function shortlist(
  candidates: Candidate[],
  preferences: Row,
  message: string
): Candidate[] {
  const terms =
    normalize(
      JSON.stringify(preferenceContext(preferences)) + " " + message
    ).match(/[a-z]{3,}/g) ?? [];
  const score = (c: Candidate) => {
    const haystack = normalize([c.title, c.description, ...c.tags].join(" "));
    return new Set(terms.filter((t) => haystack.includes(t))).size;
  };
  return CATEGORIES.flatMap((type) =>
    candidates
      .filter((c) => c.type === type)
      .sort(
        (a, b) =>
          score(b) - score(a) ||
          (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) ||
          a.id.localeCompare(b.id)
      )
      .slice(0, 24)
  );
}
export function parseModelResponse(
  raw: string,
  candidates: Candidate[],
  explicitCategory?: Category | null
) {
  let result: Row;
  try {
    result = JSON.parse(raw);
  } catch {
    throw new VibiError("invalid_model_response", 502);
  }
  if (
    !result ||
    typeof result !== "object" ||
    !text(result.text) ||
    typeof result.text !== "string" ||
    result.text.length > 2000 ||
    !Array.isArray(result.recommendations) ||
    result.recommendations.length > 3 ||
    !(result.category === null || isCategory(result.category))
  )
    throw new VibiError("invalid_model_response", 502);
  if (explicitCategory && result.category !== explicitCategory)
    throw new VibiError("invalid_model_response", 502);
  const seen = new Set<string>();
  const recommendations = result.recommendations.map((r: Row) => {
    if (!r || typeof r !== "object")
      throw new VibiError("invalid_model_response", 502);
    const candidate = candidates.find(
      (c) => c.id === r.id && c.type === result.category && c.type === r.type
    );
    if (!candidate || !text(r.reason, 300) || seen.has(r.id))
      throw new VibiError("invalid_model_response", 502);
    seen.add(r.id);
    return { ...candidate, reason: text(r.reason, 300) };
  });
  return {
    text: text(result.text),
    category: result.category as Category | null,
    recommendations,
  };
}
export const modelCatalog = (candidates: Candidate[]) =>
  candidates.map(({ thumbnail, distanceKm, ...c }) => c);
export function validateSend(body: Row) {
  if (
    !isUUID(body.conversation_id) ||
    !isUUID(body.request_id) ||
    typeof body.message !== "string" ||
    !body.message.trim() ||
    body.message.length > 2000 ||
    (body.category != null && !isCategory(body.category))
  )
    throw new VibiError("invalid_request");
  return {
    conversationId: body.conversation_id,
    requestId: body.request_id,
    message: body.message.trim(),
    category: body.category as Category | undefined,
  };
}
