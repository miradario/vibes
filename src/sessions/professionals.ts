// Pure helpers for the professionals list (active availability, specialty filter + search).
import { freeRanges, type AvailabilityWindow } from "./sessions";

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

/**
 * Organizers with active session availability: an active window (the scheduler only returns
 * active ones) that still has free time from now on, the same windows ProfessionalDetail books.
 */
export function organizersWithAvailability(windows: AvailabilityWindow[], now = Date.now()): Set<string> {
  return new Set(windows.filter((window) => freeRanges(window, now).length > 0).map((window) => window.organizer_id));
}

export function withActiveAvailability<T extends { id: string }>(profiles: T[], organizerIds: Set<string>): T[] {
  return profiles.filter((profile) => organizerIds.has(profile.id));
}
