import type { LearningData } from "./types";
import type { ReservationRequest } from "./reservations";
export type StudentMeeting = {
  id: string; sourceId: string; title: string; startsAt: string; endsAt?: string;
  timezone: string; location?: string; status: "confirmed" | "pending" | "cancelled";
  requestId?: string;
};
export function studentAgenda(data: LearningData, requests: ReservationRequest[]): StudentMeeting[] {
  const confirmed = data.enrollments.flatMap(enrollment => {
    const activity = data.activities.find(item => item.id === enrollment.activity_id);
    if (!activity) return [];
    return data.sessions.filter(session => session.activity_id === activity.id).map(session => ({
      id:`enrollment:${enrollment.id}:${session.id}`,sourceId:activity.id,title:activity.title,
      startsAt:session.starts_at,endsAt:session.ends_at,timezone:activity.timezone,location:activity.location,
      status:enrollment.status === "cancelled" || activity.status === "cancelled" ? "cancelled" as const : "confirmed" as const,
    }));
  });
  const pending = requests.flatMap(request => {
    const activity = data.activities.find(item => item.id === request.source_id);
    return [...new Set(request.starts_at)].map(startsAt => ({
      id:`request:${request.id}:${startsAt}`,sourceId:request.source_id,title:request.title,startsAt,
      timezone:activity?.timezone ?? "America/Argentina/Buenos_Aires",location:activity?.location,
      requestId:request.id,status:request.status === "cancelled" ? "cancelled" as const : "pending" as const,
    }));
  });
  return [...confirmed,...pending].filter(meeting => Number.isFinite(Date.parse(meeting.startsAt)))
    .sort((a,b) => Date.parse(a.startsAt)-Date.parse(b.startsAt));
}
export function isUpcomingStudentMeeting(meeting: StudentMeeting, now = Date.now()) {
  return meeting.status !== "cancelled" && Date.parse(meeting.endsAt ?? meeting.startsAt) > now;
}
