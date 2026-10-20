import { supabase } from "./supabase";
import { assertAcceptableContent } from "./moderation";

export type ProfileAnswers = Record<string, string | string[]>;
export const QUESTION_GROUPS = [
  {
    title: "Un poco más sobre vos",
    fields: [
      {
        key: "gender",
        label: "Género",
        options: ["Hombre", "Mujer", "Otro"],
        single: true,
      },
      {
        key: "lookingFor",
        label: "¿Qué buscás?",
        options: ["Amistad", "Citas", "Conocer gente", "Compartir actividades"],
      },
      {
        key: "personality",
        label: "Personalidad",
        options: ["Introvertido", "Medio", "Extrovertido"],
        single: true,
      },
      {
        key: "diet",
        label: "Tipo de alimentación",
        options: ["Vegetariana", "Vegana", "Pescetariana", "Omnívora (como de todo)"],
        single: true,
      },
      {
        key: "smoking",
        label: "Fumador",
        options: ["Sí", "No", "A veces"],
        single: true,
      },
      {
        key: "alcohol",
        label: "Tomo alcohol",
        options: ["Sí", "No", "A veces"],
        single: true,
      },
      {
        key: "interestedIn",
        label: "Estoy interesado en:",
        options: ["Hombre", "Mujer", "Todos"],
        single: true,
      },
    ],
  },
  {
    title: "Lo que disfrutás",
    fields: [
      {
        key: "hobbies",
        label: "Intereses y hobbies",
        options: [
          "Música",
          "Deportes",
          "Viajes",
          "Arte",
          "Gaming",
          "Gastronomía",
        ],
      },
      {
        key: "favoritePlans",
        label: "Planes favoritos",
        options: ["Café", "Salir a comer", "Salir a tomar algo", "Caminar", "Fiestas", "Aire libre"],
      },
      {
        key: "activity",
        label: "Actividad física",
        options: ["Frecuente", "Ocasional", "Poca actividad"],
        single: true,
      },
      {
        key: "pets",
        label: "Mascotas",
        options: ["Perros", "Gatos", "Otras", "No tengo"],
      },
      {
        key: "habits",
        label: "Hábitos y horarios",
        placeholder: "Cómo es tu día a día",
      },
      {
        key: "languages",
        label: "Idiomas",
        options: [
          "Español",
          "Inglés",
          "Portugués",
          "Italiano",
          "Francés",
          "Alemán",
          "Otros",
        ],
      },
    ],
  },
  {
    title: "Tus planes, a tu manera",
    fields: [
      {
        key: "idealPlan",
        label: "Mi plan ideal es…",
        placeholder: "Contanos tu plan ideal",
      },
      {
        key: "talkAbout",
        label: "Podría hablar durante horas de…",
        placeholder: "Eso que te apasiona",
      },
      {
        key: "trySomething",
        label: "Algo que me gustaría probar es…",
        placeholder: "Una experiencia nueva",
      },
    ],
  },
] as const;

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
