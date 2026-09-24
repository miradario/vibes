type Data = Record<string, any> | null | undefined;
const filled = (value: unknown): boolean =>
  Array.isArray(value)
    ? value.some(filled)
    : typeof value === "string" && value.trim().length > 0;

/** A short, predictable checklist of the profile information shown to others. */
export const getProfileCompletion = (profile: Data, preferences: Data, emailVerified = false) => {
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
    { label: "Género", value: preferences?.gender, screen: "ProfileQuestions" },
    {
      label: "Qué buscás",
      value: preferences?.lookingFor ?? preferences?.looking_for,
      screen: "ProfileQuestions",
    },
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
