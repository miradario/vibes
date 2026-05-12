import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type SupabaseClient = ReturnType<typeof createClient>;

type RegisterPushTokenBody = {
  token?: unknown;
  platform?: unknown;
  provider?: unknown;
};

const jsonHeaders = { "Content-Type": "application/json" };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });

const getEnv = (key: string) => {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`Missing ${key}`);
  }
  return value;
};

const createAdminClient = () =>
  createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });

const createCallerClient = (authorizationHeader: string) =>
  createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_ANON_KEY"), {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: authorizationHeader,
      },
    },
  });

const parseBody = async (req: Request): Promise<RegisterPushTokenBody> => {
  const contentType = req.headers.get("Content-Type") ?? "";
  if (!contentType.includes("application/json")) {
    return {};
  }
  return (await req.json()) as RegisterPushTokenBody;
};

const normalizeToken = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizePlatform = (value: unknown): "ios" | "android" | null => {
  if (value === "ios" || value === "android") return value;
  return null;
};

const normalizeProvider = (value: unknown): "apns" | "fcm" | null => {
  if (value === "apns" || value === "fcm") return value;
  return null;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const authorizationHeader = req.headers.get("Authorization") ?? "";
    if (!authorizationHeader) {
      return json({ error: "Missing authorization header" }, 401);
    }

    const callerClient = createCallerClient(authorizationHeader);
    const {
      data: { user },
      error: userError,
    } = await callerClient.auth.getUser();

    if (userError || !user?.id) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await parseBody(req);
    const token = normalizeToken(body.token);
    const platform = normalizePlatform(body.platform);
    const provider = normalizeProvider(body.provider);

    if (!token || !platform || !provider) {
      return json({ error: "Invalid payload" }, 400);
    }

    const supabase = createAdminClient();
    const nowIso = new Date().toISOString();

    const { data: existingRow, error: existingError } = await supabase
      .from("push_tokens")
      .select("id, user_id")
      .eq("token", token)
      .maybeSingle();

    if (existingError) {
      return json({ error: existingError.message }, 500);
    }

    if (!existingRow) {
      const { error: insertError } = await supabase.from("push_tokens").insert({
        user_id: user.id,
        token,
        platform,
        provider,
        is_active: true,
        last_seen_at: nowIso,
      });

      if (insertError) {
        return json({ error: insertError.message }, 500);
      }

      return json({ ok: true, action: "inserted", token });
    }

    const action = existingRow.user_id === user.id ? "updated" : "reassigned";
    const { error: updateError } = await supabase
      .from("push_tokens")
      .update({
        user_id: user.id,
        platform,
        provider,
        is_active: true,
        last_seen_at: nowIso,
      })
      .eq("id", existingRow.id);

    if (updateError) {
      return json({ error: updateError.message }, 500);
    }

    return json({ ok: true, action, token });
  } catch (error) {
    console.error("[register-push-token] unexpected error", error);
    return json({ error: "Unexpected error" }, 500);
  }
});
