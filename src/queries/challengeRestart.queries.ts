import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { supabase } from "../lib/supabase";
import { assertAcceptableContent } from "../lib/moderation";
import { encodeChallengeDescriptionWithPreset } from "../constants/challengeMediaPresets";
import {
  DAY_MEDIA_BUCKET,
  type ChallengeDay,
  type DayAttachment,
} from "../lib/challengeDayContent";
import {
  challengesKeys,
  mapChallengeRow,
  maybeUploadEventImage,
  myEventGroupsKeys,
  type EventFeedItem,
} from "./events.queries";

export type ChallengeInvitationStatus = "pending" | "accepted" | "rejected";

export type ChallengeInvitation = {
  id: string;
  challengeId: string;
  inviteeId: string;
  invitedBy: string;
  status: ChallengeInvitationStatus;
  createdAt: string;
};

export type ReceivedChallengeInvitation = ChallengeInvitation & {
  challenge: EventFeedItem;
};

export const challengeInvitationKeys = {
  all: ["challengeInvitations"] as const,
  received: (userId?: string) =>
    [...challengeInvitationKeys.all, "received", userId ?? "anon"] as const,
  forChallenge: (challengeId?: string) =>
    [...challengeInvitationKeys.all, "challenge", challengeId ?? ""] as const,
};

const mapInvitation = (row: Record<string, any>): ChallengeInvitation => ({
  id: String(row.id),
  challengeId: String(row.challenge_id),
  inviteeId: String(row.invitee_id),
  invitedBy: String(row.invited_by),
  status:
    row.status === "accepted" || row.status === "rejected" ? row.status : "pending",
  createdAt: String(row.created_at ?? ""),
});

/** Invitations I received, with the (private) challenge each one points to. */
export const useReceivedChallengeInvitationsQuery = (userId?: string) =>
  useQuery<ReceivedChallengeInvitation[]>({
    queryKey: challengeInvitationKeys.received(userId),
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_invitations")
        .select("*")
        .eq("invitee_id", userId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const invitations = (data ?? []).map(mapInvitation);
      if (invitations.length === 0) return [];
      const ids = Array.from(new Set(invitations.map((item) => item.challengeId)));
      const { data: rows, error: challengesError } = await supabase
        .from("challenges")
        .select("*")
        .in("id", ids);
      if (challengesError) throw challengesError;
      const byId = new Map(
        (rows ?? []).map((row) => [String(row.id), mapChallengeRow(row)]),
      );
      return invitations.flatMap((invitation) => {
        const challenge = byId.get(invitation.challengeId);
        return challenge ? [{ ...invitation, challenge }] : [];
      });
    },
  });

/** Invitations sent for one challenge (visible to the owner who sent them). */
export const useChallengeInviteesQuery = (challengeId?: string, enabled = true) =>
  useQuery<ChallengeInvitation[]>({
    queryKey: challengeInvitationKeys.forChallenge(challengeId),
    enabled: Boolean(challengeId) && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_invitations")
        .select("*")
        .eq("challenge_id", challengeId as string)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapInvitation);
    },
  });

const invalidateChallengeLists = (
  queryClient: ReturnType<typeof useQueryClient>,
  userId?: string,
) => {
  void queryClient.invalidateQueries({ queryKey: challengesKeys.all });
  void queryClient.invalidateQueries({ queryKey: challengeInvitationKeys.all });
  if (userId) {
    void queryClient.invalidateQueries({ queryKey: myEventGroupsKeys.all(userId) });
  }
};

export type RestartChallengeInput = {
  userId: string;
  source: EventFeedItem;
  title: string;
  description: string;
  /** Local uri or remote url. Same as the original cover when unchanged. */
  imageUri: string | null;
  startsAt: string;
  hostName: string | null;
  inviteeIds: string[];
};

export type RestartChallengeResult = {
  challengeId: string;
  /** False when some uploaded day files could not be copied to the new challenge. */
  mediaCopied: boolean;
};

const fileExtension = (path: string) => {
  const name = path.split("/").pop() ?? "";
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1) : "bin";
};

/**
 * Uploaded photos/audio of each day live under the source challenge path, so
 * members of the copy could not read them. Copy each file under the new
 * challenge and republish the day (the SQL copy already brought text + links).
 */
const copyDayMedia = async (
  sourceId: string,
  targetId: string,
  userId: string,
): Promise<boolean> => {
  const { data: sourceDays, error } = await supabase
    .from("challenge_days")
    .select("*")
    .eq("challenge_id", sourceId);
  if (error) return false;
  const days = (sourceDays ?? []) as ChallengeDay[];
  const withMedia = days.filter((day) =>
    (day.attachments ?? []).some((item) => item.type !== "link" && item.path),
  );
  if (withMedia.length === 0) return true;

  const { data: targetDays, error: targetError } = await supabase
    .from("challenge_days")
    .select("*")
    .eq("challenge_id", targetId);
  if (targetError) return false;
  const targetByDay = new Map(
    ((targetDays ?? []) as ChallengeDay[]).map((day) => [day.day, day]),
  );

  let ok = true;
  for (const day of withMedia) {
    const target = targetByDay.get(day.day);
    if (!target) {
      ok = false;
      continue;
    }
    const copied: DayAttachment[] = [];
    for (const item of day.attachments) {
      if (item.type === "link" || !item.path) continue;
      const id = randomUUID();
      const nextPath = `${targetId}/${day.day}/${userId}/${id}.${fileExtension(item.path)}`;
      const { error: copyError } = await supabase.storage
        .from(DAY_MEDIA_BUCKET)
        .copy(item.path, nextPath);
      if (copyError) {
        ok = false;
        continue;
      }
      copied.push({ id, type: item.type, name: item.name, path: nextPath, mime: item.mime, size: item.size });
    }
    if (copied.length === 0) continue;
    // Keep the original order: links stay where they were relative to media.
    const linkIds = new Set(target.attachments.map((item) => item.id));
    let mediaIndex = 0;
    const attachments = day.attachments.flatMap((item) => {
      if (item.type === "link") return linkIds.has(item.id) ? [item] : [];
      const next = copied[mediaIndex];
      if (next && item.path && next.name === item.name) {
        mediaIndex += 1;
        return [next];
      }
      return [];
    });
    const { error: saveError } = await supabase.rpc("save_challenge_day", {
      target_challenge: targetId,
      target_day: day.day,
      new_title: target.title,
      new_description: target.description,
      new_attachments: attachments,
      expected_revision: target.revision,
    });
    if (saveError) ok = false;
  }
  return ok;
};

export const useRestartChallengeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<RestartChallengeResult, unknown, RestartChallengeInput>({
    mutationFn: async (input) => {
      assertAcceptableContent([input.title, input.description]);
      const coverChanged = Boolean(input.imageUri && input.imageUri !== input.source.imageUrl);
      const imageUrl = coverChanged
        ? await maybeUploadEventImage(input.imageUri, `${input.userId}/challenges`)
        : null;
      const description = encodeChallengeDescriptionWithPreset(
        input.description.trim() || null,
        coverChanged ? null : input.source.imagePresetId ?? null,
        input.startsAt,
      );
      const { data, error } = await supabase.rpc("restart_challenge", {
        source_id: input.source.id,
        new_title: input.title.trim(),
        new_subtitle: input.source.subtitle ?? null,
        new_description: description,
        new_image_url: imageUrl,
        new_host_name: input.hostName,
        invitee_ids: input.inviteeIds,
      });
      if (error) throw error;
      const challengeId = String(data);
      const mediaCopied = await copyDayMedia(input.source.id, challengeId, input.userId).catch(
        () => false,
      );
      return { challengeId, mediaCopied };
    },
    onSuccess: (_result, input) => invalidateChallengeLists(queryClient, input.userId),
  });
};

export const useInviteToChallengeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<number, unknown, { challengeId: string; inviteeIds: string[] }>({
    mutationFn: async ({ challengeId, inviteeIds }) => {
      const { data, error } = await supabase.rpc("invite_to_challenge", {
        target: challengeId,
        invitee_ids: inviteeIds,
      });
      if (error) throw error;
      return Number(data ?? 0);
    },
    onSuccess: (_count, { challengeId }) => {
      void queryClient.invalidateQueries({
        queryKey: challengeInvitationKeys.forChallenge(challengeId),
      });
    },
  });
};

export const useRespondChallengeInvitationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<string, unknown, { id: string; accept: boolean; userId: string }>({
    mutationFn: async ({ id, accept }) => {
      const { data, error } = await supabase.rpc("respond_challenge_invitation", {
        invitation_id: id,
        accept_invitation: accept,
      });
      if (error) throw error;
      return String(data);
    },
    onSuccess: (_challengeId, { userId }) => invalidateChallengeLists(queryClient, userId),
  });
};
