import { QUESTION_GROUPS, type ProfileAnswers } from "./profileQuestions";

type Data = Record<string, any> | null | undefined;
const filled = (value: unknown): boolean =>
  Array.isArray(value)
    ? value.some(filled)
    : typeof value === "string" && value.trim().length > 0;

const PHOTO_SLOTS = 1;

export type ProfileMissingGroup = "photos" | "email" | "basics" | "identity" | "interests" | "plans";

/** Display order of the short "what's missing" summary. */
const GROUP_ORDER: ProfileMissingGroup[] = ["photos", "email", "basics", "identity", "interests", "plans"];
/** The three steps of the "Sobre mí" screen (ProfileQuestions tabs: Identidad, Intereses, Planes), in tab order. */
const QUESTION_GROUP_KEYS: ProfileMissingGroup[] = ["identity", "interests", "plans"];
const GROUP_COPY: Record<Exclude<ProfileMissingGroup, "photos">, string> = {
  email: "validar email",
  basics: "datos básicos",
  identity: "identidad",
  interests: "intereses",
  plans: "planes",
};
const MAX_SUMMARY_ITEMS = 2;
/** Questions the profile screens don't let users answer (kept in sync with ProfileQuestions' hiddenFields). */
const HIDDEN_PROFILE_QUESTION_KEYS: string[] = ["interestedIn", "lookingFor", "habits", "idealPlan", "talkAbout", "trySomething"];

const joinSpanish = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;

/** Short Spanish summary, e.g. "identidad, intereses y más" (shown after "Falta: "). */
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
export type ProfileCompletionOptions = {
  /**
   * When false, email validation is left out of `percent`/`completed`/`total`
   * (and `nextLabel`/`nextScreen`) but still listed in `missingSummary`.
   */
  emailCountsInPercent?: boolean;
};

/** Navigation params for the first missing item; `now` makes the photo request unique. */
export const nextProfileParams = (
  completion: { nextOpensPhotoPicker: boolean; nextQuestionGroup?: number },
  now = Date.now()
) =>
  completion.nextOpensPhotoPicker
    ? { photoRequestId: now }
    : typeof completion.nextQuestionGroup === "number"
      ? { initialGroup: completion.nextQuestionGroup }
      : undefined;

export const getProfileCompletion = (
  profile: Data,
  preferences: Data,
  emailVerified = false,
  answers?: ProfileAnswers,
  { emailCountsInPercent = true }: ProfileCompletionOptions = {}
) => {
  const photos = [...new Set<string>((profile?.photos ?? [])
    .map((photo: any) => typeof photo === "string" ? photo : photo?.url)
    .filter((url: unknown): url is string => typeof url === "string" && !!url.trim())
    .map((url: string) => url.trim()))].slice(0, PHOTO_SLOTS);
  const allFields: { label: string; value: unknown; screen: string; group: ProfileMissingGroup }[] = [
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
      group: "identity",
    },
    {
      label: "Me trae a Vibes",
      value: preferences?.openTo ?? preferences?.open_to,
      screen: "ProfileQuestions",
      group: "plans",
    },
    {
      label: "Prácticas",
      value: preferences?.spiritualPath ?? preferences?.spiritual_path,
      screen: "ProfileQuestions",
      group: "interests",
    },
    {
      label: "Fecha de nacimiento",
      value: profile?.birthDate ?? profile?.birth_date,
      screen: "EditProfile",
      group: "basics",
    },
    ...QUESTION_GROUPS.flatMap((group, groupIndex) => group.fields.filter(field => !HIDDEN_PROFILE_QUESTION_KEYS.includes(field.key)).map((field) => {
      const stored = preferences?.profileAnswers ?? preferences?.profile_answers;
      const snakeKey = field.key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      // Canonical columns take precedence over legacy JSON, including cleared values.
      const canonical = ["gender", "lookingFor", "personality", "languages"].includes(field.key);
      const value = canonical && preferences && (field.key in preferences || snakeKey in preferences)
        ? preferences[field.key] ?? preferences[snakeKey] ?? ""
        : answers?.[field.key] ?? stored?.[field.key];
      // ProfileQuestions shows "Planes favoritos" inside the Planes step (favoritePlansInPlans).
      const missingGroup = field.key === "favoritePlans" ? "plans" : QUESTION_GROUP_KEYS[groupIndex] ?? "plans";
      return { label: field.label, value, screen: "ProfileQuestions", group: missingGroup };
    })),
  ];
  const fields = emailCountsInPercent ? allFields : allFields.filter((field) => field.group !== "email");
  const allMissing = allFields.filter((field) => !filled(field.value));
  const missing = fields.filter((field) => !filled(field.value));
  const nextTarget = [...allMissing].sort(
    (a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group)
  )[0];
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
    /** Same fields that drive `percent` (plus email when excluded from it); empty only when nothing is missing. */
    missingSummary: summarizeMissing(allMissing),
    /** Screen for the first missing item in summary order (email included even when excluded from the %). */
    nextScreen: nextTarget?.screen ?? "ProfileQuestions",
    /** True when the first missing item is a photo: open EditProfile's photo picker via `photoRequestId`. */
    nextOpensPhotoPicker: nextTarget?.group === "photos",
    /** ProfileQuestions tab (0 Identidad, 1 Intereses, 2 Planes) of the first missing item, when it lives there. */
    nextQuestionGroup: nextTarget && QUESTION_GROUP_KEYS.includes(nextTarget.group)
      ? QUESTION_GROUP_KEYS.indexOf(nextTarget.group)
      : undefined,
  };
};
