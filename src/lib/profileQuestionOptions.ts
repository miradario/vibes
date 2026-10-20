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

