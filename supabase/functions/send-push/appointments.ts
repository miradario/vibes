// Session (turno) pushes. The DB trigger private.notify_appointment_push() (draft migration,
// not applied yet) resolves the recipient and posts table "appointment_notifications".
export const APPOINTMENT_EVENTS = ["invited", "confirmed", "updated", "cancelled"] as const;
export type AppointmentEvent = (typeof APPOINTMENT_EVENTS)[number];

const TIMEZONE = "America/Argentina/Buenos_Aires";

const text = (value: unknown, max = 80) => {
  const clean = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
};

export const appointmentWhen = (iso: unknown, timezone: unknown = TIMEZONE) => {
  const date = new Date(String(iso ?? ""));
  if (Number.isNaN(date.getTime())) return "";
  const zone = typeof timezone === "string" && timezone ? timezone : TIMEZONE;
  try {
    const parts = new Intl.DateTimeFormat("es-AR", {
      timeZone: zone, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(date);
    const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
    return `${part("weekday")} ${part("day")} de ${part("month")} a las ${part("hour")}:${part("minute")}`;
  } catch {
    return date.toISOString().slice(0, 16).replace("T", " ");
  }
};

export const appointmentCopy = (event: AppointmentEvent, record: Record<string, unknown>) => {
  const title = text(record.title) || "tu sesión";
  const organizer = text(record.organizer_name, 40) || "Tu profesional";
  const when = appointmentWhen(record.starts_at, record.timezone);
  const at = when ? ` el ${when}` : "";
  switch (event) {
    case "invited":
      return { title: "Tenés una sesión para confirmar", body: `${organizer} te agendó "${title}"${at}. Confirmala en Vibes.` };
    case "confirmed":
      return { title: "Sesión confirmada", body: `"${title}" quedó confirmada${at}.` };
    case "updated":
      return { title: "Cambió tu sesión", body: `"${title}" ahora es${at}. Revisá los detalles.` };
    case "cancelled":
      return { title: "Sesión cancelada", body: `${organizer} canceló "${title}"${at}.` };
  }
};

export const buildAppointmentNotifications = (record: Record<string, unknown>) => {
  const event = String(record.event ?? "") as AppointmentEvent;
  const recipientId = typeof record.recipient_id === "string" ? record.recipient_id : "";
  const sessionId = typeof record.session_id === "string" ? record.session_id : "";
  if (!APPOINTMENT_EVENTS.includes(event) || !recipientId || !sessionId) return [];
  const copy = appointmentCopy(event, record);
  return [{ recipientId, title: copy.title, body: copy.body, data: { type: `appointment_${event}`, sessionId } }];
};
