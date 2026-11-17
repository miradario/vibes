import { sessionNeedsStudent, upcomingSessions, type StudentSession } from "./sessions";

type ClassBooking = { id: string; title: string; starts_at: string; ends_at: string; status: string; timezone?: string };

export type HomeActivities<C extends ClassBooking> = {
  nextClass: C | null;
  nextSession: StudentSession | null;
  toConfirm: number;
  toPay: number;
};

/** "Próximas actividades" on Home: next class booking, next session and what needs the student. */
export function homeActivities<C extends ClassBooking>(sessions: StudentSession[], classes: C[], now = Date.now()): HomeActivities<C> {
  const upcoming = upcomingSessions(sessions, now);
  const nextClass = classes
    .filter((item) => item.status === "confirmed" && Date.parse(item.ends_at) > now)
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))[0] ?? null;
  return {
    nextClass,
    nextSession: upcoming[0] ?? null,
    toConfirm: upcoming.filter((item) => sessionNeedsStudent(item, now) === "confirm").length,
    toPay: upcoming.filter((item) => sessionNeedsStudent(item, now) === "pay").length,
  };
}

export function homeActivitiesNotice(toConfirm: number, toPay: number): string | null {
  const parts = [
    toConfirm ? `${toConfirm} ${toConfirm === 1 ? "sesión para confirmar" : "sesiones para confirmar"}` : "",
    toPay ? `${toPay} ${toPay === 1 ? "sesión con pago pendiente" : "sesiones con pago pendiente"}` : "",
  ].filter(Boolean);
  return parts.length ? `Tenés ${parts.join(" y ")}.` : null;
}
