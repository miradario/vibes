import { QUESTION_GROUPS, type ProfileAnswers } from "./profileQuestions";

type Data = Record<string, any> | null | undefined;
const filled = (value: unknown): boolean =>
  Array.isArray(value)
    ? value.some(filled)
    : typeof value === "string" && value.trim().length > 0;

/** Each onboarding field counts once; extra photos and conditional practice details do not. */
export const getProfileCompletion = (profile: Data, preferences: Data, emailVerified = false, answers?: ProfileAnswers) => {
  const fields = [
    { label: "Validar email", value: emailVerified ? "verified" : "", screen: "EditProfile" },
    {
      label: "Nombre",
      value: profile?.displayName ?? profile?.display_name,
      screen: "EditProfile",
    },
    {
      label: "Foto",
      value: (profile?.photos ?? []).map((photo: any) =>
        typeof photo === "string" ? photo : photo?.url
      ),
      screen: "EditProfile",
    },
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
  return {
    completed,
    total: fields.length,
    percent: Math.round((completed / fields.length) * 100),
    nextLabel: missing[0]?.label,
    nextScreen: missing[0]?.screen ?? "ProfileQuestions",
  };
};
