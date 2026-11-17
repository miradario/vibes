// RPC contract for student sessions. Existing prod RPCs: portal_scheduler (get / reserve /
// cancel). Proposed, not deployed yet: portal_student_sessions (list / accept / decline /
// contact / pricing / book). Every call that depends on the proposed RPC degrades gracefully
// when missing.
import {
  HOLD_MINUTES, isMissingRpc, isUnsupportedAction, type SchedulerData, type ServicePricing,
  type SessionPaymentMethod, type StudentSession,
} from "./sessions";

export type RpcClient = { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };

async function call<T>(client: RpcClient, name: string, args: Record<string, unknown>): Promise<T> {
  const result = await client.rpc(name, args);
  if (result.error) throw result.error;
  return result.data as T;
}
const scheduler = <T = SchedulerData>(client: RpcClient, action: string, organizer: string | null, id: string | null, data: Record<string, unknown> = {}) =>
  call<T>(client, "portal_scheduler", { p_action: action, p_organizer: organizer, p_id: id, p_data: data });

export type StudentSessionsResult = { sessions: StudentSession[]; respondSupported: boolean };

export async function loadStudentSessions(client: RpcClient): Promise<StudentSessionsResult> {
  try {
    const data = await call<{ sessions?: StudentSession[] }>(client, "portal_student_sessions", { p_action: "list", p_id: null, p_data: {} });
    return { sessions: data?.sessions ?? [], respondSupported: true };
  } catch (cause) {
    if (!isMissingRpc(cause)) throw cause;
  }
  // Fallback until the migration lands: upcoming pending/confirmed bookings from the scheduler.
  const data = await scheduler(client, "get", null, null);
  return { sessions: data?.bookings ?? [], respondSupported: false };
}

export function loadOrganizerAvailability(client: RpcClient, organizerId: string, from: string) {
  return scheduler(client, "get", organizerId, null, { from });
}

/** Inside availability → confirmed; outside (out-of-hours request) → pending for the facilitator. */
export function reserveSession(client: RpcClient, organizerId: string, availabilityId: string, startsAt: string, duration: number) {
  return scheduler(client, "reserve", organizerId, availabilityId, { starts_at: startsAt, duration });
}

export function cancelSession(client: RpcClient, bookingId: string) {
  return scheduler(client, "cancel", null, bookingId);
}

export type ServicePricingResult = { services: ServicePricing[]; supported: boolean; holdMinutes: number };

/** Prices and payment methods per service. Mercado Pago only comes when the facilitator has it connected. */
export async function loadServicePricing(client: RpcClient, organizerId: string): Promise<ServicePricingResult> {
  try {
    const data = await call<{ services?: ServicePricing[]; hold_minutes?: number } | null>(client, "portal_student_sessions", { p_action: "pricing", p_id: organizerId, p_data: {} });
    return { services: data?.services ?? [], supported: true, holdMinutes: Number(data?.hold_minutes) || HOLD_MINUTES };
  } catch (cause) {
    if (isUnsupportedAction(cause)) return { services: [], supported: false, holdMinutes: HOLD_MINUTES };
    throw cause;
  }
}

export type BookSessionResult = { sessions?: StudentSession[]; booking_id?: string | null; order_id?: string | null; hold_expires_at?: string | null };

/**
 * Books a priced service with the chosen payment method (null when it is free).
 * Mercado Pago → pending, held until hold_expires_at while the student pays; it confirms itself
 * when the webhook credits the payment. Cash / transfer → confirmed, paid to the facilitator.
 */
export function bookSession(client: RpcClient, availabilityId: string, startsAt: string, duration: number, paymentMethod: SessionPaymentMethod | null) {
  return call<BookSessionResult>(client, "portal_student_sessions", {
    p_action: "book",
    p_id: availabilityId,
    p_data: { starts_at: startsAt, duration, payment_method: paymentMethod },
  });
}

export async function respondToSession(client: RpcClient, bookingId: string, answer: "accept" | "decline") {
  try {
    return await call<unknown>(client, "portal_student_sessions", { p_action: answer, p_id: bookingId, p_data: {} });
  } catch (cause) {
    // Rejecting is equivalent to cancelling, which the current backend already allows.
    if (answer === "decline" && isMissingRpc(cause)) return cancelSession(client, bookingId);
    throw cause;
  }
}

export async function loadOrganizerContact(client: RpcClient, organizerId: string): Promise<{ whatsapp_phone: string | null }> {
  try {
    const data = await call<{ whatsapp_phone?: string | null } | null>(client, "portal_student_sessions", { p_action: "contact", p_id: organizerId, p_data: {} });
    return { whatsapp_phone: data?.whatsapp_phone || null };
  } catch (cause) {
    if (isMissingRpc(cause)) return { whatsapp_phone: null };
    throw cause;
  }
}

/** Finds the booking just created by reserve (same organizer and start). */
export function findReservedBooking(data: SchedulerData | null | undefined, organizerId: string, startsAt: string): StudentSession | undefined {
  const target = Date.parse(startsAt);
  return (data?.bookings ?? []).find((booking) => booking.organizer_id === organizerId && Date.parse(booking.starts_at) === target);
}

const MERCADO_PAGO_URL = /^https:\/\/[\w.-]*mercadopago\.(com|com\.ar)\//;
/**
 * Same endpoint the portal uses; the server validates access, amount, confirmation or an active
 * hold, and creates the preference with the facilitator's own Mercado Pago account.
 */
export async function requestCheckoutUrl(fetchImpl: typeof fetch, portalUrl: string, accessToken: string, orderId: string): Promise<string> {
  const response = await fetchImpl(`${portalUrl.replace(/\/$/, "")}/api/portal/appointment-checkout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ order_id: orderId }),
  });
  let body: { init_point?: unknown; error?: unknown } = {};
  try { body = await response.json(); } catch { body = {}; }
  if (!response.ok) throw new Error(typeof body.error === "string" && body.error ? body.error : "No pudimos abrir el pago.");
  if (typeof body.init_point !== "string" || !MERCADO_PAGO_URL.test(body.init_point)) throw new Error("No pudimos abrir el pago.");
  return body.init_point;
}
