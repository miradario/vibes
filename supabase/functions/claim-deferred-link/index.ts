// Claims a pending deferred deep link on the app's first launch.
// Deploy with --no-verify-jwt: it runs before the user has a session.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Body = {
  platform?: unknown;
  clickId?: unknown;
  locale?: unknown;
  osVersion?: unknown;
  deviceModel?: unknown;
  installId?: unknown;
};

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

const str = (value: unknown, max = 200) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const requestIp = (req: Request) => {
  const forwarded = req.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || req.headers.get("x-real-ip")?.trim() || null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_body" }, 400);
  }

  const platform = str(body.platform, 16);
  const clickId = str(body.clickId, 64);
  const installId = str(body.installId, 100);

  let params: Record<string, string | null>;
  if (platform === "android") {
    if (!clickId || !UUID_RE.test(clickId)) return json({ url: null });
    params = { p_click_id: clickId, p_install_id: installId };
  } else if (platform === "ios") {
    const ip = requestIp(req);
    if (!ip) return json({ url: null });
    params = {
      p_ip: ip,
      p_locale: str(body.locale, 35),
      p_os_version: str(body.osVersion, 20),
      p_install_id: installId,
    };
  } else {
    return json({ url: null });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "misconfigured" }, 500);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await admin.rpc("claim_deferred_link", params);
  if (error) {
    console.error("[claim-deferred-link]", error.message);
    return json({ url: null }, 500);
  }
  return json({ url: typeof data === "string" ? data : null });
});
