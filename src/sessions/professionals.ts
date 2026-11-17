// Pure helpers for the professionals list (specialty filter + search).
export type ProfessionalLike = { name: string; description?: string; specialties: string[] };

export function professionalSpecialties(profiles: ProfessionalLike[]): string[] {
  return [...new Set(profiles.flatMap((profile) => profile.specialties.map((value) => value.trim()).filter(Boolean)))].sort((a, b) => a.localeCompare(b, "es"));
}

export function filterProfessionals<T extends ProfessionalLike>(profiles: T[], specialty: string, query: string): T[] {
  const needle = query.trim().toLocaleLowerCase();
  return profiles.filter((profile) =>
    (!specialty || profile.specialties.some((value) => value.trim() === specialty)) &&
    (!needle || `${profile.name} ${profile.description ?? ""} ${profile.specialties.join(" ")}`.toLocaleLowerCase().includes(needle))
  );
}
