// Pure helpers for the "Clases / Sesiones / Actividades" tab, driven by the `clases` and
// `sesiones` flags. Kept free of React so scripts/*.test.cjs can load it directly.
export type ActivitiesFlags = { clases: boolean; sesiones: boolean };
export type ActivitiesKind = "classes" | "sessions";

export function activitiesTabLabel({ clases, sesiones }: ActivitiesFlags): string {
  if (clases && sesiones) return "Actividades";
  if (sesiones) return "Sesiones";
  return "Clases";
}

export function activitiesTabVisible({ clases, sesiones }: ActivitiesFlags): boolean {
  return clases || sesiones;
}

/** Kinds offered in the tab and in Mis reservas, in display order. */
export function activitiesKinds({ clases, sesiones }: ActivitiesFlags): ActivitiesKind[] {
  return [...(clases ? ["classes" as const] : []), ...(sesiones ? ["sessions" as const] : [])];
}

const KIND_LABELS: Record<ActivitiesKind, string> = { classes: "Clases", sessions: "Sesiones" };
/** Main switcher of the tab: Clases / Sesiones only when both kinds are on, none otherwise. */
export function activitiesSwitcherOptions(kinds: ActivitiesKind[]): { key: ActivitiesKind; label: string }[] {
  return kinds.length > 1 ? kinds.map((key) => ({ key, label: KIND_LABELS[key] })) : [];
}

/** `section: "mine"` (Home, SessionDetail) opens the Mis reservas sheet. */
export function opensReservations(params: unknown): boolean {
  return !!params && typeof params === "object" && (params as { section?: unknown }).section === "mine";
}

// Teacher/place management (LearningManage, editors, roster) lives in the web portal.
// The in-app screens stay in the code base but are hidden unless this build flag is on.
export const teacherManagementInApp =
  process.env.EXPO_PUBLIC_APP_TEACHER_MANAGEMENT === "true";
