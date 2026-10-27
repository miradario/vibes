import { QUESTION_GROUPS, type ProfileAnswers } from "./profileQuestions";

type Data = Record<string, any> | null | undefined;
const filled = (value: unknown): boolean =>
  Array.isArray(value)
    ? value.some(filled)
    : typeof value === "string" && value.trim().length > 0;

const PHOTO_SLOTS = 1;

export type ProfileMissingGroup = "photos" | "email" | "basics" | "aboutMe" | "identity" | "interests" | "plans";

/** Display order of the short "what's missing" summary. */
const GROUP_ORDER: ProfileMissingGroup[] = ["photos", "email", "basics", "aboutMe", "identity", "interests", "plans"];
const QUESTION_GROUP_KEYS: ProfileMissingGroup[] = ["identity", "interests", "plans"];
const GROUP_COPY: Record<Exclude<ProfileMissingGroup, "photos">, string> = {
  email: "validar email",
  basics: "completar datos básicos",
  aboutMe: "completar sobre mí",
  identity: "completar sobre vos",
  interests: "completar intereses",
  plans: "completar planes",
};
const MAX_SUMMARY_ITEMS = 3;

const joinSpanish = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;

/** Short Spanish summary, e.g. "2 fotos, validar email y completar intereses". */
export const summarizeMissing = (missing: { group: ProfileMissingGroup }[]) => {
  const counts = new Map<ProfileMissingGroup, number>();
  missing.forEach(({ group }) => counts.set(group, (counts.get(group) ?? 0) + 1));
  const items = GROUP_ORDER.filter((group) => counts.has(group)).map((group) => {
    if (group !== "photos") return GROUP_COPY[group];
    const count = counts.get(group)!;
    return `${count} ${count === 1 ? "foto" : "fotos"}`;
  });
  if (items.length > MAX_SUMMARY_ITEMS) return `${items.slice(0, MAX_SUMMARY_ITEMS).join(", ")} y más`;
  return joinSpanish(items);
};
const PHOTO_WEIGHT = 40;

/** Photos contribute 40%; all other onboarding fields share the remaining 60%. */
export const getProfileCompletion = (profile: Data, preferences: Data, emailVerified = false, answers?: ProfileAnswers) => {
  const photos = [...new Set<string>((profile?.photos ?? [])
    .map((photo: any) => typeof photo === "string" ? photo : photo?.url)
    .filter((url: unknown): url is string => typeof url === "string" && !!url.trim())
    .map((url: string) => url.trim()))].slice(0, PHOTO_SLOTS);
  const fields: { label: string; value: unknown; screen: string; group: ProfileMissingGroup }[] = [
    { label: "Validar email", value: emailVerified ? "verified" : "", screen: "EditProfile", group: "email" },
    {
      label: "Nombre",
      value: profile?.displayName ?? profile?.display_name,
      screen: "EditProfile",
      group: "basics",
    },
    ...Array.from({ length: PHOTO_SLOTS }, (_, index) => ({
      label: `Agregar foto ${index + 1} de ${PHOTO_SLOTS}`,
      value: photos[index],
      screen: "EditProfile",
      group: "photos" as const,
    })),
    {
      label: "Ubicación",
      value: profile?.locationLabel ?? profile?.location_label ?? profile?.city,
      screen: "EditProfile",
      group: "basics",
    },
    {
      label: "Sobre mí",
      value: preferences?.aboutMe ?? preferences?.about_me,
      screen: "ProfileQuestions",
      group: "aboutMe",
    },
    {
      label: "Me trae a Vibes",
      value: preferences?.openTo ?? preferences?.open_to,
      screen: "ProfileQuestions",
      group: "aboutMe",
    },
    {
      label: "Prácticas",
      value: preferences?.spiritualPath ?? preferences?.spiritual_path,
      screen: "ProfileQuestions",
      group: "aboutMe",
    },
    {
      label: "Fecha de nacimiento",
      value: profile?.birthDate ?? profile?.birth_date,
      screen: "EditProfile",
      group: "basics",
    },
    ...QUESTION_GROUPS.flatMap((group, groupIndex) => group.fields.filter(field => !["interestedIn", "lookingFor", "habits"].includes(field.key)).map((field) => {
      const stored = preferences?.profileAnswers ?? preferences?.profile_answers;
      const snakeKey = field.key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      // Canonical columns take precedence over legacy JSON, including cleared values.
      const canonical = ["gender", "lookingFor", "personality", "languages"].includes(field.key);
      const value = canonical && preferences && (field.key in preferences || snakeKey in preferences)
        ? preferences[field.key] ?? preferences[snakeKey] ?? ""
        : answers?.[field.key] ?? stored?.[field.key];
      return { label: field.label, value, screen: "ProfileQuestions", group: QUESTION_GROUP_KEYS[groupIndex] ?? "plans" };
    })),
  ];
  const missing = fields.filter((field) => !filled(field.value));
  const completed = fields.length - missing.length;
  const otherTotal = fields.length - PHOTO_SLOTS;
  const otherCompleted = completed - photos.length;
  return {
    completed,
    total: fields.length,
    percent: Math.round(
      (photos.length / PHOTO_SLOTS) * PHOTO_WEIGHT +
      (otherCompleted / otherTotal) * (100 - PHOTO_WEIGHT)
    ),
    nextLabel: missing[0]?.label,
    /** Same fields that drive `percent`; empty string at 100%. */
    missingSummary: summarizeMissing(missing),
    nextScreen: missing[0]?.screen ?? "ProfileQuestions",
  };
};
