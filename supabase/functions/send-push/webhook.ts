export function authorizedWebhook(header: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 32 || !header) return false;
  const expected = `Bearer ${secret}`;
  if (header.length !== expected.length) return false;
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  return difference === 0;
}

export function isConnectionRequest(record: Record<string, unknown>, old?: Record<string, unknown> | null) {
  return record.direction === "like" && old?.direction !== "like" &&
    typeof record.swiper_id === "string" && typeof record.target_id === "string" &&
    !!record.swiper_id && !!record.target_id && record.swiper_id !== record.target_id;
}

// Only the transition to 'accepted' notifies (accepted is final), so retries never duplicate.
export function isChallengeInvitationAccepted(record: Record<string, unknown>, old?: Record<string, unknown> | null) {
  return record.status === "accepted" && old?.status !== "accepted" &&
    typeof record.invitee_id === "string" && typeof record.invited_by === "string" &&
    typeof record.challenge_id === "string" && !!record.invitee_id && !!record.invited_by &&
    !!record.challenge_id && record.invitee_id !== record.invited_by;
}
