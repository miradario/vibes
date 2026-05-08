import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type SupabaseClient = ReturnType<typeof createClient>;

type WebhookPayload = {
  type?: string;
  table?: string;
  schema?: string;
  record?: Record<string, unknown> | null;
  new?: Record<string, unknown> | null;
};

type PushTokenRow = {
  id: string;
  token: string;
  platform: string;
  provider: string;
};

type OutgoingNotification = {
  recipientId: string;
  title: string;
  body: string;
  data: Record<string, string>;
  badgeCount?: number;
};

type FirebaseServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
};

const jsonHeaders = { "Content-Type": "application/json" };
const textEncoder = new TextEncoder();

const base64UrlEncode = (input: string | Uint8Array) => {
  const bytes = typeof input === "string" ? textEncoder.encode(input) : input;
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const pemToArrayBuffer = (pem: string) => {
  const sanitized = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const binary = atob(sanitized);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
};

const getFirebaseServiceAccount = (): FirebaseServiceAccount => {
  const rawJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");

  if (rawJson) {
    const parsed = JSON.parse(rawJson) as FirebaseServiceAccount;
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is missing required fields");
    }
    return parsed;
  }

  const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
  const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL");
  const privateKey = Deno.env.get("FIREBASE_PRIVATE_KEY")?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase service account secrets");
  }

  return {
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKey,
  };
};

const getAccessToken = async (account: FirebaseServiceAccount) => {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: account.token_uri ?? "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const unsignedJwt = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claimSet))}`;
  const signingKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(account.private_key),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    signingKey,
    textEncoder.encode(unsignedJwt),
  );

  const jwt = `${unsignedJwt}.${base64UrlEncode(new Uint8Array(signature))}`;
  const tokenUri = account.token_uri ?? "https://oauth2.googleapis.com/token";
  const response = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to obtain Firebase access token: ${errorText}`);
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Firebase token response missing access_token");
  }

  return data.access_token;
};

const createAdminClient = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase service role configuration");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
};

const getRecord = (payload: WebhookPayload) => payload.record ?? payload.new ?? null;

const getPushTokens = async (supabase: SupabaseClient, userIds: string[]) => {
  if (userIds.length === 0) return new Map<string, PushTokenRow[]>();

  const { data, error } = await supabase
    .from("push_tokens")
    .select("id, user_id, token, platform, provider")
    .in("user_id", userIds)
    .eq("is_active", true);

  if (error) throw error;

  const tokensByUser = new Map<string, PushTokenRow[]>();
  for (const row of (data ?? []) as Array<PushTokenRow & { user_id: string }>) {
    if (row.provider !== "fcm") continue;
    const existing = tokensByUser.get(row.user_id) ?? [];
    existing.push({
      id: row.id,
      token: row.token,
      platform: row.platform,
      provider: row.provider,
    });
    tokensByUser.set(row.user_id, existing);
  }

  return tokensByUser;
};

const markTokenInactive = async (supabase: SupabaseClient, tokenId: string) => {
  const { error } = await supabase
    .from("push_tokens")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", tokenId);

  if (error) {
    console.error("[send-push] failed to deactivate token", tokenId, error.message);
  }
};

const sendFirebaseMessage = async (
  accessToken: string,
  account: FirebaseServiceAccount,
  pushToken: PushTokenRow,
  title: string,
  body: string,
  data: Record<string, string>,
  badgeCount?: number,
) => {
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: pushToken.token,
          notification: { title, body },
          data,
          android: {
            priority: "high",
            notification: {
              channel_id: "default",
              sound: "default",
              ...(typeof badgeCount === "number" ? { notification_count: badgeCount } : {}),
            },
          },
          ...(pushToken.platform === "ios"
            ? {
                apns: {
                  payload: {
                    aps: {
                      sound: "default",
                      ...(typeof badgeCount === "number" ? { badge: badgeCount } : {}),
                    },
                  },
                },
              }
            : {}),
        },
      }),
    },
  );

  if (response.ok) {
    return { ok: true as const };
  }

  const errorText = await response.text();
  return { ok: false as const, errorText, status: response.status };
};

const fetchDisplayNames = async (supabase: SupabaseClient, userIds: string[]) => {
  if (userIds.length === 0) return new Map<string, string>();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds);

  if (error) throw error;

  const names = new Map<string, string>();
  for (const row of data ?? []) {
    names.set(String((row as { id: string }).id), String((row as { display_name: string }).display_name));
  }
  return names;
};

const fetchNotificationPreferences = async (
  supabase: SupabaseClient,
  userIds: string[],
) => {
  if (userIds.length === 0) return new Map<string, boolean>();

  const { data, error } = await supabase
    .from("user_preferences")
    .select("user_id, notifications_enabled")
    .in("user_id", userIds);

  if (error) throw error;

  const preferences = new Map<string, boolean>();
  for (const row of data ?? []) {
    const typedRow = row as { user_id: string; notifications_enabled: boolean | null };
    preferences.set(typedRow.user_id, typedRow.notifications_enabled !== false);
  }

  return preferences;
};

const isLaterTimestamp = (value: string | null, reference: string | null) => {
  if (!value) return false;
  if (!reference) return true;

  const valueTime = new Date(value).getTime();
  const referenceTime = new Date(reference).getTime();

  if (Number.isNaN(valueTime)) return false;
  if (Number.isNaN(referenceTime)) return true;

  return valueTime > referenceTime;
};

const fetchDirectUnreadCountForUser = async (
  supabase: SupabaseClient,
  userId: string,
) => {
  const { data: matchRows, error: matchError } = await supabase
    .from("matches")
    .select("id, user1_id, user2_id")
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

  if (matchError) throw matchError;

  const matchIds = (matchRows ?? []).map((row) => String((row as { id: string }).id));
  if (matchIds.length === 0) return 0;

  const [messagesRes, readsRes] = await Promise.all([
    supabase
      .from("messages")
      .select("match_id, sender_id, created_at")
      .in("match_id", matchIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("direct_message_reads")
      .select("match_id, last_read_at")
      .eq("user_id", userId)
      .in("match_id", matchIds),
  ]);

  if (messagesRes.error) throw messagesRes.error;
  if (readsRes.error) throw readsRes.error;

  const lastMessageByMatch = new Map<string, { createdAt: string | null; senderId: string | null }>();
  for (const row of messagesRes.data ?? []) {
    const matchId = String((row as { match_id: string }).match_id ?? "");
    if (!matchId || lastMessageByMatch.has(matchId)) continue;

    lastMessageByMatch.set(matchId, {
      createdAt: String((row as { created_at: string | null }).created_at ?? "") || null,
      senderId: String((row as { sender_id: string | null }).sender_id ?? "") || null,
    });
  }

  const lastReadByMatch = new Map<string, string>();
  for (const row of readsRes.data ?? []) {
    const matchId = String((row as { match_id: string }).match_id ?? "");
    const lastReadAt = String((row as { last_read_at: string | null }).last_read_at ?? "") || null;
    if (!matchId || !lastReadAt) continue;
    lastReadByMatch.set(matchId, lastReadAt);
  }

  let unreadCount = 0;
  for (const matchId of matchIds) {
    const lastMessage = lastMessageByMatch.get(matchId);
    if (!lastMessage?.createdAt || !lastMessage.senderId || lastMessage.senderId === userId) {
      continue;
    }

    const lastReadAt = lastReadByMatch.get(matchId) ?? null;
    if (isLaterTimestamp(lastMessage.createdAt, lastReadAt)) {
      unreadCount += 1;
    }
  }

  return unreadCount;
};

const buildDirectMessageNotifications = async (
  supabase: SupabaseClient,
  record: Record<string, unknown>,
) => {
  const matchId = String(record.match_id ?? "");
  const senderId = String(record.sender_id ?? "");
  const text = String(record.text ?? "").trim();
  const messageId = String(record.id ?? "");

  if (!matchId || !senderId || !text) {
    throw new Error("messages webhook missing match_id, sender_id, or text");
  }

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("user1_id, user2_id")
    .eq("id", matchId)
    .single();

  if (matchError) throw matchError;

  const recipientId = match.user1_id === senderId ? match.user2_id : match.user1_id;
  const names = await fetchDisplayNames(supabase, [senderId]);
  const senderName = names.get(senderId) ?? "Alguien";

  return [
    {
      recipientId,
      title: `Nuevo mensaje de ${senderName}`,
      body: text.slice(0, 120),
      data: {
        type: "direct_message",
        matchId,
        messageId,
        senderId,
      },
    },
  ] satisfies OutgoingNotification[];
};

const buildEventMessageNotifications = async (
  supabase: SupabaseClient,
  record: Record<string, unknown>,
) => {
  const eventId = String(record.event_id ?? "");
  const eventType = String(record.event_type ?? "");
  const senderId = String(record.sender_id ?? "");
  const body = String(record.body ?? "").trim();
  const messageId = String(record.id ?? "");

  if (!eventId || !eventType || !senderId || !body) {
    throw new Error("event_messages webhook missing event_id, event_type, sender_id, or body");
  }

  const [{ data: participants, error: participantError }, senderNames, groupTitle] = await Promise.all([
    supabase
      .from("event_participants")
      .select("user_id")
      .eq("event_id", eventId),
    fetchDisplayNames(supabase, [senderId]),
    (async () => {
      const table = eventType === "challenge" ? "challenges" : "events";
      const { data, error } = await supabase.from(table).select("title").eq("id", eventId).single();
      if (error) throw error;
      return String((data as { title: string }).title ?? "Grupo");
    })(),
  ]);

  if (participantError) throw participantError;

  const senderName = senderNames.get(senderId) ?? "Alguien";

  return (participants ?? [])
    .map((participant) => String((participant as { user_id: string }).user_id))
    .filter((userId) => userId && userId !== senderId)
    .map((recipientId) => ({
      recipientId,
      title: `${senderName} escribio en ${groupTitle}`,
      body: body.slice(0, 120),
      data: {
        type: "event_message",
        eventId,
        eventType,
        messageId,
        senderId,
      },
    })) satisfies OutgoingNotification[];
};

const buildMatchNotifications = async (
  supabase: SupabaseClient,
  record: Record<string, unknown>,
) => {
  const user1Id = String(record.user1_id ?? "");
  const user2Id = String(record.user2_id ?? "");
  const matchId = String(record.id ?? "");

  if (!user1Id || !user2Id || !matchId) {
    throw new Error("matches webhook missing id, user1_id, or user2_id");
  }

  const names = await fetchDisplayNames(supabase, [user1Id, user2Id]);

  return [
    {
      recipientId: user1Id,
      title: "Tenes un nuevo match",
      body: `Conectaste con ${names.get(user2Id) ?? "alguien"}. Abri Flow para verlo.`,
      data: {
        type: "new_match",
        matchId,
        otherUserId: user2Id,
      },
    },
    {
      recipientId: user2Id,
      title: "Tenes un nuevo match",
      body: `Conectaste con ${names.get(user1Id) ?? "alguien"}. Abri Flow para verlo.`,
      data: {
        type: "new_match",
        matchId,
        otherUserId: user1Id,
      },
    },
  ] satisfies OutgoingNotification[];
};

const buildNotifications = async (
  supabase: SupabaseClient,
  payload: WebhookPayload,
): Promise<OutgoingNotification[]> => {
  const table = payload.table;
  const record = getRecord(payload);

  if (!table || !record) {
    throw new Error("Webhook payload missing table or record");
  }

  if (table === "messages") {
    return buildDirectMessageNotifications(supabase, record);
  }

  if (table === "event_messages") {
    return buildEventMessageNotifications(supabase, record);
  }

  if (table === "matches") {
    return buildMatchNotifications(supabase, record);
  }

  return [];
};

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  try {
    const payload = (await req.json()) as WebhookPayload;
    if (payload.type && payload.type !== "INSERT") {
      return new Response(JSON.stringify({ ignored: true, reason: "unsupported event type" }), {
        status: 200,
        headers: jsonHeaders,
      });
    }

    const supabase = createAdminClient();
    const notifications = await buildNotifications(supabase, payload);

    if (notifications.length === 0) {
      return new Response(JSON.stringify({ sent: 0, skipped: true }), {
        status: 200,
        headers: jsonHeaders,
      });
    }

    const recipientIds = Array.from(new Set(notifications.map((item) => item.recipientId)));
    const notificationPreferences = await fetchNotificationPreferences(supabase, recipientIds);
    const allowedNotifications = notifications.filter(
      (item) => notificationPreferences.get(item.recipientId) !== false,
    );

    if (allowedNotifications.length === 0) {
      return new Response(JSON.stringify({ sent: 0, skipped: true, reason: "notifications_disabled" }), {
        status: 200,
        headers: jsonHeaders,
      });
    }

    const allowedRecipientIds = Array.from(
      new Set(allowedNotifications.map((item) => item.recipientId)),
    );
    const directMessageRecipientIds = Array.from(
      new Set(
        allowedNotifications
          .filter((item) => item.data.type === "direct_message")
          .map((item) => item.recipientId),
      ),
    );
    const directBadgeCounts = new Map<string, number>();

    await Promise.all(
      directMessageRecipientIds.map(async (recipientId) => {
        const badgeCount = await fetchDirectUnreadCountForUser(supabase, recipientId);
        directBadgeCounts.set(recipientId, badgeCount);
      }),
    );

    const notificationsWithBadges = allowedNotifications.map((item) => ({
      ...item,
      badgeCount:
        item.data.type === "direct_message"
          ? directBadgeCounts.get(item.recipientId) ?? 0
          : undefined,
    }));

    const tokensByUser = await getPushTokens(supabase, allowedRecipientIds);
    const account = getFirebaseServiceAccount();
    const accessToken = await getAccessToken(account);

    let sentCount = 0;
    let inactiveCount = 0;

    for (const notification of notificationsWithBadges) {
      const tokens = tokensByUser.get(notification.recipientId) ?? [];
      for (const token of tokens) {
        const result = await sendFirebaseMessage(
          accessToken,
          account,
          token,
          notification.title,
          notification.body,
          notification.data,
          notification.badgeCount,
        );

        if (result.ok) {
          sentCount += 1;
          continue;
        }

        console.error("[send-push] firebase send failed", {
          tokenId: token.id,
          recipientId: notification.recipientId,
          status: result.status,
          errorText: result.errorText,
        });

        if (result.status === 400 || result.status === 404) {
          await markTokenInactive(supabase, token.id);
          inactiveCount += 1;
        }
      }
    }

    return new Response(
      JSON.stringify({ sent: sentCount, deactivatedTokens: inactiveCount }),
      {
        status: 200,
        headers: jsonHeaders,
      },
    );
  } catch (error) {
    console.error("[send-push] unexpected error", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
