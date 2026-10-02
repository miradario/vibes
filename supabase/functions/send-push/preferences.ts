const columns: Record<string, string> = {
  connection_request: "notification_connections",
  new_match: "notification_matches",
  direct_message: "notification_direct_messages",
  event_message: "notification_group_messages",
  challenge_reminder: "notification_challenges",
  event_reminder: "notification_events",
};

export const notificationAllowed = (
  preferences: Record<string, unknown> | undefined,
  type: string
) =>
  preferences?.notifications_enabled !== false &&
  Boolean(columns[type]) &&
  preferences?.[columns[type]] !== false;
