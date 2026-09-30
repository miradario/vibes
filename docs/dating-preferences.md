# Preferencias de citas

“Citas” pertenece a “Qué busco en Vibes” (`looking_for`), independiente de las motivaciones (`open_to`).

La pregunta opcional “Estoy interesado en:” aparece al seleccionar Citas en onboarding y preferencias. Permite Hombre, Mujer o Todos y se puede desmarcar. Se guarda en `user_preferences.profile_answers.interestedIn` y aparece en el perfil público. Todos incluye Otro. No se migra `profiles.intent_id`, porque los registros antiguos contienen un valor predeterminado que no representa una respuesta explícita. La pregunta no afecta completitud ni genera avisos a usuarios existentes.

Descubrir y Vibi comparten `supabase/functions/vibi-chat/dating.ts`. Solo al buscar exclusivamente Citas se exige compatibilidad recíproca entre las respuestas conocidas de género e interés. Se excluyen candidatos que hayan respondido qué buscan sin incluir Citas. Las respuestas ausentes no excluyen automáticamente ni se consideran Todos. Al combinar Citas con otras opciones no se aplica esta restricción automática.

El filtro manual “Está interesado en” es independiente del filtro de género. Hombre y Mujer incluyen respuestas Todos; seleccionar Todos busca respuestas Todos. Sin selección no restringe. Una selección excluye respuestas ausentes. Los filtros explícitos se combinan con la compatibilidad automática y se guardan en `discover_answer_filters`.

Validación: `node --test scripts/vibi.test.cjs scripts/discover-answer-filters.test.cjs scripts/profile-preferences.test.cjs scripts/profile-email-completion.test.cjs`.
