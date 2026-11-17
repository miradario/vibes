export const SESSION_PUSH_TYPES = ["appointment_invited", "appointment_confirmed", "appointment_updated", "appointment_cancelled"] as const;
export const isSessionPush = (data: Record<string, unknown> | null | undefined) =>
  typeof data?.type === "string" && (SESSION_PUSH_TYPES as readonly string[]).includes(data.type);

export const getReminderDestination = (data: Record<string, unknown>) => {
  // Session pushes (send-push appointment_*) open the session detail.
  if (isSessionPush(data)) {
    return typeof data.sessionId === "string" && data.sessionId.trim()
      ? { name: "SessionDetail", params: { id: data.sessionId.trim() } }
      : null;
  }
  if (typeof data.eventId !== "string" || !data.eventId.trim()) return null;
  if (data.type === "challenge_reminder" || data.type === "challenge_health_checkin") {
    return { name: "ChallengeDetailScreen", params: { challengeId: data.eventId, event: undefined } };
  }
  if (data.type === "event_reminder") {
    return { name: "EventDetail", params: { eventId: data.eventId, event: undefined } };
  }
  return null;
};

export const shouldDeferReminder = (route?: string) =>
  !route || route === "Startup" || route === "UpdateGate";
