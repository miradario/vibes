import { supabase } from "../lib/supabase";
import type {
  VibiCard,
  VibiCategory,
  VibiExchange,
  VibiHistory,
} from "../lib/vibi";
async function callVibi<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("vibi-chat", {
    body,
    timeout: 60000,
  });
  if (error) {
    let code = "temporarily_unavailable";
    try {
      const response = await error.context?.json?.();
      if (typeof response?.error === "string") code = response.error;
    } catch {
      /* A network error may have no response body. */
    }
    throw new Error(code);
  }
  if (data?.error) throw new Error(data.error);
  if (!data) throw new Error("temporarily_unavailable");
  return data as T;
}
export const fetchVibiHistory = (before?: string | null) =>
  callVibi<VibiHistory>({ action: "history", before });
export const sendVibiMessage = (
  conversationId: string,
  requestId: string,
  message: string,
  category?: VibiCategory
) =>
  callVibi<{ exchange: VibiExchange }>({
    action: "send",
    conversation_id: conversationId,
    request_id: requestId,
    message,
    category,
  });
export const resetVibiHistory = (conversationId: string) =>
  callVibi<{ ok: boolean }>({
    action: "reset",
    conversation_id: conversationId,
  });
export const resolveVibiCard = (card: VibiCard) =>
  callVibi<{ card: VibiCard }>({
    action: "resolve",
    id: card.id,
    type: card.type,
  });
