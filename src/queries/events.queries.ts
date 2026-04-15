import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { createSignedProfilePhotoUrl } from "../lib/profilePhotoStorage";
import {
  encodeChallengeDescriptionWithPreset,
  extractChallengePresetFromDescription,
  extractChallengeStartsAtFromDescription,
  getChallengeMediaPreset,
  parseChallengeMediaPreset,
  stripChallengePresetFromDescription,
  type ChallengeMediaPresetId,
} from "../constants/challengeMediaPresets";

const EVENT_ASSETS_BUCKET = "event-assets";
const EVENT_FALLBACK_IMAGE = require("../../assets/images/challenges/challengetree.png");


export type EventType = "event" | "challenge";

export type EventFeedItem = {
  id: string;
  type: EventType;
  title: string;
  subtitle: string;
  description?: string | null;
  date: string;
  startsAt?: string | null;
  attendees: string;
  capacity?: number | null;
  durationDays?: number | null;
  location?: string | null;
  image: string | number;
  imageUrl?: string | null;
  imagePresetId?: ChallengeMediaPresetId | null;
  hostName?: string | null;
  hostImage?: string | null;
  tags?: string[];
  createdAt?: string | null;
  createdBy?: string | null;
};

type EventRow = Record<string, any>;

type CreateEventInput = {
  createdBy: string;
  title: string;
  subtitle: string;
  description?: string | null;
  startsAt: string;
  location: string;
  capacity: number;
  imageUri?: string | null;
  imagePresetId?: ChallengeMediaPresetId | null;
  hostName?: string | null;
  hostImage?: string | null;
};

type CreateChallengeInput = {
  createdBy: string;
  title: string;
  subtitle: string;
  description?: string | null;
  durationDays: number;
  startsAt?: string | null;
  imagePresetId?: ChallengeMediaPresetId | null;
  hostName?: string | null;
  hostImage?: string | null;
};

export const eventsKeys = {
  all: ["events"] as const,
};

export const challengesKeys = {
  all: ["challenges"] as const,
};

export const challengeParticipantKeys = {
  participant: (challengeId: string, userId: string) =>
    ["challenge_participant", challengeId, userId] as const,
};

export const challengeCheckinsKeys = {
  list: (challengeId: string, userId: string) =>
    ["challenge_checkins", challengeId, userId] as const,
};

const formatEventDate = (value: Date) =>
  value.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
  });

const formatEventTime = (value: Date) =>
  value.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

const formatEventDateTime = (value: Date) =>
  `${formatEventDate(value)} · ${formatEventTime(value)}`;

const mapEventRow = (row: EventRow): EventFeedItem => {
  const type = row.type === "challenge" ? "challenge" : "event";
  const startsAt = typeof row.starts_at === "string" ? row.starts_at : null;
  const parsedStartsAt = startsAt ? new Date(startsAt) : null;
  const capacity =
    typeof row.capacity === "number" ? row.capacity : Number(row.capacity ?? 0) || 0;
  const participantCount =
    typeof row.participant_count === "number"
      ? row.participant_count
      : Number(row.participant_count ?? 0) || 0;
  const durationDays =
    typeof row.duration_days === "number"
      ? row.duration_days
      : Number(row.duration_days ?? 0) || 0;
  const imageUrl =
    typeof row.image_url === "string" && row.image_url.trim()
      ? row.image_url.trim()
      : null;
  const rawDescription =
    typeof row.description === "string" ? row.description : null;
  const preset = getChallengeMediaPreset(
    parseChallengeMediaPreset(imageUrl) ??
      extractChallengePresetFromDescription(rawDescription),
  );

  return {
    id: String(row.id),
    type,
    title: typeof row.title === "string" ? row.title : "Untitled",
    subtitle:
      typeof row.subtitle === "string" && row.subtitle.trim()
        ? row.subtitle
        : type === "challenge"
          ? "Challenge creado por la comunidad"
          : "Evento creado por la comunidad",
    description:
      rawDescription && rawDescription.trim()
        ? stripChallengePresetFromDescription(rawDescription)
        : null,
    date:
      type === "challenge"
        ? durationDays > 0
          ? `${durationDays} días`
          : "Sin duración definida"
        : parsedStartsAt
          ? formatEventDateTime(parsedStartsAt)
          : "Sin fecha definida",
    startsAt,
    attendees:
      type === "challenge" ? "Challenge" : `${participantCount}/${capacity || 0}`,
    capacity: type === "event" ? capacity : null,
    durationDays: type === "challenge" ? durationDays : null,
    location:
      typeof row.location === "string" && row.location.trim() ? row.location : null,
    image:
      preset?.image ||
      imageUrl ||
      (type === "challenge" ? CHALLENGE_FALLBACK_IMAGE : EVENT_FALLBACK_IMAGE),
    imageUrl,
    imagePresetId: preset?.id ?? null,
    hostName:
      typeof row.host_name === "string" && row.host_name.trim()
        ? row.host_name
        : null,
    hostImage:
      typeof row.host_image_url === "string" && row.host_image_url.trim()
        ? row.host_image_url
        : null,
    tags: Array.isArray(row.tags)
      ? row.tags.filter((tag: unknown): tag is string => typeof tag === "string" && tag.trim().length > 0)
      : [],
    createdAt:
      typeof row.created_at === "string" && row.created_at.trim()
        ? row.created_at
        : null,
    createdBy:
      typeof row.created_by === "string" && row.created_by.trim()
        ? row.created_by
        : null,
  };
};

const mapChallengeRow = (row: EventRow): EventFeedItem => {
  const rawDescription =
    typeof row.description === "string" ? row.description : null;
  const startsAt =
    (typeof row.starts_at === "string" ? row.starts_at : null) ??
    extractChallengeStartsAtFromDescription(rawDescription);
  const durationDays =
    typeof row.duration_days === "number"
      ? row.duration_days
      : Number(row.duration_days ?? 0) || 0;
  const participantCount =
    typeof row.participant_count === "number"
      ? row.participant_count
      : Number(row.participant_count ?? 0) || 0;
  const imageUrl =
    typeof row.image_url === "string" && row.image_url.trim()
      ? row.image_url.trim()
      : null;
  const preset = getChallengeMediaPreset(
    parseChallengeMediaPreset(imageUrl) ??
      extractChallengePresetFromDescription(rawDescription),
  );

  return {
    id: String(row.id),
    type: "challenge",
    title: typeof row.title === "string" ? row.title : "Untitled",
    subtitle:
      typeof row.subtitle === "string" && row.subtitle.trim()
        ? row.subtitle
        : "Challenge creado por la comunidad",
    description:
      rawDescription && rawDescription.trim()
        ? stripChallengePresetFromDescription(rawDescription)
        : null,
    date: durationDays > 0 ? `${durationDays} días` : "Sin duración definida",
    startsAt,
    attendees: participantCount > 0 ? `${participantCount} participantes` : "Challenge",
    capacity: null,
    durationDays,
    location: null,
    image: preset?.image || imageUrl || CHALLENGE_FALLBACK_IMAGE,
    imageUrl,
    imagePresetId: preset?.id ?? null,
    hostName:
      typeof row.host_name === "string" && row.host_name.trim()
        ? row.host_name
        : null,
    hostImage:
      typeof row.host_image_url === "string" && row.host_image_url.trim()
        ? row.host_image_url
        : null,
    tags: Array.isArray(row.tags)
      ? row.tags.filter(
          (tag: unknown): tag is string =>
            typeof tag === "string" && tag.trim().length > 0,
        )
      : [],
    createdAt:
      typeof row.created_at === "string" && row.created_at.trim()
        ? row.created_at
        : null,
    createdBy:
      typeof row.created_by === "string" && row.created_by.trim()
        ? row.created_by
        : null,
  };
};

const fetchEvents = async (): Promise<EventFeedItem[]> => {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("type", "event")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapEventRow);
};

const fetchChallenges = async (): Promise<EventFeedItem[]> => {
  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapChallengeRow);
};

const maybeUploadEventImage = async (
  uri: string | null | undefined,
  pathPrefix: string,
) => {
  if (!uri || !uri.trim() || !uri.startsWith("file")) {
    return uri ?? null;
  }

  return uploadImageToSupabase({
    uri,
    bucket: EVENT_ASSETS_BUCKET,
    pathPrefix,
  });
};

export const useEventsFeedQuery = () => {
  return useQuery<EventFeedItem[]>({
    queryKey: eventsKeys.all,
    queryFn: fetchEvents,
    staleTime: 30_000,
  });
};

export const useChallengesFeedQuery = () => {
  return useQuery<EventFeedItem[]>({
    queryKey: challengesKeys.all,
    queryFn: fetchChallenges,
    staleTime: 30_000,
  });
};

export const useCreateEventMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<EventFeedItem, unknown, CreateEventInput>({
    mutationFn: async (input) => {
      const imageUrl = input.imagePresetId
        ? null
        : await maybeUploadEventImage(
            input.imageUri,
            `${input.createdBy}/events`,
          );
      const encodedDescription = encodeChallengeDescriptionWithPreset(
        input.description ?? null,
        input.imagePresetId,
      );

      const { data, error } = await supabase
        .from("events")
        .insert({
          type: "event",
          created_by: input.createdBy,
          title: input.title,
          subtitle: input.subtitle,
          description: encodedDescription,
          starts_at: input.startsAt,
          location: input.location,
          capacity: input.capacity,
          participant_count: 0,
          image_url: imageUrl,
          host_name: input.hostName ?? null,
          host_image_url: input.hostImage ?? null,
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return mapEventRow(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.all });
    },
  });
};

export type ChallengeParticipant = {
  id: string;
  challengeId: string;
  userId: string;
  joinedAt: string;
  streak: number;
  lastCheckinDate: string | null;
  totalCheckins: number;
  checkedInToday: boolean;
};

export const useChallengeCheckinsQuery = (
  challengeId: string | undefined,
  userId: string | undefined,
) => {
  return useQuery<string[]>({
    queryKey: challengeCheckinsKeys.list(challengeId ?? "", userId ?? ""),
    queryFn: async () => {
      if (!challengeId || !userId) return [];

      const { data, error } = await supabase
        .from("challenge_checkins")
        .select("checkin_date")
        .eq("challenge_id", challengeId)
        .eq("user_id", userId)
        .order("checkin_date", { ascending: true });

      if (error) throw error;

      return (data ?? [])
        .map((row: any) =>
          typeof row.checkin_date === "string" ? row.checkin_date : null,
        )
        .filter((value: string | null): value is string => Boolean(value));
    },
    enabled: Boolean(challengeId && userId),
    staleTime: 30_000,
  });
};

export const useChallengeParticipantQuery = (
  challengeId: string | undefined,
  userId: string | undefined,
) => {
  return useQuery<ChallengeParticipant | null>({
    queryKey: challengeParticipantKeys.participant(challengeId ?? "", userId ?? ""),
    queryFn: async () => {
      if (!challengeId || !userId) return null;

      const { data, error } = await supabase
        .from("challenge_participants")
        .select("*")
        .eq("challenge_id", challengeId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const today = new Date().toISOString().split("T")[0];
      return {
        id: String(data.id),
        challengeId: String(data.challenge_id),
        userId: String(data.user_id),
        joinedAt: String(data.joined_at),
        streak: Number(data.streak ?? 0),
        lastCheckinDate: data.last_checkin_date ?? null,
        totalCheckins: Number(data.total_checkins ?? 0),
        checkedInToday: data.last_checkin_date === today,
      };
    },
    enabled: Boolean(challengeId && userId),
    staleTime: 30_000,
  });
};

export const useJoinChallengeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, { challengeId: string; userId: string }>({
    mutationFn: async ({ challengeId, userId }) => {
      const { error } = await supabase.from("challenge_participants").insert({
        challenge_id: challengeId,
        user_id: userId,
      });
      if (error) throw error;

      const { error: eventParticipantError } = await supabase
        .from("event_participants")
        .upsert(
          {
            event_id: challengeId,
            event_type: "challenge",
            user_id: userId,
          },
          { onConflict: "event_id,user_id" },
        );
      if (eventParticipantError) throw eventParticipantError;
    },
    onSuccess: (_data, { challengeId, userId }) => {
      queryClient.invalidateQueries({
        queryKey: challengeParticipantKeys.participant(challengeId, userId),
      });
      queryClient.invalidateQueries({
        queryKey: eventParticipantKeys.byEvent(challengeId),
      });
      queryClient.invalidateQueries({ queryKey: challengesKeys.all });
      queryClient.invalidateQueries({ queryKey: myEventGroupsKeys.all(userId) });
    },
  });
};

export const useCheckInChallengeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, { challengeId: string; userId: string; note?: string }>({
    mutationFn: async ({ challengeId, userId, note }) => {
      const today = new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("challenge_checkins").insert({
        challenge_id: challengeId,
        user_id: userId,
        checkin_date: today,
        note: note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, { challengeId, userId }) => {
      queryClient.invalidateQueries({
        queryKey: challengeParticipantKeys.participant(challengeId, userId),
      });
      queryClient.invalidateQueries({
        queryKey: challengeCheckinsKeys.list(challengeId, userId),
      });
    },
  });
};

export const useLeaveChallengeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, { challengeId: string; userId: string }>({
    mutationFn: async ({ challengeId, userId }) => {
      const { error } = await supabase
        .from("challenge_participants")
        .delete()
        .eq("challenge_id", challengeId)
        .eq("user_id", userId);
      if (error) throw error;

      const { error: eventParticipantError } = await supabase
        .from("event_participants")
        .delete()
        .eq("event_id", challengeId)
        .eq("user_id", userId);
      if (eventParticipantError) throw eventParticipantError;
    },
    onSuccess: (_data, { challengeId, userId }) => {
      queryClient.invalidateQueries({
        queryKey: challengeParticipantKeys.participant(challengeId, userId),
      });
      queryClient.invalidateQueries({
        queryKey: challengeCheckinsKeys.list(challengeId, userId),
      });
      queryClient.invalidateQueries({
        queryKey: eventParticipantKeys.byEvent(challengeId),
      });
      queryClient.invalidateQueries({ queryKey: challengesKeys.all });
      queryClient.invalidateQueries({ queryKey: myEventGroupsKeys.all(userId) });
    },
  });
};

export const useDeleteChallengeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, { challengeId: string }>({
    mutationFn: async ({ challengeId }) => {
      const { error } = await supabase
        .from("challenges")
        .delete()
        .eq("id", challengeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: challengesKeys.all });
    },
  });
};

export const useChallengeParticipantsQuery = (challengeId: string | undefined) => {
  return useQuery<EventParticipant[]>({
    queryKey: ["challenge_participants_list", challengeId ?? ""],
    queryFn: async () => {
      if (!challengeId) return [];
      const { data, error } = await supabase
        .from("challenge_participants")
        .select("id, user_id, joined_at, profiles:user_id ( display_name, photos )")
        .eq("challenge_id", challengeId)
        .order("joined_at", { ascending: true });
      if (error) throw error;
      if (!data) return [];
      const participants = await Promise.all(
        data.map(async (row: any) => {
          const profile = row.profiles;
          let avatarUrl: string | null = null;
          if (profile?.photos?.[0]) {
            avatarUrl = await createSignedProfilePhotoUrl(profile.photos[0]);
          }
          return {
            id: String(row.id),
            userId: String(row.user_id),
            joinedAt: String(row.joined_at),
            displayName: profile?.display_name ?? null,
            avatarUrl,
          };
        }),
      );
      return participants;
    },
    enabled: Boolean(challengeId),
    staleTime: 60_000,
  });
};

export const useCreateChallengeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<EventFeedItem, unknown, CreateChallengeInput>({
    mutationFn: async (input) => {
      const payload: Record<string, unknown> = {
        created_by: input.createdBy,
        title: input.title,
        subtitle: input.subtitle,
        duration_days: input.durationDays,
      };

      const encodedDescription = encodeChallengeDescriptionWithPreset(
        input.description ?? null,
        input.imagePresetId,
        input.startsAt ?? null,
      );
      if (encodedDescription) {
        payload.description = encodedDescription;
      }
      if (input.hostName) {
        payload.host_name = input.hostName;
      }
      if (input.hostImage) {
        payload.host_image_url = input.hostImage;
      }

      const { data, error } = await supabase
        .from("challenges")
        .insert(payload)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return mapChallengeRow(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: challengesKeys.all });
    },
  });
};

// ──────────────────────────────────────────────────────────
// Event Participants & Group Chat
// ──────────────────────────────────────────────────────────

export const eventParticipantKeys = {
  all: ["eventParticipants"] as const,
  byEvent: (eventId: string) => [...eventParticipantKeys.all, eventId] as const,
  isParticipant: (eventId: string, userId: string) =>
    [...eventParticipantKeys.all, eventId, userId] as const,
};

export const eventMessageKeys = {
  all: ["eventMessages"] as const,
  byEvent: (eventId: string) => [...eventMessageKeys.all, eventId] as const,
};

// ── Is current user a participant? ───────────────────────

export const useIsEventParticipantQuery = (
  eventId: string | undefined,
  userId: string | undefined,
) => {
  return useQuery<boolean>({
    queryKey: eventParticipantKeys.isParticipant(eventId ?? "", userId ?? ""),
    queryFn: async () => {
      if (!eventId || !userId) return false;
      const { data, error } = await supabase
        .from("event_participants")
        .select("id")
        .eq("event_id", eventId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
    enabled: Boolean(eventId && userId),
    staleTime: 30_000,
  });
};

// ── Join event ───────────────────────────────────────────

export const useJoinEventMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    unknown,
    { eventId: string; eventType: EventType; userId: string }
  >({
    mutationFn: async ({ eventId, eventType, userId }) => {
      const { error } = await supabase.from("event_participants").insert({
        event_id: eventId,
        event_type: eventType,
        user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: (_data, { eventId, eventType, userId }) => {
      queryClient.invalidateQueries({
        queryKey: eventParticipantKeys.isParticipant(eventId, userId),
      });
      queryClient.invalidateQueries({
        queryKey: eventParticipantKeys.byEvent(eventId),
      });
      queryClient.invalidateQueries({
        queryKey: eventType === "event" ? eventsKeys.all : challengesKeys.all,
      });
    },
  });
};

// ── Leave event ──────────────────────────────────────────

export const useLeaveEventMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    unknown,
    { eventId: string; eventType: EventType; userId: string }
  >({
    mutationFn: async ({ eventId, userId }) => {
      const { error } = await supabase
        .from("event_participants")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_data, { eventId, eventType, userId }) => {
      queryClient.invalidateQueries({
        queryKey: eventParticipantKeys.isParticipant(eventId, userId),
      });
      queryClient.invalidateQueries({
        queryKey: eventParticipantKeys.byEvent(eventId),
      });
      queryClient.invalidateQueries({
        queryKey: eventType === "event" ? eventsKeys.all : challengesKeys.all,
      });
    },
  });
};

// ── Participants list (with profile info) ────────────────

export type EventParticipant = {
  id: string;
  userId: string;
  joinedAt: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export const useEventParticipantsQuery = (eventId: string | undefined) => {
  return useQuery<EventParticipant[]>({
    queryKey: eventParticipantKeys.byEvent(eventId ?? ""),
    queryFn: async () => {
      if (!eventId) return [];

      // 1. Fetch participants
      const { data: rows, error } = await supabase
        .from("event_participants")
        .select("id, user_id, joined_at")
        .eq("event_id", eventId)
        .order("joined_at", { ascending: true });

      if (error) throw error;
      if (!rows || rows.length === 0) return [];

      // 2. Fetch profiles + first photo for those user_ids
      const userIds = rows.map((r: any) => String(r.user_id));
      const [{ data: profiles }, { data: photoRows }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds),
        supabase
          .from("profile_photos")
          .select("profile_id, url")
          .in("profile_id", userIds)
          .order("order", { ascending: true }),
      ]);

      const profileMap: Record<string, any> = {};
      for (const p of profiles ?? []) {
        profileMap[String(p.id)] = p;
      }
      // First photo per user
      const firstPhotoMap: Record<string, string> = {};
      for (const ph of photoRows ?? []) {
        const pid = String((ph as any).profile_id);
        if (!firstPhotoMap[pid]) firstPhotoMap[pid] = String((ph as any).url);
      }

      // 3. Merge
      const participants = await Promise.all(
        rows.map(async (row: any) => {
          const uid = String(row.user_id);
          const profile = profileMap[uid];
          let avatarUrl: string | null = null;
          const photoPath = firstPhotoMap[uid];
          if (photoPath) {
            avatarUrl = await createSignedProfilePhotoUrl(photoPath);
          }
          return {
            id: String(row.id),
            userId: uid,
            joinedAt: String(row.joined_at),
            displayName: profile?.display_name ?? null,
            avatarUrl,
          };
        }),
      );

      return participants;
    },
    enabled: Boolean(eventId),
    staleTime: 60_000,
  });
};

// ── Messages (with Realtime) ─────────────────────────────

export type EventMessage = {
  id: string;
  eventId: string;
  senderId: string;
  senderName: string | null;
  senderAvatar: string | null;
  body: string;
  createdAt: string;
};

export const useEventMessagesQuery = (eventId: string | undefined) => {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`event_messages:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "event_messages",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const row = payload.new as any;
          queryClient.setQueryData<EventMessage[]>(
            eventMessageKeys.byEvent(eventId),
            (old = []) => [
              ...old,
              {
                id: String(row.id),
                eventId: String(row.event_id),
                senderId: String(row.sender_id),
                senderName: null,
                senderAvatar: null,
                body: String(row.body),
                createdAt: String(row.created_at),
              },
            ],
          );
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, queryClient]);

  return useQuery<EventMessage[]>({
    queryKey: eventMessageKeys.byEvent(eventId ?? ""),
    queryFn: async () => {
      if (!eventId) return [];

      const { data: rows, error } = await supabase
        .from("event_messages")
        .select("id, event_id, sender_id, body, created_at")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true })
        .limit(200);

      if (error) throw error;
      if (!rows || rows.length === 0) return [];

      // Fetch profiles + first photo for all unique senders
      const senderIds = [...new Set(rows.map((r: any) => String(r.sender_id)))];
      const [{ data: profiles }, { data: photoRows }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", senderIds),
        supabase
          .from("profile_photos")
          .select("profile_id, url")
          .in("profile_id", senderIds)
          .order("order", { ascending: true }),
      ]);

      const profileMap: Record<string, any> = {};
      for (const p of profiles ?? []) {
        profileMap[String(p.id)] = p;
      }
      const firstPhotoMap: Record<string, string> = {};
      for (const ph of photoRows ?? []) {
        const pid = String((ph as any).profile_id);
        if (!firstPhotoMap[pid]) firstPhotoMap[pid] = String((ph as any).url);
      }

      const messages = await Promise.all(
        rows.map(async (row: any) => {
          const sid = String(row.sender_id);
          const profile = profileMap[sid];
          let senderAvatar: string | null = null;
          const photoPath = firstPhotoMap[sid];
          if (photoPath) {
            senderAvatar = await createSignedProfilePhotoUrl(photoPath);
          }
          return {
            id: String(row.id),
            eventId: String(row.event_id),
            senderId: String(row.sender_id),
            senderName: profile?.display_name ?? null,
            senderAvatar,
            body: String(row.body),
            createdAt: String(row.created_at),
          };
        }),
      );

      return messages;
    },
    enabled: Boolean(eventId),
    staleTime: 10_000,
  });
};

// ── Send message ─────────────────────────────────────────

export const useSendEventMessageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    unknown,
    { eventId: string; eventType: EventType; senderId: string; body: string }
  >({
    mutationFn: async ({ eventId, eventType, senderId, body }) => {
      if (eventType === "challenge") {
        const { data: existingParticipant, error: existingParticipantError } =
          await supabase
            .from("event_participants")
            .select("id")
            .eq("event_id", eventId)
            .eq("user_id", senderId)
            .maybeSingle();

        if (existingParticipantError) throw existingParticipantError;

        if (!existingParticipant) {
          const { error: eventParticipantError } = await supabase
          .from("event_participants")
            .insert({
              event_id: eventId,
              event_type: "challenge",
              user_id: senderId,
            });
          if (eventParticipantError) throw eventParticipantError;
        }
      }

      const { error } = await supabase.from("event_messages").insert({
        event_id: eventId,
        event_type: eventType,
        sender_id: senderId,
        body: body.trim(),
      });
      if (error) throw error;
    },
    onSuccess: (_data, { senderId }) => {
      queryClient.invalidateQueries({ queryKey: myEventGroupsKeys.all(senderId) });
    },
  });
};

// ── Delete message (own or admin) ────────────────────────

export const useDeleteEventMessageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, { messageId: string; eventId: string }>({
    mutationFn: async ({ messageId }) => {
      const { error } = await supabase
        .from("event_messages")
        .delete()
        .eq("id", messageId);
      if (error) throw error;
    },
    onSuccess: (_data, { messageId, eventId }) => {
      queryClient.setQueryData<EventMessage[]>(
        eventMessageKeys.byEvent(eventId),
        (old = []) => old.filter((m) => m.id !== messageId),
      );
    },
  });
};

// ── Kick participant (admin only) ────────────────────────

export const useKickParticipantMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    unknown,
    { participantUserId: string; eventId: string; eventType: EventType }
  >({
    mutationFn: async ({ participantUserId, eventId }) => {
      const { error } = await supabase
        .from("event_participants")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", participantUserId);
      if (error) throw error;
    },
    onSuccess: (_data, { eventId, eventType }) => {
      queryClient.invalidateQueries({
        queryKey: eventParticipantKeys.byEvent(eventId),
      });
      queryClient.invalidateQueries({
        queryKey: eventType === "event" ? eventsKeys.all : challengesKeys.all,
      });
    },
  });
};

// ──────────────────────────────────────────────────────────
// My Event Groups (events + challenges the user participates in, with last message)
// ──────────────────────────────────────────────────────────

export type EventGroupSummary = {
  eventId: string;
  eventType: EventType;
  title: string;
  image: string | number;
  participantCount: number;
  lastMessage: string | null;
  lastMessageAt: string | null;
  /** Full EventFeedItem so we can navigate to EventChat */
  event: EventFeedItem;
};

export const myEventGroupsKeys = {
  all: (userId: string) => ["myEventGroups", userId] as const,
};

export const useMyEventGroupsQuery = (userId: string | undefined) => {
  return useQuery<EventGroupSummary[]>({
    queryKey: myEventGroupsKeys.all(userId ?? ""),
    queryFn: async () => {
      if (!userId) return [];

      const { data: eventParticipations, error: eventParticipationErr } = await supabase
        .from("event_participants")
        .select("event_id, event_type")
        .eq("user_id", userId);

      if (eventParticipationErr) throw eventParticipationErr;

      const {
        data: challengeParticipations,
        error: challengeParticipationErr,
      } = await supabase
        .from("challenge_participants")
        .select("challenge_id")
        .eq("user_id", userId);

      if (challengeParticipationErr) throw challengeParticipationErr;

      const eventIds = (eventParticipations ?? [])
        .filter((p: any) => p.event_type === "event")
        .map((p: any) => String(p.event_id));
      const challengeIdsFromEvents = (eventParticipations ?? [])
        .filter((p: any) => p.event_type === "challenge")
        .map((p: any) => String(p.event_id));
      const challengeIdsFromChallenges = (challengeParticipations ?? []).map((p: any) =>
        String(p.challenge_id),
      );
      const challengeIds = Array.from(
        new Set([...challengeIdsFromEvents, ...challengeIdsFromChallenges]),
      );

      if (eventIds.length === 0 && challengeIds.length === 0) return [];

      const [eventsRes, challengesRes] = await Promise.all([
        eventIds.length > 0
          ? supabase.from("events").select("*").in("id", eventIds)
          : Promise.resolve({ data: [], error: null }),
        challengeIds.length > 0
          ? supabase.from("challenges").select("*").in("id", challengeIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (eventsRes.error) throw eventsRes.error;
      if (challengesRes.error) throw challengesRes.error;

      const allIds = [...eventIds, ...challengeIds];

      // 3. Fetch last message per event group
      // event_messages doesn't have a "last per group" aggregate, so fetch
      // last message for each event_id we care about
      const { data: lastMsgs, error: msgErr } = await supabase
        .from("event_messages")
        .select("event_id, body, created_at")
        .in("event_id", allIds)
        .order("created_at", { ascending: false });

      if (msgErr) throw msgErr;

      // Build a map: eventId -> last message
      const lastMsgMap: Record<string, { body: string; createdAt: string }> = {};
      for (const m of lastMsgs ?? []) {
        const eid = String((m as any).event_id);
        if (!lastMsgMap[eid]) {
          lastMsgMap[eid] = {
            body: String((m as any).body),
            createdAt: String((m as any).created_at),
          };
        }
      }

      // 4. Map to summaries
      const groups: EventGroupSummary[] = [];

      for (const row of eventsRes.data ?? []) {
        const mapped = mapEventRow(row as any);
        const last = lastMsgMap[mapped.id];
        groups.push({
          eventId: mapped.id,
          eventType: "event",
          title: mapped.title,
          image: mapped.image,
          participantCount:
            Number((row as any).participant_count ?? 0) || 0,
          lastMessage: last?.body ?? null,
          lastMessageAt: last?.createdAt ?? null,
          event: mapped,
        });
      }

      for (const row of challengesRes.data ?? []) {
        const mapped = mapChallengeRow(row as any);
        const last = lastMsgMap[mapped.id];
        groups.push({
          eventId: mapped.id,
          eventType: "challenge",
          title: mapped.title,
          image: mapped.image,
          participantCount:
            Number((row as any).participant_count ?? 0) || 0,
          lastMessage: last?.body ?? null,
          lastMessageAt: last?.createdAt ?? null,
          event: mapped,
        });
      }

      // Sort by most recent message first, then by title
      groups.sort((a, b) => {
        if (a.lastMessageAt && b.lastMessageAt)
          return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
        if (a.lastMessageAt) return -1;
        if (b.lastMessageAt) return 1;
        return a.title.localeCompare(b.title);
      });

      return groups;
    },
    enabled: Boolean(userId),
    staleTime: 30_000,
  });
};
