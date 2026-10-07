export const getReminderDestination = (data: Record<string, unknown>) => {
  if (typeof data.eventId !== "string" || !data.eventId.trim()) return null;
  if (data.type === "challenge_reminder") {
    return { name: "ChallengeDetailScreen", params: { challengeId: data.eventId, event: undefined } };
  }
  if (data.type === "event_reminder") {
    return { name: "EventDetail", params: { eventId: data.eventId, event: undefined } };
  }
  return null;
};

export const shouldDeferReminder = (route?: string) =>
  !route || route === "Startup" || route === "UpdateGate";
