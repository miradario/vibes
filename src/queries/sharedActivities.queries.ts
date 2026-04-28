import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export type SharedActivities = {
  events: string[];
  challenges: string[];
};

export const sharedActivitiesKeys = {
  all: ["shared-activities"] as const,
  pair: (currentUserId?: string, otherUserId?: string) =>
    [...sharedActivitiesKeys.all, currentUserId ?? "anon", otherUserId ?? "anon"] as const,
};

const uniq = <T,>(items: T[]) => Array.from(new Set(items));

const fetchSharedActivities = async (
  currentUserId: string,
  otherUserId: string,
): Promise<SharedActivities> => {
  const [
    currentEventParticipantsRes,
    otherEventParticipantsRes,
    currentChallengeParticipantsRes,
    otherChallengeParticipantsRes,
  ] = await Promise.all([
    supabase
      .from("event_participants")
      .select("event_id, event_type")
      .eq("user_id", currentUserId),
    supabase
      .from("event_participants")
      .select("event_id, event_type")
      .eq("user_id", otherUserId),
    supabase
      .from("challenge_participants")
      .select("challenge_id")
      .eq("user_id", currentUserId),
    supabase
      .from("challenge_participants")
      .select("challenge_id")
      .eq("user_id", otherUserId),
  ]);

  if (currentEventParticipantsRes.error) throw currentEventParticipantsRes.error;
  if (otherEventParticipantsRes.error) throw otherEventParticipantsRes.error;
  if (currentChallengeParticipantsRes.error) throw currentChallengeParticipantsRes.error;
  if (otherChallengeParticipantsRes.error) throw otherChallengeParticipantsRes.error;

  const currentEventRows = currentEventParticipantsRes.data ?? [];
  const otherEventRows = otherEventParticipantsRes.data ?? [];
  const currentChallengeRows = currentChallengeParticipantsRes.data ?? [];
  const otherChallengeRows = otherChallengeParticipantsRes.data ?? [];

  const currentEvents = new Set(
    currentEventRows
      .filter((row: any) => String(row.event_type ?? "event") !== "challenge")
      .map((row: any) => String(row.event_id ?? "")),
  );
  const otherEvents = new Set(
    otherEventRows
      .filter((row: any) => String(row.event_type ?? "event") !== "challenge")
      .map((row: any) => String(row.event_id ?? "")),
  );

  const sharedEventIds = uniq(
    Array.from(currentEvents).filter((eventId) => eventId && otherEvents.has(eventId)),
  );

  const currentChallenges = new Set([
    ...currentEventRows
      .filter((row: any) => String(row.event_type ?? "") === "challenge")
      .map((row: any) => String(row.event_id ?? "")),
    ...currentChallengeRows.map((row: any) => String(row.challenge_id ?? "")),
  ]);
  const otherChallenges = new Set([
    ...otherEventRows
      .filter((row: any) => String(row.event_type ?? "") === "challenge")
      .map((row: any) => String(row.event_id ?? "")),
    ...otherChallengeRows.map((row: any) => String(row.challenge_id ?? "")),
  ]);

  const sharedChallengeIds = uniq(
    Array.from(currentChallenges).filter(
      (challengeId) => challengeId && otherChallenges.has(challengeId),
    ),
  );

  const [eventsRes, challengesRes] = await Promise.all([
    sharedEventIds.length > 0
      ? supabase.from("events").select("id, title").in("id", sharedEventIds)
      : Promise.resolve({ data: [], error: null }),
    sharedChallengeIds.length > 0
      ? supabase.from("challenges").select("id, title").in("id", sharedChallengeIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (eventsRes.error) throw eventsRes.error;
  if (challengesRes.error) throw challengesRes.error;

  return {
    events: uniq(
      (eventsRes.data ?? []).map((row: any) => String(row.title ?? "Evento")),
    ),
    challenges: uniq(
      (challengesRes.data ?? []).map(
        (row: any) => String(row.title ?? "Challenge"),
      ),
    ),
  };
};

export const useSharedActivitiesQuery = (
  currentUserId?: string,
  otherUserId?: string,
) =>
  useQuery<SharedActivities>({
    queryKey: sharedActivitiesKeys.pair(currentUserId, otherUserId),
    queryFn: () => fetchSharedActivities(currentUserId as string, otherUserId as string),
    enabled:
      Boolean(currentUserId) &&
      Boolean(otherUserId) &&
      currentUserId !== otherUserId,
    staleTime: 60_000,
    placeholderData: { events: [], challenges: [] },
  });
