import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type DailyGuideBody = { locale?: unknown };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const getEnv = (key: string) => {
  const value = Deno.env.get(key)?.trim();
  if (!value) throw new Error(`Missing ${key}`);
  return value;
};

const sanitize = (value: unknown) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

const parseBody = async (req: Request): Promise<DailyGuideBody> => {
  const contentType = req.headers.get("Content-Type") ?? "";
  return contentType.includes("application/json")
    ? ((await req.json()) as DailyGuideBody)
    : {};
};

const buildPrompt = (body: DailyGuideBody) => {
  const isEnglish = body.locale === "en";
  return [
    "Sos Guru Vibes, una guía cálida dentro de una app de bienestar llamada Vibes.",
    "Creá un consejo general para responder: ¿cómo tener un gran día hoy?",
    "No pidas datos personales ni hagas diagnósticos.",
    "Escribí en español rioplatense, humano, sereno, concreto y sin frases vacías.",
    "Devolvé JSON con body, detail y actions.",
    "body es el adelanto para una tarjeta, máximo 160 caracteres.",
    "detail desarrolla el consejo en un párrafo de 300 a 550 caracteres.",
    "actions contiene exactamente tres acciones breves, realistas y diferentes para hoy.",
    "No uses markdown, hashtags ni comillas decorativas.",
    isEnglish
      ? "Write the entire response in natural English."
      : "Escribí toda la respuesta en español rioplatense.",
  ]
    .filter(Boolean)
    .join(" ");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authorization = req.headers.get("Authorization") ?? "";
    if (!authorization) return json({ error: "Unauthorized" }, 401);

    const callerClient = createClient(
      getEnv("SUPABASE_URL"),
      getEnv("SUPABASE_ANON_KEY"),
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: authorization } },
      },
    );
    const {
      data: { user },
      error: userError,
    } = await callerClient.auth.getUser();
    if (userError || !user?.id) return json({ error: "Unauthorized" }, 401);

    const body = await parseBody(req);
    const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY")?.trim();
    const openaiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
    const providerKey = deepseekKey || openaiKey;
    if (!providerKey) return json({ error: "not_configured" }, 503);
    const endpoint = deepseekKey
      ? "https://api.deepseek.com/chat/completions"
      : "https://api.openai.com/v1/chat/completions";
    const model = deepseekKey
      ? Deno.env.get("DEEPSEEK_MODEL")?.trim() || "deepseek-flash"
      : Deno.env.get("OPENAI_MODEL")?.trim() || "gpt-4o-mini";
    const response = await fetch(endpoint, {
      method: "POST",
      signal: AbortSignal.timeout(25000),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${providerKey}`,
      },
      body: JSON.stringify({
        model,
        ...(deepseekKey ? { thinking: { type: "disabled" } } : {}),
        max_tokens: 1000,
        temperature: 0.85,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Respond only with JSON shaped as {\"body\": string, \"detail\": string, \"actions\": string[]}. No markdown.",
          },
          { role: "user", content: buildPrompt(body) },
        ],
      }),
    });

    if (!response.ok) {
      console.error("[daily-guide] provider error", response.status);
      return json({ error: "Could not generate guide" }, 502);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = payload.choices?.[0]?.message?.content?.trim() ?? "";
    const parsed = JSON.parse(content) as {
      body?: unknown;
      detail?: unknown;
      actions?: unknown;
    };
    const cardBody = sanitize(parsed.body);
    const detail = sanitize(parsed.detail);
    const actions = Array.isArray(parsed.actions)
      ? parsed.actions.map(sanitize).filter(Boolean).slice(0, 3)
      : [];

    if (!cardBody || !detail || actions.length !== 3) {
      return json({ error: "Incomplete AI response" }, 502);
    }

    return json({
      title: body.locale === "en" ? "How to have a great day" : "Cómo tener un gran día",
      body: cardBody,
      detail,
      actions,
    });
  } catch (error) {
    console.error("[daily-guide] unexpected error", error);
    return json({ error: "Unexpected error" }, 500);
  }
});
