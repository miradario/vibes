# Auditoría móvil de Vibes — 16 de octubre de 2026

Rama: `audit/mobile-premium-2026-10-16`. Base: `635b37e`.

## Diagnóstico

Vibes tiene una identidad visual reconocible y los flujos principales están implementados. La prioridad para alcanzar una experiencia premium es la confianza: aislar las sesiones, asegurar consentimiento y permisos en el servidor, mantener información consistente y hacer que las esperas sean recuperables. Agregar animaciones antes de cerrar estas brechas aumentaría la complejidad sin resolver la experiencia.

**No recomiendo publicar esta rama todavía.** Hay correcciones verificadas, una migración preparada y pendientes de privacidad, notificaciones y validación en dispositivos físicos. No se aplicaron migraciones ni cambios de cuentas, eventos o desafíos en producción durante esta auditoría.

Prioridades: **P0** incidente/exposición crítica que exige contención inmediata; **P1** bloquear próxima publicación hasta resolver o mitigar; **P2** siguiente iteración; **P3** mejora de producto. No se confirmó una exposición anónima general ni lectura de conversaciones ajenas. No se asigna P0 sin esa evidencia.

## Alcance y evidencia

Se inspeccionaron App, autenticación y recuperación, onboarding, perfiles, Discover, conexiones y mensajes, eventos/desafíos, invitaciones, notificaciones, imágenes, consultas y migraciones. Se consultaron políticas, triggers y asesores de Supabase en modo lectura, sin extraer conversaciones ni listados de datos personales. Las comprobaciones de permisos usaron conteos y transacciones revertidas. Las pruebas de escritura y concurrencia se hicieron exclusivamente en PostgreSQL local desechable.

| Área | Ejecución realizada | Límite |
| --- | --- | --- |
| Android, Pixel 8 Pro API 36 | Sesión existente: inicio, Home, Discover con fotos, filtros, listas de eventos/desafíos, detalle de evento y Atrás del sistema | Expo Go; no equivale al binario publicado ni a un Samsung real |
| iOS, iPhone 17 Pro, iOS 26.2 | Inicio sin sesión, acceso, foco email/contraseña, teclado, entrada al registro y selector de nacimiento, volver | No se creó cuenta ni se completó onboarding autenticado |
| Conexiones/chat | Lista de chats Android; inspección de mutaciones, RLS, realtime, polling y notificaciones | Sin enviar mensajes, likes ni invitaciones a usuarios reales; falta prueba entre dos cuentas de ensayo |
| Eventos/desafíos | Lectura en Android, detalle y navegación; inscripciones/permisos/cupo probados localmente | Sin anotarse, completar días ni editar contenido real |
| Sin internet, permisos, push, deep links | Revisión de código y pruebas existentes relacionadas | Sin ensayo integral en ambas plataformas ni recepción APNs/FCM física |
| Rendimiento | Revisión de consultas/cachés, exportación de bundles | Sin medición de arranque frío, memoria o FPS de builds release |

Las capturas locales están en `output/audit-mobile-2026-10-16/`: `android-discover.png`, `android-events.png`, `android-event-detail.png`, `android-challenges.png`, `ios-login.png`, `ios-age-assurance.png`. Se mantienen fuera de Git; contienen la sesión de prueba observada y no son assets de la app.

## Errores confirmados y correcciones

### C01 — Caché de una cuenta sobrevive al cierre/cambio de sesión

- **P1 · Android/iOS.** Confirmado por código y prueba con QueryClient real; corregido en rama.
- **Reproducir:** iniciar como A, cargar perfil/chat/feed, cerrar sesión y entrar como B en el mismo proceso. Antes se actualizaba la sesión e invalidaban consultas sin retirar todos los datos anteriores; algunos feeds no tienen usuario en su clave.
- **Esperado:** ningún dato de A disponible para la interfaz de B, incluso si queda una consulta en curso.
- **Evidencia:** `src/auth/auth.queries.ts`, nuevo `src/auth/sessionCache.ts`; `scripts/session-isolation.test.cjs` verifica logout, cambio de identidad y conservación durante refresh del mismo usuario.
- **Solución aplicada:** cancelar y retirar consultas no pertenecientes a auth y limpiar el registro de mutaciones al salir/cambiar de identidad. No revierte mutaciones que el servidor ya recibió. Revisar también cachés de archivos y almacenamiento del dispositivo como segunda fase.

### C02 — Consultas periódicas de chats/conexiones siguen en segundo plano

- **P2 · Android/iOS.** Configuración confirmada; corregida en rama. No se midió ahorro de batería.
- **Reproducir:** mantener consultas de mensajes activas y enviar la app a segundo plano. Había `refetchIntervalInBackground: true` y faltaba enlazar el foco de React Query con AppState nativo.
- **Esperado:** pausar polling al abandonar la app y recuperar datos al volver.
- **Evidencia:** `src/queries/matches.queries.ts` (intervalos de 2 s en mensajes y 10 s en resúmenes), `App.tsx`, nuevo `src/lib/queryAppState.ts`.
- **Solución aplicada:** foco nativo con limpieza de listener y polling sin ejecución en background. Prueba del ciclo active/background/inactive/active. Sigue pendiente limitar consultas a la conversación visible y usar realtime con polling de respaldo.

### C03 — Inscripción sin comprobación atómica de cupo

- **P1 · Ambas plataformas/API.** Ausencia de guard comprobada en esquema; corrección probada localmente, **pendiente de desplegar**.
- **Reproducir:** dos cuentas intentan ocupar simultáneamente el último lugar de un evento; comprobar cupo en cliente no serializa los inserts.
- **Esperado:** una sola reserva gana; la otra recibe «No quedan cupos»; un reintento del ganador no duplica la reserva.
- **Evidencia:** políticas de `event_participants`, mutaciones de `src/queries/events.queries.ts`; `scripts/mobile-audit-db.test.cjs` ejecuta dos conexiones concurrentes.
- **Solución preparada:** trigger `private.guard_activity_enrollment`, bloqueo de fila del evento y reintento idempotente, en `supabase/migrations/20261016031536_mobile_audit_server_guards.sql`. Validar sobre staging con esquema completo antes de aplicar.

### C04 — La pertenencia a un desafío privado se puede insertar sin invitación

- **P1 · Ambas/API.** Confirmado estructuralmente; guard local probado, **pendiente de despliegue**.
- **Reproducir:** con cuenta autenticada sin relación con el creador, insertar la propia cuenta en participantes de un desafío privado usando el SDK directamente. La política de inserción basada en identidad no prueba visibilidad/invitación.
- **Esperado:** servidor rechaza, aunque el cliente se modifique.
- **Evidencia:** RLS de participantes y guard de la migración; prueba local rechaza acceso ajeno y permite una invitación existente.
- **Solución preparada:** comprobar dueño, visibilidad pública, conexión para `friends` o invitación. Impedir además mover una inscripción a otro usuario/actividad mediante UPDATE. Revisar posteriormente el ciclo de estados de invitaciones y caducidad.

### C05 — Las políticas amplias de perfiles anulan parcialmente la intención de las restrictivas de actividad

- **P1 · Ambas/API.** Combinación de políticas confirmada; corrección local probada, **pendiente de despliegue**.
- **Reproducir:** evaluar SELECT de un perfil inactivo no eliminado o eliminado que otra política permite. Las políticas permisivas se combinan mediante OR. El dueño también puede editar `is_active` bajo la política general de actualización de su perfil.
- **Esperado:** otros usuarios no reciben cuentas suspendidas/eliminadas; una cuenta suspendida no puede reactivarse editando su propia fila.
- **Evidencia:** políticas vivas `profiles_read_active`/`profiles_select_authenticated`; ausencia de trigger de moderación; prueba local de perfil oculto, lectura propia y rechazo de autorreactivación.
- **Solución preparada:** política SELECT restrictiva adicional y trigger para proteger el estado de moderación. Los RPC administrativos confiables conservan su operación. Esto no reemplaza una política global de revocación de acceso a todas las tablas de cuentas suspendidas.

### C06 — El roster genérico expone participantes de desafíos privados

- **P1 · Ambas/API.** Política SELECT autenticada amplia confirmada; protección preparada, **pendiente de despliegue**.
- **Reproducir:** consultar `event_participants` de un desafío privado ajeno; la política de roster permite SELECT sin vincularlo a la visibilidad del desafío.
- **Esperado:** solo el propio registro y rosters cuya actividad sea visible. Los eventos públicos conservan el comportamiento actual.
- **Evidencia:** política viva de `event_participants`; nueva política restrictiva `event_participants_private_rosters` en la migración.
- **Solución preparada:** aplicar la visibilidad de `challenges` al roster. Falta ensayo de esta política con todas las variantes reales de invitación/creador en staging; no se afirma que el test de cupos cubra todos esos casos.

### C07 — Crear/modificar una conexión no exige consentimiento mutuo en servidor

- **P1 · Ambas/API.** Confirmado por políticas y triggers vivos; guard probado localmente, **pendiente de despliegue**. No se creó ninguna conexión real para explotarlo.
- **Reproducir:** usar INSERT de `matches` identificándose como uno de los integrantes sin like recíproco. La política solo comprueba ser participante; los triggers existentes normalizan orden y notifican. UPDATE tampoco debe poder sustituir al otro integrante.
- **Esperado:** ambas personas aceptan antes de habilitar conexión/conversación.
- **Evidencia:** `supabase/migrations/20260405120100_matches_messages_rls.sql`, `src/queries/swipes.mutations.ts`, fallback de `useCreateMatchMutation` en `src/queries/matches.queries.ts` y triggers consultados en producción.
- **Solución preparada:** `private.guard_match_consent` exige likes recíprocos y prohíbe cambiar integrantes desde sesiones de usuario. Prueba local rechaza conexión unilateral, acepta likes mutuos y rechaza sustitución. A futuro, un RPC transaccional debe centralizar swipe y match.

### C08 — El proyecto no pasa TypeScript en su estado inicial

- **P1 · Cadena de entrega de ambas plataformas.** Cinco errores iniciales; corregidos.
- **Reproducir:** `npx tsc --noEmit` en la base.
- **Esperado:** cero errores como requisito de integración.
- **Evidencia:** `ChallengeTreeProgress.tsx` usaba `Animated.SharedValue`; `DiscoverCirclesOverlay.tsx` tenía posiciones string no compatibles con DimensionValue; `OnboardingProgressBar.tsx` no tipaba el evento de transición.
- **Solución aplicada:** tipos públicos de Reanimated/RN/React Navigation. Agregado `npm run typecheck`.

### C09 — Suite por defecto falla por fixtures desactualizados e integraciones no habilitadas

- **P2 · Desarrollo de ambas plataformas.** Corregido; no confundir los 27 fallos iniciales con 27 bugs de producción.
- **Reproducir:** `node --test scripts/*.test.cjs` antes de la rama: 283 pruebas, 256 pasan, 27 fallan.
- **Esperado:** suite determinista sin credenciales reales; integraciones explícitamente opt-in.
- **Evidencia:** mocks de Platform, loader, hooks, navegación y timeout; prueba del picker esperaba una implementación retirada; integración exigía archivo secreto aunque no estuviera habilitada.
- **Solución aplicada:** actualizar mocks y expectativas al comportamiento vigente, separar integraciones de DB/credenciales. Se conserva prueba real de aislamiento de caché y una integración SQL local; los mocks no demuestran UX nativa. Agregado `npm test`.

### C10 — Dependencias sin uso y dos avisos críticos en herramientas transitivas

- **P1 · Cadena de instalación/build Android/iOS.** Corregido parcialmente.
- **Reproducir:** auditoría npm de la base y resolución del árbol: 76 avisos, incluidos dos críticos (`tar`, `shell-quote`); el swipe legacy sin imports exige peers React 16/RN antiguos y rompe la resolución del árbol al actualizar.
- **Esperado:** instalación reproducible sin paquetes heredados sin uso y vulnerabilidades críticas conocidas mitigadas.
- **Evidencia:** `package.json`, locks; no hay imports de `react-native-card-stack-swiper` ni `react-navigation` v4. La app usa su propio swipe y `@react-navigation/*`.
- **Solución aplicada:** retirar esos dos paquetes y fijar `tar 7.5.22`/`shell-quote 1.12.0`; instalación completada. Nuevo audit: **68 avisos: 0 críticos, 44 altos, 23 moderados, 1 bajo**. Muchos son herramientas o cadenas de Expo, no prueba de explotación del binario. Pendiente triage por alcanzabilidad y upgrade compatible, sin `audit fix --force` indiscriminado. Los locks de npm/yarn cambiaron; npm es el camino verificado en esta auditoría.

### C11 — Texto claro sobre mostaza en aplicar filtros

- **P2 · Android observado; código compartido iOS.** Corregido en rama.
- **Reproducir:** Descubrir → Filtros → «Ver perfiles».
- **Esperado:** texto e icono legibles y acordes a la paleta obligatoria.
- **Evidencia:** `screens/Discover.tsx`, `filtersPrimaryButtonText` y flecha sobre `accentMustard` usaban `surface`.
- **Solución aplicada:** texto e icono `primaryText`. Paleta verificada. Otros botones como el de edad conservan variantes antiguas: revisar el sistema de botones completo posteriormente.

## Errores confirmados pendientes

### P01 — Preferencias y coordenadas demasiado accesibles a otras cuentas

- **P1 · Ambas/API.** Confirmado a nivel de políticas/esquema, sin extraer valores personales.
- **Reproducir:** autenticar una cuenta y consultar filas ajenas de `user_preferences`; la política `preferences_select_authenticated` permite la fila completa. SELECT de perfiles incluye columnas de coordenadas usadas por el cálculo de distancia.
- **Esperado:** separar datos públicos de descubrimiento de preferencias privadas y no distribuir coordenadas exactas a otros clientes.
- **Evidencia:** RLS vivo, columnas de `profiles`, lecturas de candidatos y `src/queries/userPreferences.queries.ts`. Un conteo con rol autenticado pudo ver preferencias ajenas; anónimo no pudo leer perfiles. Las políticas restrictivas de matches sí impidieron leer matches ajenos.
- **Solución recomendada:** proyección pública de perfil/preferencias permitidas, RLS de preferencias propias y distancia aproximada calculada en servidor. Requiere migración coordinada con consultas de Discover para no dejarlo sin candidatos. No se cambió una política aislada que rompería ese flujo.

### P02 — Logout no desactiva el token push del dispositivo

- **P1 · Android/iOS físicos.** Omisión confirmada en código; recepción después del logout aún no probada físicamente.
- **Reproducir:** registrar push como A, cerrar sesión y recibir un mensaje para A antes de registrar otro usuario en ese dispositivo.
- **Esperado:** dispositivo desconectado no recibe información de A.
- **Evidencia:** `src/auth/auth.service.ts:logout` solo llama signOut. `deactivateUserPushTokens` existe en `src/notifications/pushNotifications.tsx` pero no se usa; además desactivaría todos los dispositivos del usuario.
- **Solución recomendada:** revocar únicamente el token de esta instalación antes de cerrar sesión, con timeout y estrategia para logout sin red; añadir invalidación vinculada a sesión en servidor y minimizar el contenido privado en banners. Probar logout, cambio de cuenta y dos dispositivos. No conectar el helper actual a ciegas: apagaría avisos en los otros teléfonos.

### P03 — Altas/bajas de desafíos escriben dos tablas sin transacción

- **P1 · Ambas/API.** Confirmado por código; fallo de red intermedio no inducido en producción.
- **Reproducir:** en `useJoinChallengeMutation` o `useLeaveChallengeMutation`, permitir la primera escritura de `challenge_participants` y fallar la siguiente en `event_participants`.
- **Esperado:** ambas pertenencias cambian juntas o ninguna; reintentar es seguro.
- **Evidencia:** `src/queries/events.queries.ts`, funciones citadas. Un error de la segunda escritura se propaga después de confirmar la primera.
- **Solución recomendada:** RPC join/leave transaccionales e idempotentes; migrar clientes y reconciliar diferencias existentes con revisión previa. Añadir pruebas de rollback y compatibilidad con invitaciones. El trigger de esta rama protege permisos/cupos, pero no convierte dos peticiones HTTP en una transacción.

### P04 — Hora y cantidad de asistentes contradictorias en un evento real

- **P1 para hora; P2 para conteo · Android observado, datos/código compartidos.** Confirmado visualmente.
- **Reproducir:** Eventos → SKY FEST: lista muestra `17 oct · 00:00` y 6 personas; detalle muestra `00:00`, 5 participantes y descripción con actividad a las `20.30 hs`.
- **Esperado:** horario estructurado validado coincide con la descripción; lista y detalle usan la misma definición de participante.
- **Evidencia:** capturas `android-events.png` y `android-event-detail.png`; `screens/EventDetail.tsx` deriva el número visible de los perfiles cargados, mientras el feed utiliza agregado del evento.
- **Solución recomendada:** revisar el horario con el organizador y corregir datos estructurados, modelar «hora no informada» sin sustituirla por medianoche y unificar conteo público de inscripción separado de cantidad de fotos/perfiles cargados. No se inventó una hora ni se editaron datos reales en esta auditoría.

### P05 — Etiquetas superpuestas/truncadas en Discover y asistente sobre contenido

- **P2 · Android observado; riesgo compartido iOS.** Confirmado visualmente.
- **Reproducir:** abrir Discover con varios candidatos y distancias largas; en Home bajar a Eventos con Vibi visible.
- **Esperado:** nombres/edad/distancia comprensibles y controles sin obstrucciones.
- **Evidencia:** `android-discover.png`, `components/DiscoverOrbitCanvas.tsx` construye una etiqueta de una línea con varios datos; Home mostró la X de Vibi sobre «Ver todos» de eventos, `components/VibiOverlay.tsx`.
- **Solución recomendada:** separar distancia como dato secundario, limitar densidad/colisiones, ofrecer vista de lista equivalente; reservar zona para Vibi o permitir colapsarlo sin tapar controles. No rediseñar los botones Pasar/Conectar ya acordados.

## Sospechas y riesgos que necesitan una prueba específica

### S01 — Teclado que abre/cierra en onboarding Android

- **P1 · Android, especialmente Samsung.** Reportado antes por usuarios; **no reproducido en esta sesión**. No está certificado como resuelto.
- **Reproducir:** instalación/actualización real, llegar a OnboardingName, agregar foto, tocar nombre, escribir y alternar descripción/fecha con Gboard y Samsung Keyboard; repetir tras background y fuente grande.
- **Esperado:** foco estable y campo visible, sin alternar ajuste de altura ni remontar TextInput.
- **Evidencia:** implementación actual de `screens/OnboardingName.tsx` y contenedor de teclado; pruebas existentes de scroll. El teclado de login iOS mantuvo foco y permitió pasar de email a contraseña, lo que no valida este caso Android.
- **Solución recomendada:** registrar focus/blur, mount y medidas de ventana en un development build, aislar un único responsable de resize/scroll, eliminar remount o dismiss si aparece. Prueba de aceptación en el dispositivo afectado antes de release.

### S02 — Fotos lentas/errores tardíos y crecimiento de memoria

- **P1 por historial de bloqueo; P2 optimización · Ambas.** Hay defensas actuales, pero no medición de latencia ni perfil de memoria de release.
- **Reproducir:** entrar desde una miniatura, cambiar fotos rápidamente con red lenta, expirar URL y volver del background; recorrer cientos de perfiles.
- **Esperado:** preview inmediata, no perder una foto ya visible por callback viejo, reintentos limitados y memoria estable.
- **Evidencia:** `components/ProfileMediaImage.tsx` conserva preview y protege callbacks por request; hay pruebas. `src/lib/profilePhotoStorage.ts` firma por 30 días y mantiene un Map sin límite explícito. El timeout por intento más reintentos puede prolongar la espera.
- **Solución recomendada:** derivados pequeños/medianos, CDN/caché por identidad del asset, presupuesto total de espera, LRU para URLs y telemetría sin URLs firmadas. Revisar TTL según privacidad. Medir tiempo a preview/foto nítida y memoria; no se afirma que el Map haya causado un crash.

### S03 — Sesión persistida en AsyncStorage

- **P1 evaluación de protección de datos · Ambas.** Uso de AsyncStorage confirmado; robo de sesión no demostrado.
- **Reproducir:** inspección del almacenamiento de una instalación de ensayo y sus backups; nunca publicar tokens en logs.
- **Esperado:** refresh tokens protegidos conforme al modelo de amenazas y migración recuperable desde versiones viejas.
- **Evidencia:** `src/lib/supabase.ts`, `src/auth/recoveryStorage.ts`, bootstrap/recovery.
- **Solución recomendada:** adapter seguro Keychain/Keystore con manejo de tamaño y migración, pruebas de refresh/logout/actualización y recuperación si falta la clave. Conservar primero una copia válida hasta confirmar migración; no obligar a borrar todos los datos.

### S04 — Compatibilidad nativa y paquetes que necesitan migración

- **P1 validación de release · Ambas.** Exportación JS exitosa; no certifica compilación nativa ni cumplimiento de tienda.
- **Reproducir:** build release firmado con instalación sobre versión publicada, back/gestos/modales, OAuth, enlaces y push en físico.
- **Esperado:** mismo comportamiento en build distribuido; sin warnings de incompatibilidad ni regresiones de restore.
- **Evidencia:** Expo 54/RN 0.81.5, navegación v5 y warnings de react-native-screens; existe expo-av. AGP 9 no fue migrado aquí. No elevar una dependencia nativa aislada sin matriz compatible.
- **Solución recomendada:** upgrade coordinado SDK/RN/navegación/multimedia con builds de ambas plataformas, pruebas de 16 KB y revisión de avisos restantes. Eliminar duplicidad de gestores de dependencias en una tarea controlada.

### S05 — Seguridad adicional de Auth

- **P1 revisar antes de publicar · Ambas/backend.** Asesor de Supabase reportó protección de contraseñas filtradas deshabilitada.
- **Reproducir:** revisar configuración Auth en staging y probar contraseña de ensayo que el servicio considere filtrada.
- **Esperado:** rechazo con mensaje entendible sin filtrar credenciales.
- **Evidencia:** asesor security consultado. También señaló funciones SECURITY DEFINER y tablas sin políticas, pero varias son triggers/RPC públicos intencionales o tablas internas denegadas: **no son automáticamente una exposición**. Se verificaron comprobaciones de administrador en RPC de roles.
- **Solución recomendada:** habilitar protección cuando el plan/configuración lo permita y probar signup/reset. No se modificó configuración de Auth en producción.

## Mejoras de producto y UX premium

Cada propuesta se refiere a una parte existente; no son errores confirmados.

| ID / prioridad / plataforma | Recorrido para evaluar y resultado esperado | Evidencia y solución recomendada |
| --- | --- | --- |
| M01 · P2 · Ambas | Discover con VoiceOver/TalkBack o movimiento reducido: todas las personas y acciones accesibles sin depender de órbitas/gestos | `DiscoverOrbitCanvas`, `DiscoverCirclesOverlay`, `UserProfileSheet`, `ProfileWithoutPhoto`: ofrecer lista equivalente, nombres accesibles completos, selected/disabled explícitos, foco al abrir/cerrar y respeto de reducir movimiento. Probar tamaños de fuente 100/130/200 % y targets de 44 pt/48 dp; no afirmar que ya cumplen. |
| M02 · P2 · Ambas | Abrir filtros, cambiar rango, cerrar con X/backdrop/Atrás y reabrir: queda claro si se guardó o descartó | `screens/Discover.tsx`: actualmente modifica estado durante edición y «Ver perfiles» solo cierra. Usar borrador y aplicar o explicar claramente aplicación inmediata, con reset visible. |
| M03 · P2 · Ambas | Primer acceso y permisos rechazados: se entiende el beneficio sin bloquear navegación | `pushNotifications.tsx`, onboarding y ubicación: pedir permisos al intentar la función, evitar solicitudes reiteradas sin contexto y ofrecer Ajustes cuando no se puede volver a preguntar. Sin permiso de ubicación, permitir ubicación manual y no fingir distancias. |
| M04 · P2 · Ambas | Feed/chat sin red: conservar contenido visible y un reintento claro, sin spinner infinito ni confundir vacío con error | Consultas de candidatos/eventos/matches y loaders: patrón compartido de error recuperable, datos anteriores y estado sin conexión; drafts locales por usuario/conversación y envío pendiente solo si es idempotente. Probar pérdida/retorno de red y background de 5–30 minutos. |
| M05 · P2 · Ambas | Completar perfil desde una pantalla pequeña: evitar tarea inicial excesiva y pérdida al cancelar | `OnboardingName`, `OnboardingPhoto`, preferencias y `ProfileQuestions`: separar mínimos obligatorios de enriquecimiento opcional, borrador versionado por usuario y explicación breve de privacidad. Unificar títulos y botones del selector de edad con el resto. |
| M06 · P2 · Ambas | Abrir evento/desafío desde link/notificación con app cerrada, abierta, sin sesión o contenido eliminado | `App.tsx`, `reminderNavigation.ts`, detalles: destino diferido tras login, fallback a Home/lista, una sola navegación y botón Atrás determinista. Ampliar pruebas a dominio verificado iOS/Android, no solo parseo de rutas. |
| M07 · P2 · Ambas | Explorar listas extensas sin saltos, paginar y volver conservando posición | `Events`, `Matches`, consultas de feeds: medir renders/solicitudes, paginación por cursor, componentes de fila estables y precarga acotada. Consolidar listeners de auth: `useAuthSession` registra una suscripción por consumidor. |
| M08 · P2 · Ambas | Medir regresiones de producción por versión sin registrar datos privados | Arranque, imágenes, filtros, envío, deep links y ErrorBoundary: métricas p50/p95, errores con contexto mínimo, crash-free sessions, rendimiento Android de gama media. Objetivos iniciales a validar: primer contenido útil <2 s con caché, feedback táctil <100 ms, error recuperable con límite explícito. Son objetivos, no mediciones obtenidas. |

## Validación de la rama

- `npm test`: **287 pruebas, 284 pasan, 0 fallan, 3 omitidas** por ser integraciones opt-in. No se incluyen como aprobadas las omitidas.
- `npm run typecheck`: pasa, contra 5 errores iniciales.
- `npm run colors:check`: pasa, 298 archivos de código más colores nativos y Lottie.
- `VIBES_LOCAL_DB_TESTS=1 NODE_PATH=/tmp/vibes-audit-db/node_modules node --test scripts/mobile-audit-db.test.cjs`: pasa una integración con múltiples assertions: carrera de último cupo, idempotencia, invitación privada, identidad inmutable, moderación y consentimiento de conexión. Usa paquetes de ensayo instalados en `/tmp`; no requiere ni usa credenciales productivas.
- `EXPO_OFFLINE=1 npx expo export --platform all --output-dir /tmp/vibes-premium-audit-export`: exporta Android/iOS/web. Android ~8,99 MB e iOS ~8,97 MB de bytecode; no equivalen al peso de descarga de las tiendas. No fue build firmado.
- `npm install --ignore-scripts --no-audit`: instalación completada. `npm run postinstall` ejecutado posteriormente: pasa los parches propios de modal Android y navegación web.
- `npm audit --omit=dev`: 68 avisos, ninguno crítico. Hay trabajo pendiente, incluso en dependencias distribuidas como dependencias de producción que se usan principalmente para tooling.

## Plan priorizado

### Antes de publicar

1. Revisar y probar la migración de esta rama contra staging con el esquema completo: C03–C07; casos de invitaciones, dueños, bloqueos, eliminación y versiones anteriores. Recién después desplegar por el circuito habitual. Los tests con esquema reducido no sustituyen esa revisión.
2. Resolver P01 (proyección pública/privada), P02 (push por instalación) y P03 (join/leave atómicos). Son trabajos de seguridad/consistencia con mayor valor que cambios cosméticos.
3. Corregir horario estructurado y fuente única de conteo de P04 con datos confirmados. Revisar otros eventos importados sin hora explícita.
4. Validar S01 en Samsung físico y hacer upgrade desde la versión publicada sin borrar datos. Debe funcionar entrar, salir, reiniciar y recuperar sesión.
5. Build release Android/iOS: OAuth, permisos, push foreground/background/cerrada, enlaces fríos/calientes, Android Atrás, gestos iOS, modales, offline/reintentos y dos cuentas para consentimientos/chat/invitaciones. Probar no-foto/foto rota sin crear conexiones con personas reales.
6. Mantener gates de pruebas/tipos/paleta; revisar los 44 avisos altos por componente alcanzable y proteger Auth según S05.

### Siguiente iteración

- P05 y M01–M04: navegación de Discover accesible, filtros predecibles, permisos contextuales y estados de red. Unificar botones restantes y controlar safe areas con fuente grande, teclado y pantallas pequeñas.
- Medir S02/M07/M08 y optimizar con datos: fotos derivadas, caché acotada, consultas por visibilidad, paginación y menos suscripciones.
- Migración segura de tokens según S03 y actualización nativa coordinada S04, manteniendo compatibilidad de datos y sesiones.

### Mayor valor premium

Primero confiabilidad al entrar y escribir; luego fotos inmediatas sin parpadeo; después datos y acciones coherentes entre lista/detalle/chat. Finalmente pulido de tipografía, densidad, haptics y movimiento opcional. Un usuario debe poder entender qué pasó, volver y reintentar en cualquier estado. No se necesita reemplazar la identidad de Vibes para alcanzar ese nivel.
