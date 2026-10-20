// Re-engagement pushes queued by private.dispatch_reengagement_notifications().
// Uses the existing push types so taps reuse the app's current navigation and
// each case respects its existing opt-out (connections, events, challenges).

type Client = { from: (table: string) => any };
type Notification = { recipientId: string; title: string; body: string; data: Record<string, string> };

// All re-engagement texts live here so final wording can be swapped verbatim.
// Pending connections always go in one push per day. 1-2 people keep the
// original copy; 3+ (Agus' rule) switch to the grouped copy.
export const MAX_LISTED_NAMES = 3;

export const REENGAGEMENT_COPY = {
  pendingConnections: {
    title: "Te están esperando",
    one: (name: string) => `${name} quiere conectar con vos`,
    many: (name: string, others: number) =>
      `${name} y ${others === 1 ? "1 persona más quieren" : `${others} personas más quieren`} conectar con vos`,
  },
  groupedConnections: {
    title: "Alguien quiere conectar con vos",
    // Agus' wording: first names comma-separated; over two, first two + "...".
    body: (names: string[]) => names.length > 2 ? `${names.slice(0, 2).join(", ")}...` : names.join(", "),
  },
  newEvent: {
    title: "Hay un nuevo evento que creemos que podría interesarte",
    body: (title: string | null) => title ?? "",
  },
  newChallenge: {
    title: "Tenemos un nuevo desafío que te podría interesar",
    body: (title: string | null) => title ?? "",
  },
};

export const reengagementCopy = (
  kind: string,
  itemCount: number,
  title: string | null,
  names: string[],
) => {
  if (kind === "pending_connections") {
    if (itemCount >= 3) {
      const copy = REENGAGEMENT_COPY.groupedConnections;
      return { title: copy.title, body: copy.body(names.slice(0, MAX_LISTED_NAMES)) };
    }
    const copy = REENGAGEMENT_COPY.pendingConnections;
    const first = names[0] ?? "Alguien";
    return { title: copy.title, body: itemCount > 1 ? copy.many(first, itemCount - 1) : copy.one(first) };
  }
  const copy = kind === "new_event" ? REENGAGEMENT_COPY.newEvent : REENGAGEMENT_COPY.newChallenge;
  return { title: copy.title, body: copy.body(title) };
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
    // Every sender in the job was marked as reminded at queue time, so a
    // grouped push never repeats any of them. The tap opens incoming requests.
    const listed = senders.slice(0, MAX_LISTED_NAMES);
    const names = await fetchDisplayNames(listed);
    return [{
      recipientId: job.user_id,
      ...reengagementCopy(job.kind, senders.length, null, listed.map((id) => names.get(id) ?? "Alguien")),
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
    ...reengagementCopy(job.kind, 1, candidate.title, []),
    data: {
      type: challenge ? "challenge_reminder" : "event_reminder",
      eventId: job.subject_id,
      eventType: challenge ? "challenge" : "event",
      reengagementId: job.id,
    },
  }];
};
