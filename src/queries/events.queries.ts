import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { uploadImageToSupabase } from "../lib/supabaseStorage";

const EVENT_ASSETS_BUCKET = "event-assets";
const EVENT_FALLBACK_IMAGE = require("../../assets/images/events/event_meditation2.png");
const CHALLENGE_FALLBACK_IMAGE = require("../../assets/images/logo.png");

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
  hostName?: string | null;
  hostImage?: string | null;
  tags?: string[];
  createdAt?: string | null;
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
  hostName?: string | null;
  hostImage?: string | null;
};

type CreateChallengeInput = {
  createdBy: string;
  title: string;
  subtitle: string;
  description?: string | null;
  durationDays: number;
  imageUri?: string | null;
  hostName?: string | null;
  hostImage?: string | null;
};

export const eventsKeys = {
  all: ["events"] as const,
};

export const challengesKeys = {
  all: ["challenges"] as const,
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
      typeof row.description === "string" && row.description.trim()
        ? row.description
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
    image: imageUrl || (type === "challenge" ? CHALLENGE_FALLBACK_IMAGE : EVENT_FALLBACK_IMAGE),
    imageUrl,
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
  };
};

const mapChallengeRow = (row: EventRow): EventFeedItem => {
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

  return {
    id: String(row.id),
    type: "challenge",
    title: typeof row.title === "string" ? row.title : "Untitled",
    subtitle:
      typeof row.subtitle === "string" && row.subtitle.trim()
        ? row.subtitle
        : "Challenge creado por la comunidad",
    description:
      typeof row.description === "string" && row.description.trim()
        ? row.description
        : null,
    date: durationDays > 0 ? `${durationDays} días` : "Sin duración definida",
    startsAt: null,
    attendees: participantCount > 0 ? `${participantCount} participantes` : "Challenge",
    capacity: null,
    durationDays,
    location: null,
    image: imageUrl || CHALLENGE_FALLBACK_IMAGE,
    imageUrl,
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
      const imageUrl = await maybeUploadEventImage(
        input.imageUri,
        `${input.createdBy}/events`,
      );

      const { data, error } = await supabase
        .from("events")
        .insert({
          type: "event",
          created_by: input.createdBy,
          title: input.title,
          subtitle: input.subtitle,
          description: input.description ?? null,
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

export const useCreateChallengeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<EventFeedItem, unknown, CreateChallengeInput>({
    mutationFn: async (input) => {
      const imageUrl = await maybeUploadEventImage(
        input.imageUri,
        `${input.createdBy}/challenges`,
      );

      const { data, error } = await supabase
        .from("challenges")
        .insert({
          created_by: input.createdBy,
          title: input.title,
          subtitle: input.subtitle,
          description: input.description ?? null,
          duration_days: input.durationDays,
          image_url: imageUrl,
          host_name: input.hostName ?? null,
          host_image_url: input.hostImage ?? null,
        })
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
