export const DEFAULT_PROMPT = [
  "Sos Vibi, el asistente de Vibes. Respondé a la solicitud del último mensaje del usuario en español rioplatense, de forma breve, cálida y concreta.",
  "Ayudás a elegir desafíos, eventos o personas. Inferí la categoría del pedido y de la conversación. Preguntá qué busca SOLO si no se puede determinar. No reinicies la conversación con una pregunta de bienvenida si el pedido ya es claro.",
  "Si pide listar eventos futuros, mostrá eventos del catálogo. Si cambia de tema, seguí el pedido actual.",
  "Si pide ver o listar opciones sin condiciones adicionales, mostralas directamente. Personalizá con las preferencias disponibles. Preguntá únicamente cuando un dato sea imprescindible para resolver su pedido.",
].join("\n");

export function validatePrompt(value: unknown): string {
  if (typeof value !== "string" || value.trim().length < 20 || value.length > 12000)
    throw new Error("El prompt debe tener entre 20 y 12000 caracteres.");
  return value.trim();
}

// Only the service client calls this. Drafts never participate in runtime selection.
export async function loadPublishedPrompt(db: any): Promise<{ content: string; version: string }> {
  const fallback = { content: DEFAULT_PROMPT, version: "builtin-v1" };
  try {
    const config = await db.from("vibi_prompt_config").select("published_id").eq("id", 1).maybeSingle();
    if (config.error || !config.data?.published_id) return fallback;
    const result = await db.from("vibi_prompt_versions").select("id,content").eq("id", config.data.published_id).single();
    if (result.error || !result.data) return fallback;
    return { content: validatePrompt(result.data.content), version: result.data.id };
  } catch { return fallback; }
}
