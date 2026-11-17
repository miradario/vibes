const columns: Record<string, string> = {
  connection_request: "notification_connections",
  new_match: "notification_matches",
  direct_message: "notification_direct_messages",
  event_message: "notification_group_messages",
  challenge_reminder: "notification_challenges",
  event_reminder: "notification_events",
  appointment_invited: "notification_sessions",
  appointment_confirmed: "notification_sessions",
  appointment_updated: "notification_sessions",
  appointment_cancelled: "notification_sessions",
};

export const notificationAllowed = (
  preferences: Record<string, unknown> | undefined,
  type: string
) =>
  preferences?.notifications_enabled !== false &&
  (type === "new_user" ||
    (Boolean(columns[type]) && preferences?.[columns[type]] !== false));
