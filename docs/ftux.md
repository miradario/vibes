# FTUX: recorrido guiado por Vibi

Primer uso de la app para cuentas nuevas. Basado en la investigación y los mockups del FTUX (card de Trello KuMlSW9U, 19/10/2026).

## Flujo

| # | Dónde | Pieza | Salidas |
| --- | --- | --- | --- |
| Bienvenida | Inicio | Sheet de Vibi | **Dale, mostrame** → Descubrir · **Prefiero arrancar por otra cosa** → rama alternativa · **Ahora no, gracias** → pausa (queda la checklist) |
| Rama "otra cosa" | Inicio | Sheet de Vibi | **Ver desafíos** → paso 2 · **Mejor eventos** → paso 3 · **Ahora no** → pausa |
| Paso 1 de 4 | Tab Descubrir | Tarjeta de Vibi + spotlight del tab | **Ver perfiles** (pausa y explora) · **Siguiente** |
| Paso 2 de 4 | Tab Desafíos | Tarjeta + spotlight (menciona que se pueden reiniciar) | **Explorar** · **Siguiente** |
| Paso 3 de 4 | Tab Eventos | Tarjeta + spotlight | **Ver eventos** · **Último paso** (o **Terminar** si el perfil está completo) |
| Paso 4 de 4 | Perfil | Sheet con el % real del perfil | **Completar mi perfil** (abre la pantalla que falta) · **Más tarde** |
| Cierre | Cualquier tab | Sheet | **Empezar** → Inicio |
| Tus primeros pasos | Inicio | Checklist (4 ítems) | Tocar un ítem retoma ese paso con Vibi · **Ocultar** |

- Si el perfil ya está completo, se saltea el paso 4.
- El cierre se muestra una sola vez. Si después retoma pasos desde la checklist, termina sin repetirlo.
- Los ítems de la checklist se tildan con la acción real: abrir un perfil en Descubrir, sumarse a un desafío (`useJoinChallengeMutation`), abrir el detalle de un evento y llegar al 100% de perfil (`getProfileCompletion`).
- Mientras el FTUX está pendiente o activo, o la checklist está visible, `CompleteProfilePrompt` no se muestra (la checklist ya incluye "Completar tu perfil").
- El pulso de `DiscoverFiltersGuide` espera mientras la tarjeta de Descubrir está en pantalla.

## Reglas

- **Solo cuentas nuevas.** Al llegar por primera vez a Inicio con esta versión se decide una vez y se guarda: es elegible si `session.user.created_at` tiene **7 días o menos** (`NEW_USER_WINDOW_DAYS`) **y** no hay rastros locales de uso previo (`discover_filters_guide:<id>`, `discover_answer_filters:<id>`, `complete_profile_prompt_dismissed_until:<id>`). Si no, queda `ineligible` y nunca se muestra.
- **Reemplaza el check-in de ánimo** (`DailyMoodCard`) mientras la bienvenida está pendiente, durante el recorrido y durante todo el día en que apareció la bienvenida. Al día siguiente vuelve el check-in.
- **No interrumpe pushes ni deep links.** La bienvenida espera a que Inicio esté en foco 1,5 s, a que termine el chequeo de deferred deep link y a que no haya una navegación de notificación/deep link en cola. Si la app se abrió desde una push, un universal link o un deferred link, espera a que la persona vaya a ese destino y vuelva a Inicio (o 20 s en Inicio si la navegación nunca salió de ahí). Ver `canShowWelcome` y `src/ftux/entrySignals.ts`.
- **Se puede saltear y retomar.** Cualquier salida secundaria, el botón atrás de Android, tocar otro tab o una navegación externa pausan el recorrido sin perder el progreso. Si se cierra la app a mitad del recorrido, al volver no se relanza: queda la checklist.
- **Solo local.** Estado en AsyncStorage, sin Supabase ni Analytics.

## Código

- `src/ftux/ftuxMachine.ts`: máquina de estados pura (sin imports), elegibilidad y reglas. Tests en `scripts/ftux.test.cjs` (`npm run vibi:check`).
- `src/ftux/ftuxStore.ts`: persistencia por usuario, hooks y `markFtuxAction`.
- `src/ftux/entrySignals.ts`: señales de entrada externa escritas por `App.tsx`.
- `components/ftux/FtuxGuide.tsx`: sheets, tarjeta de Vibi y spotlight, montado en `App.tsx` junto a `VibiOverlay`.
- `components/ftux/FtuxChecklistCard.tsx`: "Tus primeros pasos" en Inicio.
- Textos en `src/i18n/translations.ts` (`ftux.*`, es/en).

## Estado y cómo reiniciarlo

Clave AsyncStorage: `ftux:v1:<userId>` (JSON con `status`: `pending` | `active` | `paused` | `done` | `ineligible`, `step`, `welcomeDay`, `actions`, `checklistHidden`, …).

- **En desarrollo (`__DEV__`, Metro):** Inicio → ícono de configuración → **[Dev] Reiniciar recorrido de Vibi (FTUX)**. Deja el estado en `pending` aunque la cuenta sea vieja (`forced: true`), resetea el saludo diario y vuelve a Inicio; la bienvenida aparece a los ~1,5 s.
- **A mano:** borrar `ftux:v1:<userId>` de AsyncStorage (o desinstalar la app). Ojo: sin la opción de dev, se vuelve a evaluar la elegibilidad, así que una cuenta de más de 7 días queda `ineligible`.
