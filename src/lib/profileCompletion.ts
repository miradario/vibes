import { QUESTION_GROUPS, type ProfileAnswers } from "./profileQuestions";

type Data = Record<string, any> | null | undefined;
const filled = (value: unknown): boolean =>
  Array.isArray(value)
    ? value.some(filled)
    : typeof value === "string" && value.trim().length > 0;

const PHOTO_SLOTS = 6;
const PHOTO_WEIGHT = 40;

/** Photos contribute 40%; all other onboarding fields share the remaining 60%. */
export const getProfileCompletion = (profile: Data, preferences: Data, emailVerified = false, answers?: ProfileAnswers) => {
  const photos = [...new Set<string>((profile?.photos ?? [])
    .map((photo: any) => typeof photo === "string" ? photo : photo?.url)
    .filter((url: unknown): url is string => typeof url === "string" && !!url.trim())
    .map((url: string) => url.trim()))].slice(0, PHOTO_SLOTS);
  const fields = [
    { label: "Validar email", value: emailVerified ? "verified" : "", screen: "EditProfile" },
    {
      label: "Nombre",
      value: profile?.displayName ?? profile?.display_name,
      screen: "EditProfile",
    },
    ...Array.from({ length: PHOTO_SLOTS }, (_, index) => ({
      label: `Agregar foto ${index + 1} de ${PHOTO_SLOTS}`,
      value: photos[index],
      screen: "EditProfile",
    })),
    {
      label: "Ubicación",
      value: profile?.locationLabel ?? profile?.location_label ?? profile?.city,
      screen: "EditProfile",
    },
    {
      label: "Sobre mí",
      value: preferences?.aboutMe ?? preferences?.about_me,
      screen: "Settings",
    },
    {
      label: "Me trae a Vibes",
      value: preferences?.openTo ?? preferences?.open_to,
      screen: "Settings",
    },
    {
      label: "Prácticas",
      value: preferences?.spiritualPath ?? preferences?.spiritual_path,
      screen: "Settings",
    },
    {
      label: "Fecha de nacimiento",
      value: profile?.birthDate ?? profile?.birth_date,
      screen: "EditProfile",
    },
    ...QUESTION_GROUPS.flatMap((group) => group.fields.map((field) => {
      const stored = preferences?.profileAnswers ?? preferences?.profile_answers;
      const snakeKey = field.key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      // Canonical columns take precedence over legacy JSON, including cleared values.
      const canonical = ["gender", "lookingFor", "personality", "languages"].includes(field.key);
      const value = canonical && preferences && (field.key in preferences || snakeKey in preferences)
        ? preferences[field.key] ?? preferences[snakeKey] ?? ""
        : answers?.[field.key] ?? (field.key === "availability" ? "" : stored?.[field.key]);
      return { label: field.label, value, screen: "ProfileQuestions" };
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
    nextScreen: missing[0]?.screen ?? "ProfileQuestions",
  };
};
