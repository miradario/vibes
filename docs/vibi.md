# Vibi — primera versión

## Alcance acordado

Backend Supabase y chat accesible desde el botón Vibi en la esquina superior derecha de Home. Una conversación continua por usuario, con historial paginado y borrado completo opcional. Personaliza con preferencias guardadas y lo conversado; no modifica preferencias ni registra feedback explícito.

Recomienda actividades nuevas: eventos futuros con cupo y desafíos públicos no terminados. Excluye inscripciones existentes y creadores bloqueados o inactivos. Ser el creador no excluye una actividad pública si el usuario todavía no está inscripto. Personas respeta los filtros guardados de Descubrir, bloqueos en ambos sentidos, likes previos y descartes de los últimos 30 días. Las tarjetas se revalidan al cargar historial y al abrirlas.

## Activar DeepSeek

El backend `vibi-chat` y las tablas ya fueron publicados en **Mindora Vibes** (`mhmpjezgdvnqyqsnabuq`).

1. Abrir [Edge Functions → Secrets](https://supabase.com/dashboard/project/mhmpjezgdvnqyqsnabuq/functions/secrets).
2. Crear el secreto **`DEEPSEEK_API_KEY`** con la clave de la cuenta DeepSeek con saldo.
3. Guardar. No poner la clave en `.env.local`, en variables `EXPO_PUBLIC_*` ni en el código de la app. No hace falta reenviarla a Codex.
4. Abrir Vibes → Home → Vibi, elegir una categoría y enviar un mensaje.

Opcional: `DEEPSEEK_MODEL` permite elegir otro modelo compatible con Chat Completions y JSON Output. El valor predeterminado es `deepseek-flash`, según la [documentación actual de DeepSeek](https://api-docs.deepseek.com/api/create-chat-completion/). Usa JSON Output sin streaming y un máximo de 25 segundos por llamada al proveedor.

Sin clave, el historial y su borrado funcionan; enviar devuelve `not_configured` y la app permite reintentar. La integración con DeepSeek se verificó con la clave configurada y datos sintéticos el 29/09/2026.

## Contrato

Todas las operaciones usan `POST /functions/v1/vibi-chat` y un JWT válido del usuario en `Authorization: Bearer …`. El handler valida el JWT con `auth.getUser()` y comprueba que el perfil siga activo. La comprobación JWT del gateway está deshabilitada para compatibilidad con los métodos de firma; esto no habilita acceso anónimo al handler.

- `{"action":"history","before":null}` crea o retoma la conversación y devuelve `conversation_id`, `category`, `exchanges` y cursor `before`. Cada página incluye hasta 20 intercambios completos.
- `{"action":"send","conversation_id":"uuid","request_id":"uuid","message":"…","category":"event"}` devuelve `{exchange}`. Categoría opcional: `challenge`, `event` o `person`. Con categoría explícita se respeta esa elección; sin ella, el modelo puede interpretar un cambio de tema. Mensajes de hasta 2000 caracteres. Reintentar con el mismo `request_id` recupera la respuesta guardada.
- `{"action":"resolve","id":"uuid","type":"event"}` devuelve una tarjeta vigente o `recommendation_unavailable`. El cliente abre los detalles existentes de Vibes.
- `{"action":"reset","conversation_id":"uuid"}` borra únicamente la conversación propia indicada y sus intercambios. La próxima carga crea una conversación nueva.

Un intercambio contiene mensaje del usuario, respuesta de Vibi y hasta tres recomendaciones. Los IDs y motivos son lo único persistido de las recomendaciones: título, foto y destino se resuelven desde el catálogo actual.

## Persistencia y permisos

- `vibi_conversations`: una fila por cuenta; categoría y bloqueo breve para serializar envíos.
- `vibi_exchanges`: cada par usuario/asistente se guarda de forma atómica. Índice por conversación e ID para paginación; unicidad del identificador de reintento.
- `vibi_usage`: límite inicial de 60 intentos por día UTC y separación mínima de 3 segundos. Borrar historial no reinicia el límite. Las consultas que fallan luego de contactar al proveedor también consumen un intento.

Las tablas tienen RLS. El cliente solo puede leer sus conversaciones e intercambios; las escrituras pasan por el handler autenticado. Los RPC de bloqueo y guardado son `SECURITY INVOKER`, ejecutables exclusivamente por `service_role`. El catálogo se consulta con el JWT del usuario y filtros explícitos adicionales. La tabla de cuota no tiene políticas de cliente ni permisos de cliente: el aviso informativo `rls_enabled_no_policy` es intencional ([referencia](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)).

Un borrado concurrente impide que una respuesta en curso recree el historial eliminado. El bloqueo caduca a los 90 segundos como recuperación ante cortes de red.

## Contexto y límites

- Se envían a DeepSeek intereses, caminos espirituales, objetivos, hobbies, planes e idiomas relevantes, los últimos 10 intercambios y un máximo de 24 candidatos por categoría. El historial completo permanece disponible en la app.
- No se envían emails, teléfonos, fecha de nacimiento, coordenadas precisas, fotos ni el estado privado de ánimo/disponibilidad. Las coordenadas se usan únicamente en servidor para filtrar personas por distancia.
- El mensaje libre del usuario sí se envía al proveedor. Los textos del catálogo son datos no confiables; el modelo no recibe herramientas de escritura ni permisos para conectar personas o inscribirlas.
- La salida JSON se valida estrictamente. El modelo no decide títulos, imágenes ni rutas; los IDs deben pertenecer al catálogo permitido. Si responde mal o falla, no se guarda una respuesta falsa.
- Los desafíos guardan opcionalmente la fecha en el marcador `[[starts_at:…]]` de la descripción. Vibi lo interpreta y excluye desafíos finalizados; los que no tienen fecha son continuos. La frontera del día en servidor se calcula en UTC.
- El pool se pagina antes de filtrar y ordenar para evitar sesgo por el primer bloque de registros. A mayor volumen habrá que llevar esta selección a consultas SQL especializadas; en esta versión es código de servidor sobre los datos actuales.
- Las tarjetas históricas pueden desaparecer si dejaron de ser elegibles. El texto histórico no se reescribe.

## Verificación

- `node --test scripts/vibi.test.cjs`: validaciones, filtros, respuestas del proveedor simuladas, autenticación, clave ausente, idempotencia y combinación de historial.
- `scripts/vibi-rls.test.sql`: permisos reales, aislamiento entre cuentas, concurrencia, cuota y borrado; se ejecuta dentro de una transacción que termina en rollback. Requiere al menos dos usuarios existentes.
- `npx --yes deno check --config supabase/functions/vibi-chat/deno.json supabase/functions/vibi-chat/index.ts`.
- `npm run colors:check`.
- Exportación iOS con Expo: completada.
- `npx tsc --noEmit`: 14 errores preexistentes en otros módulos, confirmados contra HEAD; ninguno en archivos nuevos de Vibi.
- Endpoint desplegado: solicitudes sin sesión y con token inválido devuelven 401.

DeepSeek real: pedidos de eventos, desafíos, seguimiento contextual y saludo verificados con datos sintéticos. Pendiente: revisión visual/interacción en dispositivo. La revisión del simulador quedó bloqueada porque la Mac estaba bloqueada.

## Prueba manual después de activar

1. Entrar desde Home, elegir Desafíos y pedir algo acorde a intereses guardados.
2. Abrir una tarjeta y comprobar que lleva al desafío correcto; volver a Vibi.
3. Pedir eventos con una condición concreta; verificar tarjetas y apertura.
4. Cambiar a personas; abrir perfil y conectar manualmente si se desea.
5. Cerrar y reabrir la app; comprobar el historial.
6. Cortar la conexión durante un envío y reintentar; comprobar que no se duplica.
7. Borrar el historial desde la papelera y verificar una conversación vacía.
8. Con otra cuenta, comprobar que no aparece el historial anterior.

## Corrección de catálogo vacío (29/09/2026)

Se eliminó una exclusión adicional por autoría que dejaba el catálogo vacío cuando la cuenta consultante había creado las actividades públicas disponibles. El criterio de actividad nueva depende de la inscripción, no de quién la creó. La regresión se cubre llamando al catálogo real con actividades propias sin inscripción; siguen excluyéndose personas propias, bloqueos, actividades privadas, pasadas, completas e inscripciones existentes.

## Corrección de interpretación (29/09/2026)

La solicitud se envía como último mensaje de texto, separada del catálogo y las preferencias. Se eliminó el ejemplo literal de bienvenida que coincidía con la respuesta incorrecta observada. Un pedido con una única categoría explícita valida también esa categoría en la salida; pedidos mixtos, negados e implícitos quedan a interpretación del modelo. Una salida inválida permite un único reintento de reparación (hasta 25 segundos por llamada) antes de devolver error, sin persistir la respuesta inválida.

La regresión reproduce «Listame todos los eventos futuros» y la respuesta capturada con categoría nula. Los 21 tests pasan. Cuatro llamadas aisladas a DeepSeek real verificaron ese pedido, desafíos, un seguimiento de eventos y un saludo, sin modificar conversaciones de usuarios.

## Feature flag de Firebase

Proyecto: `vibes-d05e4`. Parámetro booleano: `vibi_enabled`, con valor inicial y predeterminado local `false`.

En [Firebase Remote Config](https://console.firebase.google.com/project/vibes-d05e4/config), cambiar el parámetro y publicar los cambios. La app obtiene y activa valores al arrancar, al volver a primer plano (caché de cinco minutos en producción) y mediante actualizaciones en tiempo real. Sin conexión conserva el último valor activado; una instalación nueva permanece apagada hasta obtener un valor remoto verdadero.

La flag oculta el botón flotante de las pantallas principales y evita montar el chat; si se apaga con Vibi abierto, vuelve a la pantalla anterior sin borrar el historial. Es una flag de lanzamiento en el cliente: no revoca el endpoint de Supabase ni cancela solicitudes que ya llegaron al servidor. La versión web mantiene Vibi apagado.

Requiere un nuevo build nativo con `@react-native-firebase/app`, `analytics` (dependencia del SDK de Remote Config, con recolección automática deshabilitada) y `remote-config`. No basta una actualización de JavaScript para agregar estos módulos. Los builds anteriores sin Firebase dejan Vibi apagado. iOS usa `com.gurudevelopers.vibes`; Android usa `com.miradario.vibe`. Los archivos de configuración Firebase son identificadores públicos de cliente y no contienen credenciales de administración. Sus fuentes se conservan en `config/firebase/`, fuera de las carpetas nativas que Expo puede regenerar.

En desarrollo (`__DEV__`), Expo Go y los builds sin módulos nativos de Firebase habilitan Vibi localmente para probarlo. Los builds de producción sin Firebase siguen apagados; los builds con Firebase respetan `vibi_enabled`.

Después de instalar las dependencias, ejecutar `pod install` en `ios` y compilar de nuevo. La configuración Expo reproduce el enlace estático mediante CocoaPods y los archivos nativos versionados ya incluyen el arranque de Firebase y el recurso de iOS. `node --test scripts/vibi-flags.test.cjs` verifica valor inicial, cambios remotos, errores de red, limpieza de suscripciones y ausencia del módulo nativo.

Verificación de la flag (29/09/2026): 24 pruebas automáticas aprobadas; builds Android ARM64 e iOS Simulator ARM64 completos. En el simulador, el SDK descargó y activó `vibi_enabled=false` (verificado en el almacenamiento de Remote Config) y Home ocultó Vibi. La integración iOS mantiene los pods de LiveKit como bibliotecas estáticas para evitar encabezados no modulares con los frameworks estáticos de Firebase.

El acceso a Vibi flota abajo a la derecha, por encima de la barra de navegación. Al entrar a las pantallas principales con sesión iniciada y la flag habilitada, muestra «Necesitas ayuda?» durante ocho segundos, una vez por apertura de la app. La viñeta se puede cerrar o tocar para abrir el chat; el botón permanece disponible y se oculta mientras está abierto el teclado.
# Prompts administrables

El backoffice ofrece `/vibi`: versiones inmutables, conversación de prueba con DeepSeek y catálogo ficticio, publicación y restauración. Solo administradores autenticados acceden mediante `admin-vibi-prompts`. Una publicación requiere una prueba exitosa de la misma versión y verifica que la versión publicada no haya cambiado concurrentemente.

`vibi-chat` lee `vibi_prompt_config.published_id` por respuesta, con respaldo `builtin-v1`, y guarda la procedencia en `vibi_exchanges.prompt_version`. Los borradores no afectan a los usuarios. Las reglas de seguridad y validación permanecen en `provider.ts` y `core.ts`.

Pruebas: `node --test scripts/vibi.test.cjs`; después de la migración, `scripts/vibi-prompts-rls.test.sql` verifica permisos, bloqueo de publicaciones sin probar, conflictos y restauración dentro de una transacción revertida.
