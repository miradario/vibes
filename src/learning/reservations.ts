import { wallDate, zonedDateToISO } from "./utils";
export const RESERVATION_TIMEZONE = "America/Argentina/Buenos_Aires";
export const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export type ReservationSource = {
  id: string;
  timezone?: string;
  weekly?: { day: number; time: string }[];
  sessions?: { starts_at: string }[];
};
export type ReservationRequest = {
  id: string; source_id: string; title: string; mode: "single" | "monthly";
  month: string; starts_at: string[]; status: "pending_confirmation" | "cancelled";
};
export function reservationMonths(now = Date.now(), timezone = RESERVATION_TIMEZONE) {
  const [year, month] = wallDate(new Date(now).toISOString(), timezone).slice(0, 7).split("-").map(Number);
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 + index, 1));
    return date.toISOString().slice(0, 7) + "-01";
  });
}
export function reservationDates(source: ReservationSource, month: string, now = Date.now()) {
  const timezone = source.timezone ?? RESERVATION_TIMEZONE;
  let dates = source.sessions?.map(session => session.starts_at) ?? [];
  if (source.weekly) {
    dates = [];
    const [year, m] = month.split("-").map(Number);
    const days = new Date(Date.UTC(year, m, 0)).getUTCDate();
    for (let d = 1; d <= days; d++) {
      const date = new Date(Date.UTC(year, m - 1, d));
      for (const slot of source.weekly) {
        if (date.getUTCDay() === slot.day) dates.push(zonedDateToISO(`${date.toISOString().slice(0, 10)} ${slot.time}`, timezone));
      }
    }
  }
  return [...new Set(dates)].filter(iso => Date.parse(iso) > now && wallDate(iso, timezone).startsWith(month.slice(0, 7))).sort();
}
export function reservationWeekday(iso: string, timezone = RESERVATION_TIMEZONE) {
  return new Date(wallDate(iso, timezone).slice(0, 10) + "T12:00:00Z").getUTCDay();
}
export function reservationDateLabel(iso: string, timezone = RESERVATION_TIMEZONE) {
  return new Date(iso).toLocaleString("es-AR", { timeZone: timezone, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
}
