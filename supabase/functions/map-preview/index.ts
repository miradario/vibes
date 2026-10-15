import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Proxy de Google Static Maps para iOS: la key con restricción "iOS apps"
// no sirve para Static Maps, así que la key vive en el servidor.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const MAX_SIZE = 640;
const MIN_SIZE = 64;
const DEFAULT_WIDTH = 640;
const DEFAULT_HEIGHT = 320;
const DEFAULT_ZOOM = 15;
const MAX_QUERY_LENGTH = 300;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const getEnv = (key: string) => {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing ${key}`);
  return value;
};

const clampInt = (
  raw: string | null,
  fallback: number,
  min: number,
  max: number,
) => {
  const value = raw === null ? NaN : Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
};

const parseCoordinate = (raw: string | null, limit: number) => {
  if (raw === null || raw.trim() === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || Math.abs(value) > limit) return null;
  return value;
};

const isAuthorized = async (req: Request) => {
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return false;
  const client = createClient(
    getEnv("SUPABASE_URL"),
    getEnv("SUPABASE_ANON_KEY"),
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: authorization } },
    },
  );
  const { data, error } = await client.auth.getUser();
  return !error && Boolean(data.user);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    if (!(await isAuthorized(req))) {
      return json({ error: "Unauthorized" }, 401);
    }

    const url = new URL(req.url);
    const lat = parseCoordinate(url.searchParams.get("lat"), 90);
    const lng = parseCoordinate(url.searchParams.get("lng"), 180);
    const query = (url.searchParams.get("q") ?? "").trim();

    let center: string;
    if (lat !== null && lng !== null) {
      center = `${lat},${lng}`;
    } else if (query && query.length <= MAX_QUERY_LENGTH) {
      center = query;
    } else {
      return json({ error: "Provide lat/lng or q" }, 400);
    }

    const width = clampInt(url.searchParams.get("width"), DEFAULT_WIDTH, MIN_SIZE, MAX_SIZE);
    const height = clampInt(url.searchParams.get("height"), DEFAULT_HEIGHT, MIN_SIZE, MAX_SIZE);
    const zoom = clampInt(url.searchParams.get("zoom"), DEFAULT_ZOOM, 1, 20);

    const googleUrl = new URL("https://maps.googleapis.com/maps/api/staticmap");
    googleUrl.searchParams.set("center", center);
    googleUrl.searchParams.set("zoom", String(zoom));
    googleUrl.searchParams.set("size", `${width}x${height}`);
    googleUrl.searchParams.set("scale", "2");
    googleUrl.searchParams.set("maptype", "roadmap");
    googleUrl.searchParams.set("markers", `color:red|${center}`);
    googleUrl.searchParams.set("key", getEnv("GOOGLE_MAPS_SERVER_KEY"));

    const upstream = await fetch(googleUrl);
    const contentType = upstream.headers.get("Content-Type") ?? "";
    if (upstream.status === 404) {
      return json({ error: "Map not found" }, 404);
    }
    if (!upstream.ok || !contentType.startsWith("image/")) {
      console.warn("[map-preview] upstream error", {
        status: upstream.status,
        contentType,
        body: (await upstream.text()).slice(0, 300),
      });
      return json({ error: "Upstream map error" }, 502);
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (error) {
    console.error("[map-preview] failed", error);
    return json({ error: "Internal error" }, 500);
  }
});
