import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.117.2";
import { hydrateCards, loadCatalog } from "./catalog.ts";
import {
  isUUID,
  isCategory,
  shortlist,
  validateSend,
  VibiError,
  type Row,
} from "./core.ts";
import { generateReply } from "./provider.ts";
import { loadPublishedPrompt } from "./prompts.ts";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
const check = <T extends { error: any }>(result: T): T => {
  if (result.error) throw result.error;
  return result;
};
type Dependencies = {
  env: (name: string) => string | undefined;
  client?: typeof createClient;
  generate?: typeof generateReply;
};
export function createHandler({
  env,
  client = createClient,
  generate = generateReply,
}: Dependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS")
      return new Response("ok", { headers: cors });
    if (request.method !== "POST")
      return json({ error: "method_not_allowed" }, 405);
    let admin: SupabaseClient | undefined,
      conversationId: string | undefined,
      token: string | undefined;
    try {
      const authorization = request.headers.get("Authorization") ?? "";
      if (!/^Bearer \S+$/i.test(authorization))
        throw new VibiError("unauthorized", 401);
      const db = client(
        env("SUPABASE_URL") ?? "",
        env("SUPABASE_ANON_KEY") ?? "",
        {
          auth: { persistSession: false },
          global: { headers: { Authorization: authorization } },
        }
      );
      const { data: auth, error: authError } = await db.auth.getUser(
        authorization.replace(/^Bearer /i, "")
      );
      if (authError || !auth.user) throw new VibiError("unauthorized", 401);
      const userId = auth.user.id;
      const active = check(
        await db
          .from("profiles")
          .select("id,is_active,deleted_at")
          .eq("id", userId)
          .maybeSingle()
      ).data;
      if (!active?.is_active || active.deleted_at)
        throw new VibiError("inactive_profile", 403);
      if (Number(request.headers.get("content-length")) > 12000)
        throw new VibiError("invalid_request", 413);
      const raw = await request.text();
      if (new TextEncoder().encode(raw).length > 12000)
        throw new VibiError("invalid_request", 413);
      let body: Row;
      try {
        body = JSON.parse(raw);
      } catch {
        throw new VibiError("invalid_request");
      }
      if (!body || typeof body !== "object" || Array.isArray(body))
        throw new VibiError("invalid_request");
      if (!["history", "send", "reset", "resolve"].includes(body.action))
        throw new VibiError("invalid_request");
      admin = client(
        env("SUPABASE_URL") ?? "",
        env("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );
      if (body.action === "reset") {
        if (!isUUID(body.conversation_id))
          throw new VibiError("invalid_request");
        check(
          await admin
            .from("vibi_conversations")
            .delete()
            .eq("user_id", userId)
            .eq("id", body.conversation_id)
        );
        return json({ ok: true });
      }
      if (body.action === "resolve") {
        if (!isUUID(body.id) || !isCategory(body.type))
          throw new VibiError("invalid_request");
        const { candidates } = await loadCatalog(db, userId);
        const [card] = await hydrateCards(
          db,
          [{ id: body.id, type: body.type, reason: "" }],
          candidates
        );
        if (!card) throw new VibiError("recommendation_unavailable", 404);
        return json({ card });
      }
      if (body.action === "history") {
        if (
          body.before != null &&
          (typeof body.before !== "string" || !/^\d{1,15}$/.test(body.before))
        )
          throw new VibiError("invalid_request");
        check(
          await admin
            .from("vibi_conversations")
            .upsert(
              { user_id: userId },
              { onConflict: "user_id", ignoreDuplicates: true }
            )
        );
        const conversation = check(
          await db
            .from("vibi_conversations")
            .select("id,category,created_at")
            .eq("user_id", userId)
            .single()
        ).data;
        if (!conversation) throw new VibiError("conversation_changed", 409);
        let query = db
          .from("vibi_exchanges")
          .select("*")
          .eq("conversation_id", conversation.id)
          .order("id", { ascending: false })
          .limit(21);
        if (body.before) query = query.lt("id", body.before);
        const records = check(await query).data ?? [];
        const hasMore = records.length > 20;
        const page = records.slice(0, 20).reverse();
        const needsCatalog = page.some((r) => r.recommendations.length);
        const catalog = needsCatalog
          ? (await loadCatalog(db, userId)).candidates
          : [];
        const exchanges = await Promise.all(
          page.map(async (row) => ({
            ...row,
            recommendations: await hydrateCards(
              db,
              row.recommendations,
              catalog
            ),
          }))
        );
        return json({
          conversation_id: conversation.id,
          category: conversation.category,
          exchanges,
          before: hasMore ? String(page[0].id) : null,
        });
      }
      const send = validateSend(body);
      conversationId = send.conversationId;
      const conversation = check(
        await db
          .from("vibi_conversations")
          .select("id,category")
          .eq("id", conversationId)
          .eq("user_id", userId)
          .maybeSingle()
      ).data;
      if (!conversation) throw new VibiError("conversation_changed", 409);
      const existing = check(
        await db
          .from("vibi_exchanges")
          .select("*")
          .eq("conversation_id", conversationId)
          .eq("request_id", send.requestId)
          .maybeSingle()
      ).data;
      if (existing) {
        const { candidates } = await loadCatalog(db, userId);
        return json({
          exchange: {
            ...existing,
            recommendations: await hydrateCards(
              db,
              existing.recommendations,
              candidates
            ),
          },
        });
      }
      const key = env("DEEPSEEK_API_KEY")?.trim();
      if (!key) throw new VibiError("not_configured", 503);
      token = crypto.randomUUID();
      const claim = await admin.rpc("vibi_claim", {
        p_user_id: userId,
        p_conversation_id: conversationId,
        p_token: token,
      });
      if (claim.error?.message?.includes("vibi_rate_limit"))
        throw new VibiError("rate_limit", 429);
      check(claim);
      if (!claim.data) throw new VibiError("busy", 409);
      // Recheck under the lock: a concurrent retry may have just completed.
      const retry = check(
        await db
          .from("vibi_exchanges")
          .select("*")
          .eq("conversation_id", conversationId)
          .eq("request_id", send.requestId)
          .maybeSingle()
      ).data;
      const catalog = await loadCatalog(db, userId);
      if (retry)
        return json({
          exchange: {
            ...retry,
            recommendations: await hydrateCards(
              db,
              retry.recommendations,
              catalog.candidates
            ),
          },
        });
      const history =
        check(
          await db
            .from("vibi_exchanges")
            .select("user_text,assistant_text,category")
            .eq("conversation_id", conversationId)
            .order("id", { ascending: false })
            .limit(10)
        ).data ?? [];
      const candidates = shortlist(
        catalog.candidates.filter(
          (c) => !send.category || c.type === send.category
        ),
        catalog.preferences,
        send.message
      );
      const prompt = await loadPublishedPrompt(admin);
      const reply = await generate({
        systemPrompt: prompt.content,
        key,
        model: env("DEEPSEEK_MODEL")?.trim() || "deepseek-flash",
        message: send.message,
        category: send.category,
        previousCategory: conversation.category,
        history: history.reverse(),
        preferences: catalog.preferences,
        candidates,
      });
      // Revalidate after inference; visibility, blocks and capacity may have changed.
      const fresh = await loadCatalog(db, userId);
      const cards = await hydrateCards(
        db,
        reply.recommendations,
        fresh.candidates
      );
      const answer =
        cards.length !== reply.recommendations.length
          ? "Algunas opciones cambiaron mientras buscaba. Estas son las que siguen disponibles; si querés, volvemos a buscar."
          : reply.text;
      const finished = await admin.rpc("vibi_finish", {
        p_user_id: userId,
        p_conversation_id: conversationId,
        p_token: token,
        p_request_id: send.requestId,
        p_user_text: send.message,
        p_assistant_text: answer,
        p_prompt_version: prompt.version,
        p_category: reply.category,
        p_recommendations: cards.map((c) => ({
          id: c.id,
          type: c.type,
          reason: c.reason,
        })),
      });
      if (finished.error?.message?.includes("vibi_conversation_changed"))
        throw new VibiError("conversation_changed", 409);
      check(finished);
      return json({ exchange: { ...finished.data, recommendations: cards } });
    } catch (error) {
      if (error instanceof VibiError)
        return json({ error: error.code }, error.status);
      // Never log conversation contents, catalog records, JWTs or provider responses.
      console.error(
        "[vibi-chat]",
        error instanceof Error ? error.name : "database_error"
      );
      return json({ error: "temporarily_unavailable" }, 502);
    } finally {
      if (admin && conversationId && token) {
        try {
          await admin
            .from("vibi_conversations")
            .update({ lock_token: null, locked_until: "-infinity" })
            .eq("id", conversationId)
            .eq("lock_token", token);
        } catch {
          /* The bounded lease also releases a lock after a network failure. */
        }
      }
    }
  };
}
