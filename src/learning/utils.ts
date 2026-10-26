import type {
  LearningActivity,
  LearningData,
  LearningSession,
  Modality,
} from "./types";
export const modalityLabels: Record<Modality, string> = {
  in_person: "Presencial",
  online: "Online",
  mixed: "Presencial y online",
};
export const statusLabels = {
  draft: "Borrador",
  published: "Publicada",
  cancelled: "Cancelada",
  completed: "Finalizada",
  confirmed: "Inscripción confirmada",
};
export function sessionsFor(data: LearningData, id: string): LearningSession[] {
  return data.sessions
    .filter((s) => s.activity_id === id)
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
}
export function formatSession(s: LearningSession, timezone: string) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: timezone,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(s.starts_at));
}
export function priceLabel(a: Pick<LearningActivity, "price" | "currency">) {
  return Number(a.price) === 0
    ? "Gratis"
    : new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: a.currency,
      }).format(Number(a.price));
}
// Parse a wall-clock date in the selected IANA timezone; reject nonexistent DST times.
export function zonedDateToISO(value: string, timezone: string): string {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value))
    throw Error("Usá el formato AAAA-MM-DD HH:mm.");
  const [year, month, day, hour, minute] = value.match(/\d+/g)!.map(Number);
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  let instant = wall;
  for (let i = 0; i < 3; i++) {
    const p = Object.fromEntries(
      fmt
        .formatToParts(new Date(instant))
        .filter((p) => p.type !== "literal")
        .map((p) => [p.type, Number(p.value)])
    );
    instant += wall - Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  }
  const p = Object.fromEntries(
    fmt
      .formatToParts(new Date(instant))
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, Number(p.value)])
  );
  if (
    p.year !== year ||
    p.month !== month ||
    p.day !== day ||
    p.hour !== hour ||
    p.minute !== minute
  )
    throw Error("La fecha u hora no existe en esa zona horaria.");
  return new Date(instant).toISOString();
}
export function wallDate(iso: string, timezone: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value])
  );
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}
export type LearningFilters = {
  query: string;
  specialty: string;
  modality: string;
  location: string;
  date: string;
};
export function matchesActivity(
  a: LearningActivity,
  data: LearningData,
  f: LearningFilters,
  now = Date.now()
) {
  const teachers = data.profiles.filter((p) => a.teacher_ids.includes(p.id));
  const place = data.profiles.find((p) => p.id === a.place_id);
  const text = [
    a.title,
    a.description,
    a.location,
    place?.name,
    ...teachers.map((p) => p.name),
  ]
    .join(" ")
    .toLocaleLowerCase();
  const upcoming = sessionsFor(data, a.id).filter(
    (s) => Date.parse(s.ends_at) > now
  );
  return (
    a.status === "published" &&
    upcoming.length > 0 &&
    text.includes(f.query.trim().toLocaleLowerCase()) &&
    (!f.specialty ||
      teachers.some((p) => p.specialties.includes(f.specialty))) &&
    (!f.modality || a.modality === f.modality || a.modality === "mixed") &&
    (!f.location ||
      a.location
        .toLocaleLowerCase()
        .includes(f.location.trim().toLocaleLowerCase())) &&
    (!f.date ||
      upcoming.some((s) =>
        wallDate(s.starts_at, a.timezone).startsWith(f.date)
      ))
  );
}
const messages: Record<string, string> = {
  LEARNING_DISABLED: "Esta sección todavía no está habilitada en el servidor.",
  AUTH_REQUIRED: "Iniciá sesión para continuar.",
  FORBIDDEN: "No tenés permiso para realizar esta acción.",
  FORBIDDEN_TEACHER: "No tenés permiso para usar ese profesor.",
  FORBIDDEN_PLACE: "El profesor y el lugar deben estar vinculados.",
  PAYMENT_UNAVAILABLE:
    "El pago con Mercado Pago todavía no está disponible. No se confirmó ninguna reserva paga.",
  FULL_CAPACITY: "Se ocupó el último cupo. Elegí otra actividad.",
  NOT_PUBLISHED: "Esta actividad ya no está disponible.",
  ENROLLMENT_CLOSED: "La inscripción cerró porque la actividad ya comenzó.",
  CANCELLATION_CLOSED: "Solo podés cancelar antes del primer encuentro.",
  ATTENDANCE_NOT_STARTED:
    "Podés registrar asistencia cuando empiece el encuentro.",
  INVALID_ENROLLMENT: "La inscripción no está activa para este encuentro.",
  INVALID_TRANSITION: "Ese cambio de estado no está permitido.",
  ACTIVITY_NOT_ENDED: "La actividad todavía no terminó.",
  ACTIVITY_CLOSED: "Esta actividad está cerrada.",
  PUBLISH_PROFILES_FIRST:
    "Publicá primero los perfiles del responsable, profesores y lugar.",
  FUTURE_DATE_REQUIRED: "Los encuentros deben comenzar en el futuro.",
  ENROLLED_DETAILS_LOCKED:
    "Con inscripciones, solo podés editar título, descripción, imagen y cupos.",
  ENROLLED_SCHEDULE_LOCKED:
    "No podés cambiar encuentros que ya tienen inscripciones.",
  CAPACITY_BELOW_ENROLLED:
    "Los cupos no pueden ser menores a las inscripciones confirmadas.",
  LOCATION_REQUIRED: "Agregá una ubicación para actividades presenciales.",
  INVALID_TIMEZONE: "Ingresá una zona horaria IANA válida.",
  INVALID_SESSIONS:
    "Una clase necesita un encuentro y un curso al menos dos. Revisá las fechas y duración.",
  OVERLAPPING_SESSIONS: "Los encuentros no pueden superponerse.",
  TEACHER_REQUIRED: "Elegí al menos un profesor.",
  INVALID_IMAGE: "La imagen debe ser una URL HTTPS.",
};
export function learningError(error: unknown) {
  const raw =
    error instanceof Error
      ? error.message
      : String((error as any)?.message ?? error);
  for (const [code, message] of Object.entries(messages))
    if (raw.includes(code)) return message;
  if (/does not exist|schema cache|Could not find/.test(raw))
    return "Falta instalar la migración de Clases y espacios en este entorno.";
  if (/constraint|invalid input|not-null/.test(raw))
    return "Revisá los campos obligatorios, cupos, precio y fechas.";
  if (/network|fetch/i.test(raw))
    return "No se pudo conectar. Revisá tu conexión e intentá nuevamente.";
  return raw || "No se pudo completar la acción. Intentá nuevamente.";
}
