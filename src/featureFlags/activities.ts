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

/** Kinds offered inside Explorar / Mis reservas, in display order. */
export function activitiesKinds({ clases, sesiones }: ActivitiesFlags): ActivitiesKind[] {
  return [...(clases ? ["classes" as const] : []), ...(sesiones ? ["sessions" as const] : [])];
}

// Teacher/place management (LearningManage, editors, roster) lives in the web portal.
// The in-app screens stay in the code base but are hidden unless this build flag is on.
export const teacherManagementInApp =
  process.env.EXPO_PUBLIC_APP_TEACHER_MANAGEMENT === "true";
