// Re-engagement pushes queued by private.dispatch_reengagement_notifications().
// Uses the existing push types so taps reuse the app's current navigation and
// each case respects its existing opt-out (connections, events, challenges).

type Client = { from: (table: string) => any };
type Notification = { recipientId: string; title: string; body: string; data: Record<string, string> };

export const reengagementCopy = (
  kind: string,
  itemCount: number,
  title: string | null,
  firstName: string,
) => {
  if (kind === "pending_connections") {
    const others = itemCount - 1;
    return {
      title: "Te están esperando",
      body: others > 0
        ? `${firstName} y ${others === 1 ? "1 persona más quieren" : `${others} personas más quieren`} conectar con vos`
        : `${firstName} quiere conectar con vos`,
    };
  }
  if (kind === "new_event") {
    return { title: "Un evento que te puede interesar", body: `Se sumó ${title ?? "un nuevo evento"}. Mirá los detalles.` };
  }
  return { title: "Un nuevo desafío para vos", body: `Se sumó ${title ?? "un nuevo desafío"}. ¿Te sumás?` };
};

export const buildReengagementNotification = async (
  supabase: Client,
  record: Record<string, unknown>,
  fetchDisplayNames: (userIds: string[]) => Promise<Map<string, string>>,
): Promise<Notification[]> => {
  const { data: job, error } = await supabase.from("reengagement_notifications")
    .select("*").eq("id", String(record.id ?? "")).maybeSingle();
  if (error) throw error;
  if (!job || job.processed_at) return [];
  const now = Date.now();
  if (new Date(job.due_at).getTime() > now || new Date(job.expires_at).getTime() <= now) return [];

  if (job.kind === "pending_connections") {
    // Reminded senders leave the live view at queue time, so re-check the
    // job's own senders: drop anyone the user already answered.
    const senderIds = (job.sender_ids ?? []) as string[];
    if (!senderIds.length) return [];
    const { data: answered, error: answeredError } = await supabase.from("swipes")
      .select("target_id").eq("swiper_id", job.user_id).in("target_id", senderIds);
    if (answeredError) throw answeredError;
    const done = new Set((answered ?? []).map((row: { target_id: string }) => row.target_id));
    const senders = senderIds.filter((id) => !done.has(id));
    if (!senders.length) return [];
    const names = await fetchDisplayNames([senders[0]]);
    return [{
      recipientId: job.user_id,
      ...reengagementCopy(job.kind, senders.length, null, names.get(senders[0]) ?? "Alguien"),
      data: { type: "connection_request", senderId: senders[0], reengagementId: job.id },
    }];
  }

  // Re-check against live data: a joined event/challenge, a full event or a
  // changed opt-out since queueing cancels the push.
  const { data: candidate, error: candidateError } = await supabase.from("reengagement_candidates")
    .select("subject_id, title").eq("user_id", job.user_id).eq("kind", job.kind).eq("subject_id", job.subject_id)
    .maybeSingle();
  if (candidateError) throw candidateError;
  if (!candidate) return [];

  const challenge = job.kind === "new_challenge";
  return [{
    recipientId: job.user_id,
    ...reengagementCopy(job.kind, 1, candidate.title, ""),
    data: {
      type: challenge ? "challenge_reminder" : "event_reminder",
      eventId: job.subject_id,
      eventType: challenge ? "challenge" : "event",
      reengagementId: job.id,
    },
  }];
};
