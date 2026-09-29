export type VibiCategory = "challenge" | "event" | "person";
export type VibiCard = {
  id: string;
  type: VibiCategory;
  title: string;
  thumbnail: string | null;
  reason: string;
  destination: { type: VibiCategory; id: string };
};
export type VibiExchange = {
  id: number;
  request_id: string;
  user_text: string;
  assistant_text: string;
  category: VibiCategory | null;
  recommendations: VibiCard[];
  created_at: string;
};
export type VibiHistory = {
  conversation_id: string;
  category: VibiCategory | null;
  exchanges: VibiExchange[];
  before: string | null;
};
export const mergeVibiExchanges = (
  current: VibiExchange[],
  incoming: VibiExchange[]
) =>
  [
    ...new Map(
      [...current, ...incoming].map((row) => [row.request_id, row])
    ).values(),
  ].sort((a, b) => a.id - b.id);
export function vibiErrorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : "";
  const messages: Record<string, string> = {
    not_configured:
      "Vibi todavía se está preparando. Volvé a intentarlo más tarde.",
    unauthorized:
      "Tu sesión venció. Volvé a iniciar sesión para hablar con Vibi.",
    inactive_profile: "Tu perfil no está disponible para usar Vibi.",
    rate_limit:
      "Llegaste al límite de consultas o enviaste muy rápido. Probá más tarde.",
    busy: "Vibi está respondiendo otro mensaje. Esperá un momento y reintentá.",
    conversation_changed:
      "La conversación cambió. Volvé a abrir Vibi para retomarla.",
    recommendation_unavailable:
      "Esta recomendación ya no está disponible. Pedile nuevas opciones a Vibi.",
    invalid_request: "Revisá tu mensaje: puede tener hasta 2000 caracteres.",
    invalid_model_response:
      "Vibi no pudo preparar una respuesta válida. Podés reintentar tu mensaje.",
  };
  return (
    messages[code] ??
    "No pudimos conectar con Vibi. Revisá tu conexión y reintentá; tu mensaje sigue acá."
  );
}
