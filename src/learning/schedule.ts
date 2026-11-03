import type { LearningSession } from "./types";
export function learningSchedulePreview(sessions: LearningSession[], now = Date.now()) {
  const ordered = sessions.filter(session => Number.isFinite(Date.parse(session.starts_at)) && Number.isFinite(Date.parse(session.ends_at)) && Date.parse(session.ends_at) > now)
    .slice().sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  const preview = ordered.slice(0, 3);
  return { ordered, preview, nextId: ordered.find(session => Date.parse(session.starts_at) >= now)?.id ?? null };
}
