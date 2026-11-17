// Student side of one-to-one sessions ("sesiones" = turnos) booked against the portal
// scheduler (private.appointment_* via portal_scheduler / portal_student_sessions).
// Pure module: no React, no Supabase import, so scripts/sessions.test.cjs can load it.
export const SESSION_TIMEZONE = "America/Argentina/Buenos_Aires";
// The portal stores and validates appointment times in Argentina (UTC-3, no DST).
const AR_OFFSET = "-03:00";

export type BusyRange = { starts_at: string; ends_at: string };
export type AvailabilityWindow = {
  id: string;
  organizer_id: string;
  organizer_name?: string;
  title: string;
  location: string;
  starts_at: string;
  ends_at: string;
  busy: BusyRange[];
};
export type SessionAwaiting = "student" | "facilitator" | "payment" | null;
export type SessionPaymentMethod = "mercadopago" | "cash" | "transfer";
/** Price and payment methods the facilitator set for a service (organizer + title + location). */
export type ServicePricing = {
  title: string;
  location: string;
  price: number;
  currency?: string;
  payment_methods: SessionPaymentMethod[];
  payment_instructions?: string;
};
export type SessionPaymentStatus = "pending" | "paid" | "free" | "refunded" | "cancelled" | null;
export type StudentSession = {
  id: string;
  status: "pending" | "confirmed" | "cancelled";
  title: string;
  starts_at: string;
  ends_at: string;
  location: string;
  organizer_id: string;
  organizer_name: string;
  outside_availability?: boolean;
  /** From portal_student_sessions; inferred when the RPC is not deployed yet. */
  awaiting?: SessionAwaiting;
  created_by_me?: boolean;
  order_id?: string | null;
  amount?: number | null;
  currency?: string | null;
  payment_status?: SessionPaymentStatus | string;
  /** null on legacy facilitator orders, which are paid with Mercado Pago. */
  payment_method?: SessionPaymentMethod | null;
  /** Mercado Pago hold: the slot is kept until this time while the student pays. */
  hold_expires_at?: string | null;
  payment_instructions?: string | null;
  /** Paid after the hold was released (or after cancelling): settled with the facilitator. */
  late_payment?: boolean;
  whatsapp_phone?: string | null;
};
export type SchedulerData = {
  services?: AvailabilityWindow[];
  availability?: AvailabilityWindow[];
  bookings?: StudentSession[];
};

/** Day key (YYYY-MM-DD) in Argentina time. */
export function sessionDay(value: string | number | Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: SESSION_TIMEZONE }).format(new Date(value));
}
export function sessionTime(value: string | number | Date): string {
  return new Date(value).toLocaleTimeString("es-AR", { timeZone: SESSION_TIMEZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}
export function sessionDayLabel(day: string): string {
  return new Date(`${day}T12:00:00${AR_OFFSET}`).toLocaleDateString("es-AR", { timeZone: SESSION_TIMEZONE, weekday: "short", day: "numeric", month: "short" });
}
export function sessionWhen(session: Pick<StudentSession, "starts_at" | "ends_at">): string {
  const day = new Date(session.starts_at).toLocaleDateString("es-AR", { timeZone: SESSION_TIMEZONE, weekday: "long", day: "numeric", month: "long" });
  return `${day} · ${sessionTime(session.starts_at)}–${sessionTime(session.ends_at)}`;
}
export function dayStartISO(day: string): string {
  return new Date(`${day}T00:00:00${AR_OFFSET}`).toISOString();
}
export function toISO(day: string, time: string): string {
  return new Date(`${day}T${time}:00${AR_OFFSET}`).toISOString();
}

/**
 * Who has to answer a pending session. Pending waits on whoever didn't create it:
 * facilitator-created → the student confirms; student-requested (outside availability)
 * → the facilitator confirms. Uses the server field when present; otherwise infers it
 * from outside_availability (students can only create pending bookings that way).
 */
export function sessionAwaiting(session: StudentSession): SessionAwaiting {
  if (session.status !== "pending") return null;
  if (session.awaiting === "student" || session.awaiting === "facilitator" || session.awaiting === "payment") return session.awaiting;
  if (isPaymentHold(session)) return "payment";
  if (typeof session.created_by_me === "boolean") return session.created_by_me ? "facilitator" : "student";
  return session.outside_availability ? "facilitator" : "student";
}

/** The student can cancel (or reject) until the session starts. */
export function canCancelSession(session: StudentSession, now = Date.now()): boolean {
  return session.status !== "cancelled" && Date.parse(session.starts_at) > now;
}

/** Pending booking held while the student pays with Mercado Pago (15 minutes). */
export function isPaymentHold(session: StudentSession): boolean {
  return session.status === "pending" && !!session.order_id && !!session.hold_expires_at
    && (session.payment_method ?? "mercadopago") === "mercadopago" && session.payment_status === "pending";
}

export const HOLD_MINUTES = 15;
export const PAYMENT_METHOD_LABELS: Record<SessionPaymentMethod, string> = {
  mercadopago: "Mercado Pago",
  cash: "Efectivo",
  transfer: "Transferencia",
};
export const NO_REFUND_NOTE = "Si cancelás después de pagar, no hay reintegro automático: lo arreglás directamente con el facilitador.";

export type PaymentState =
  | { kind: "coordinate" }
  | { kind: "free" }
  | { kind: "pay"; amount: number; currency: string; orderId: string }
  | { kind: "hold"; amount: number; currency: string; orderId: string; expiresAt: string }
  | { kind: "offline"; amount: number; currency: string; method: "cash" | "transfer"; instructions: string | null }
  | { kind: "offline_paid"; amount: number; currency: string; method: "cash" | "transfer" }
  | { kind: "late"; amount: number; currency: string }
  | { kind: "awaiting_confirmation"; amount: number; currency: string }
  | { kind: "paid"; amount: number; currency: string }
  | { kind: "refunded"; amount: number; currency: string };

/**
 * Payment shown for a session (appointment_orders). Without an order (no price set, or an
 * out-of-hours request) payment is coordinated with the facilitator.
 * - Mercado Pago chosen when booking: the slot is held and "Pagar" is available until it expires.
 * - Cash / transfer: paid directly to the facilitator, nothing to pay in the app.
 * - Facilitator-scheduled sessions: the checkout opens once the booking is confirmed (portal rule).
 * The money always goes to the facilitator's own Mercado Pago account (server side).
 */
export function sessionPayment(session: StudentSession): PaymentState {
  const amount = Number(session.amount ?? 0);
  const currency = session.currency || "ARS";
  const status = session.payment_status ?? null;
  const method = session.payment_method ?? "mercadopago";
  if (!session.order_id || !Number.isFinite(amount)) return { kind: "coordinate" };
  if (status === "free" || amount <= 0) return { kind: "free" };
  if (session.status === "cancelled" && status === "paid") return { kind: "late", amount, currency };
  if (method !== "mercadopago") {
    if (status === "paid") return { kind: "offline_paid", amount, currency, method };
    if (status === "pending") return { kind: "offline", amount, currency, method, instructions: session.payment_instructions?.trim() || null };
  }
  if (status === "paid") return { kind: "paid", amount, currency };
  if (status === "refunded") return { kind: "refunded", amount, currency };
  if (status === "cancelled") return { kind: "coordinate" };
  if (isPaymentHold(session)) return { kind: "hold", amount, currency, orderId: session.order_id, expiresAt: session.hold_expires_at! };
  if (session.status !== "confirmed") return { kind: "awaiting_confirmation", amount, currency };
  return { kind: "pay", amount, currency, orderId: session.order_id };
}

/** Seconds left to pay a Mercado Pago hold (0 when expired). */
export function holdSecondsLeft(expiresAt: string, now = Date.now()): number {
  const end = Date.parse(expiresAt);
  return Number.isFinite(end) ? Math.max(0, Math.floor((end - now) / 1000)) : 0;
}
export function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

/** Pricing of a service, or null when the facilitator didn't set one (payment coordinated). */
export function servicePricing(pricing: ServicePricing[] | null | undefined, service: Pick<AvailabilityWindow, "title" | "location"> | null | undefined): ServicePricing | null {
  if (!service) return null;
  const match = (pricing ?? []).find((item) => item.title === service.title && (item.location ?? "") === (service.location ?? ""));
  if (!match || !Number.isFinite(Number(match.price))) return null;
  const methods = (match.payment_methods ?? []).filter((method): method is SessionPaymentMethod => method in PAYMENT_METHOD_LABELS);
  return { ...match, price: Number(match.price), payment_methods: methods };
}

export function formatMoney(amount: number, currency = "ARS"): string {
  try {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: amount % 1 ? 2 : 0 }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export function sessionStatusLabel(session: StudentSession): string {
  if (session.status === "cancelled") return session.late_payment ? "Cancelada · pago a resolver" : "Cancelada";
  if (session.status === "confirmed") return "Confirmada";
  const awaiting = sessionAwaiting(session);
  if (awaiting === "payment") return "Esperando el pago";
  return awaiting === "student" ? "Te toca confirmar" : "Esperando confirmación del facilitador";
}

/** Session needs something from the student: confirm it or pay it. */
export function sessionNeedsStudent(session: StudentSession, now = Date.now()): "confirm" | "pay" | null {
  if (session.status === "cancelled" || Date.parse(session.ends_at) <= now) return null;
  if (sessionAwaiting(session) === "student" && Date.parse(session.starts_at) > now) return "confirm";
  const payment = sessionPayment(session);
  if (payment.kind === "hold") return holdSecondsLeft(payment.expiresAt, now) > 0 ? "pay" : null;
  return payment.kind === "pay" ? "pay" : null;
}

export function upcomingSessions(sessions: StudentSession[], now = Date.now()): StudentSession[] {
  return sessions
    .filter((session) => (session.status !== "cancelled" || session.late_payment) && Date.parse(session.ends_at) > now)
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
}

/** Free ranges of an availability window after removing busy ranges and the past. */
export function freeRanges(window: AvailabilityWindow, now = Date.now()): BusyRange[] {
  let ranges = [{ start: Math.max(Date.parse(window.starts_at), Math.ceil(now / 60000) * 60000), end: Date.parse(window.ends_at) }];
  for (const busy of window.busy ?? []) {
    const bs = Date.parse(busy.starts_at), be = Date.parse(busy.ends_at);
    ranges = ranges.flatMap((range) => {
      if (be <= range.start || bs >= range.end) return [range];
      return [
        ...(bs > range.start ? [{ start: range.start, end: bs }] : []),
        ...(be < range.end ? [{ start: be, end: range.end }] : []),
      ];
    });
  }
  return ranges.filter((range) => range.end > range.start).map((range) => ({ starts_at: new Date(range.start).toISOString(), ends_at: new Date(range.end).toISOString() }));
}

export type SessionStartOption = { startsAt: string; availabilityId: string };
/**
 * Bookable start times (every `step` minutes) for a service on a day, where a session of
 * `duration` minutes fits entirely inside free availability. Windows of the same service
 * (same organizer, title and location) are merged, like the portal does.
 */
export function startOptions(windows: AvailabilityWindow[], service: Pick<AvailabilityWindow, "organizer_id" | "title" | "location">, day: string, duration: number, now = Date.now(), step = 15): SessionStartOption[] {
  const result = new Map<string, SessionStartOption>();
  for (const window of windows) {
    if (window.organizer_id !== service.organizer_id || window.title !== service.title || window.location !== service.location) continue;
    for (const range of freeRanges(window, now)) {
      const end = Date.parse(range.ends_at);
      let start = Date.parse(range.starts_at);
      const remainder = (start / 60000) % step;
      if (remainder) start += (step - remainder) * 60000;
      for (; start + duration * 60000 <= end; start += step * 60000) {
        const iso = new Date(start).toISOString();
        if (sessionDay(start) === day && start > now && !result.has(iso)) result.set(iso, { startsAt: iso, availabilityId: window.id });
      }
    }
  }
  return [...result.values()].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

/** Days (YYYY-MM-DD) where the service has at least one bookable start. */
export function bookableDays(windows: AvailabilityWindow[], service: Pick<AvailabilityWindow, "organizer_id" | "title" | "location">, duration: number, now = Date.now()): string[] {
  const days = new Set<string>();
  for (const window of windows) {
    if (window.organizer_id !== service.organizer_id || window.title !== service.title || window.location !== service.location) continue;
    for (const range of freeRanges(window, now)) {
      if (Date.parse(range.ends_at) - Date.parse(range.starts_at) < duration * 60000) continue;
      const day = sessionDay(range.starts_at);
      if (startOptions([window], service, day, duration, now).length) days.add(day);
      const lastDay = sessionDay(Date.parse(range.ends_at) - 1);
      if (lastDay !== day && startOptions([window], service, lastDay, duration, now).length) days.add(lastDay);
    }
  }
  return [...days].sort();
}

/** Next `count` calendar days (Argentina) starting tomorrow, for out-of-hours requests. */
export function requestDays(now = Date.now(), count = 21): string[] {
  const days: string[] = [];
  for (let i = 1; days.length < count && i < count + 3; i++) {
    const day = sessionDay(now + i * 86400000);
    if (!days.includes(day)) days.push(day);
  }
  return days;
}
export const REQUEST_TIMES = Array.from({ length: 31 }, (_, i) => {
  const minutes = 7 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});
export const SESSION_DURATIONS = [30, 45, 60] as const;

/** wa.me link for a facilitator phone (digits with country code), or null. */
export function whatsappLink(phone: string | null | undefined, text?: string): string | null {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function isMissingRpc(cause: unknown): boolean {
  const error = cause as { code?: string } | null;
  return error?.code === "PGRST202" || error?.code === "42883";
}
/** RPC or action not deployed yet (portal_student_sessions without pricing / book). */
export function isUnsupportedAction(cause: unknown): boolean {
  return isMissingRpc(cause) || (cause as { message?: string } | null)?.message === "INVALID_ACTION";
}

export function sessionError(cause: unknown): string {
  const error = cause as { code?: string; message?: string } | null;
  if (isMissingRpc(error)) return "Esta acción todavía no está habilitada. Probá más tarde o escribile al facilitador.";
  const messages: Record<string, string> = {
    APPOINTMENT_OVERLAP: "Ese horario se superpone con otra sesión. Elegí otro.",
    APPOINTMENT_UNAVAILABLE: "Ese horario ya no está disponible. Actualizá y elegí otro.",
    INVALID_APPOINTMENT_TIME: "Elegí un horario futuro y una duración válida.",
    BOOKING_CLOSED: "La sesión ya empezó o terminó, así que no se puede modificar.",
    STUDENT_ACCOUNT_REQUIRED: "Necesitás una cuenta de Vibes activa para reservar.",
    FORBIDDEN: "No tenés permiso para realizar esta acción.",
    AUTH_REQUIRED: "Iniciá sesión nuevamente.",
    LEARNING_DISABLED: "Las sesiones no están disponibles en este momento. Probá más tarde.",
    NOT_PENDING: "Esta sesión ya no está pendiente de tu confirmación.",
    AWAITING_PAYMENT: "Esta sesión se confirma sola cuando se acredita el pago.",
    PAYMENT_REQUIRED: "Este servicio tiene precio. Actualizá la app para elegir cómo pagar.",
    PAYMENT_METHOD_UNAVAILABLE: "Esa forma de pago ya no está disponible. Actualizá y elegí otra.",
  };
  return messages[error?.message ?? ""] ?? "No pudimos completar la operación. Actualizá y volvé a intentar.";
}
