import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });

// Deployed with --no-verify-jwt: the single-use EMAIL token is the credential.
// Never accept a user id/email/verified flag supplied by the caller.
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "Method not allowed" });
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey)
    return reply(503, { error: "Verification unavailable" });
  let body: { token_hash?: unknown };
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return reply(400, { error: "Invalid request" });
    body = parsed;
  } catch {
    return reply(400, { error: "Invalid request" });
  }
  if (
    typeof body.token_hash !== "string" ||
    !/^[A-Za-z0-9_-]{20,1024}$/.test(body.token_hash)
  )
    return reply(400, { error: "Invalid link" });
  const auth = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await auth.auth.verifyOtp({
    token_hash: body.token_hash,
    type: "email",
  });
  if (error || !data.user?.email || !data.session)
    return reply(400, { error: "Link expired or already used" });
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: updateError } = await admin.auth.admin.updateUserById(
    data.user.id,
    {
      app_metadata: {
        vibes_verified_email: data.user.email,
        vibes_email_verified_at: new Date().toISOString(),
      },
    }
  );
  if (updateError)
    return reply(503, {
      error: "Unable to save verification. Request a new link.",
    });
  return reply(200, {
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
  });
});
