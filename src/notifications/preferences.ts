export const notificationCategories = [
  {
    key: "notificationConnections",
    column: "notification_connections",
    label: "connections",
  },
  {
    key: "notificationMatches",
    column: "notification_matches",
    label: "matches",
  },
  {
    key: "notificationDirectMessages",
    column: "notification_direct_messages",
    label: "directMessages",
  },
  {
    key: "notificationGroupMessages",
    column: "notification_group_messages",
    label: "groupMessages",
  },
  {
    key: "notificationChallenges",
    column: "notification_challenges",
    label: "challenges",
  },
  { key: "notificationEvents", column: "notification_events", label: "events" },
] as const;

export const eventReminderTimings = ["24h", "1h", "both"] as const;
export type EventReminderTiming = (typeof eventReminderTimings)[number];
export const reminderTimingLabel = {
  "24h": "dayBefore",
  "1h": "hourBefore",
  both: "both",
} as const;
export const getReminderTiming = (value: unknown): EventReminderTiming =>
  value === "24h" || value === "1h" ? value : "both";

export const getChallengeReminderTime = (value: unknown): string => {
  const time = typeof value === "string" ? value.slice(0, 5) : "";
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : "20:00";
};

export const getDeviceTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

export const reminderTimeToDate = (time: string): Date => {
  const [hours, minutes] = getChallengeReminderTime(time)
    .split(":")
    .map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

export const reminderTimeFromDate = (date: Date): string =>
  `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
