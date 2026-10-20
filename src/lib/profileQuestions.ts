import { supabase } from "./supabase";
import { assertAcceptableContent } from "./moderation";

export type ProfileAnswers = Record<string, string | string[]>;
import { QUESTION_GROUPS } from "./profileQuestionOptions";
export { QUESTION_GROUPS } from "./profileQuestionOptions";

export const hasMissingProfileAnswers = (answers?: ProfileAnswers | null) =>
  QUESTION_GROUPS.some((group) =>
    group.fields.some((field) => field.key !== "interestedIn" && !answers?.[field.key]?.length)
  );

export const readProfileAnswers = async (
  userId: string
): Promise<ProfileAnswers> => {
  const publicResult = await supabase
    .from("user_preferences")
    .select("profile_answers, gender, looking_for, personality, languages, vegetarian, smoking")
    .eq("user_id", userId)
    .maybeSingle();
  if (publicResult.error) throw publicResult.error;
  const profile = publicResult.data;
  const { availability: _legacyAvailability, ...publicAnswers } = profile?.profile_answers ?? {};
  return {
    ...publicAnswers,
    diet: ({"Sí":"Vegetariana", "Vegetariano":"Vegetariana", "Vegano":"Vegana", "No":"Omnívora (como de todo)", "Pescetariano":"Pescetariana"} as Record<string,string>)[profile?.vegetarian ?? ""] ?? publicAnswers.diet ?? "",
    smoking: profile?.smoking ?? publicAnswers.smoking ?? "",
    gender: profile?.gender ?? "",
    lookingFor: profile?.looking_for ?? [],
    personality: profile?.personality ?? "",
    languages: profile?.languages ?? [],
  };
};

export const saveProfileAnswers = async (
  userId: string,
  answers: ProfileAnswers
) => {
  const { availability = "", ...publicAnswers } = answers;
  assertAcceptableContent(Object.values(publicAnswers).flat());
  const { error } = await supabase.from("user_preferences").upsert(
    {
      user_id: userId,
      profile_answers: publicAnswers,
      ...("diet" in answers ? {vegetarian: ({Vegetariana:"Sí", Vegana:"Vegano", Omnívora:"No", "Omnívora (como de todo)":"No", Pescetariana:"Pescetariano"} as Record<string,string>)[String(answers.diet)] ?? null} : {}),
      ...("smoking" in answers ? {smoking: answers.smoking || null} : {}),
      gender: answers.gender || null,
      looking_for: Array.isArray(answers.lookingFor) ? answers.lookingFor : [],
      personality: answers.personality || null,
      languages: Array.isArray(answers.languages) ? answers.languages : [],
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
};

export const localDayKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
export const MOODS = [
  "Calmado",
  "Abierto",
  "Reflexivo",
  "Curioso",
  "Social",
  "Óptimo",
  "Triste",
  "Ansioso",
  "Cansado",
  "Frustrado",
];
