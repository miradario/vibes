/** Keep infrastructure diagnostics in logs, not user-facing messages. */
export const userFacingMessage = (message: string): string =>
  /supabase/i.test(message)
    ? "No pudimos completar la operación en Vibes. Intentá nuevamente."
    : message;
