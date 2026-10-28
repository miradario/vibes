# Design system de Vibes

Referencia para diseñar, implementar y revisar la interfaz de la app React Native. Última revisión: 17 de octubre de 2026.

## Alcance y aplicación

- Aplicar estas reglas al crear pantallas o modificar tipografía, controles, estados, layout, animaciones o recursos de marca.
- Los valores base provienen de [`vibesTheme`](../src/theme/vibesTheme.ts). Usar sus tokens en código; las tablas de este documento explican su uso semántico.
- **Norma** significa el criterio para trabajo nuevo y elementos modificados. **Actual** describe una implementación existente; no implica que toda la app ya esté normalizada. Las diferencias pendientes se enumeran al final.
- La paleta y la identidad también aplican a materiales de Vibes. Las medidas de esta guía son unidades lógicas de React Native, no píxeles de screenshots ni una escala tipográfica obligatoria para la landing web.
- Al cambiar una decisión del sistema, actualizar este documento y los tokens o componentes afectados en el mismo cambio. Una excepción debe indicar componente, motivo y alcance.

## Colores

| Token `vibesTheme.colors` | Valor | Uso |
| --- | --- | --- |
| `accentMustard` | `#F4A340` | Acción destacada, selección y acentos de marca |
| `accentBlue` | `#3978B8` | Acciones auxiliares, filtros, indicadores y acentos |
| `accentCoral` | `#D88C7A` | Ilustración y énfasis contextual |
| `background`, `surface` | `#FEFEFD` | Fondo de pantalla, tarjetas y sheets |
| `primaryText` | `#2B2B2B` | Títulos, texto principal, iconos y botones oscuros |
| `secondaryText` | `#6E6E6E` | Descripciones, placeholders y metadatos |
| `muted` | `#6E6E6E` | Alias existente de texto secundario |
| `lineArt` | `#2B2B2B` | Trazos de ilustraciones |
| `borderSoft` | `rgba(43, 43, 43, 0.06)` | Separaciones suaves |

Usar exclusivamente estos seis colores base. Las transparencias derivan de ellos; no crear variantes aclaradas u oscurecidas mediante otros hexadecimales. La restricción incluye bordes, iconos, sombras, degradados e ilustraciones. Las fotografías conservan sus colores naturales.

**Contraste:** texto e iconos `primaryText` sobre mostaza, azul o coral. Texto `surface` sobre fondos `primaryText`. En superficies suaves usar acentos con opacidad y texto oscuro. Un borde, icono o indicador seleccionado debe distinguirse de su fondo. Validar legibilidad en el tamaño real; pertenecer a la paleta no garantiza contraste suficiente.

**Estados:** comunicar error, éxito y selección con texto e iconografía además de color. No introducir rojo o verde fuera de la paleta. Para mensajes de error nuevos, usar texto oscuro, icono y superficie coral con opacidad.

**Excepción vigente:** [`UserProfileSheet`](../components/UserProfileSheet.tsx) permite fondo `#000000` y degradé negro con opacidad sobre la fotografía full-screen. No extenderla a otros componentes.

## Tipografía

Usar `Text` y `TextInput` de [`components/Typography.tsx`](../components/Typography.tsx): proporcionan Inter Regular por defecto y conservan las props nativas, refs y escalado de accesibilidad. Indicar explícitamente tamaño, color y familia para cada rol.

| Token `vibesTheme.fonts` | Familia | Peso equivalente |
| --- | --- | --- |
| `regular`, `primary` | `Inter-Regular` | 400 |
| `medium`, `subtitle` | `Inter-Medium` | 500 |
| `semibold` | `Inter-SemiBold` | 600 |
| `bold` | `Inter-Bold` | 700 |
| `extraBold` | `Inter-ExtraBold` | 800 |

Seleccionar el peso mediante `fontFamily`; evitar combinar una familia cargada con un `fontWeight` contradictorio. Los pesos numéricos de las tablas son descriptivos.

### Jerarquía normativa

La siguiente escala define roles reutilizables. Algunos valores ya existen en pantallas y otros normalizan los casos sin componente compartido; no existen todavía tokens de tipografía para todas estas filas.

| Rol | Tamaño / interlineado | Familia / peso | Color | Uso |
| --- | --- | --- | --- | --- |
| Título de pantalla principal | **34 / 42** | `extraBold` / 800 | `primaryText` | Actividades, Eventos, Desafíos, Descubrir, Chats; mismo estilo en todas |
| Título de onboarding | 36 / 43 | `extraBold` / 800 | `primaryText` | Pregunta principal; en ancho <360: 30 / 36 |
| Título de pantalla secundaria | 26 / 32 | `semibold` / 600 | `primaryText` | Historial y vistas subordinadas |
| Título de sección | 25 / 29 | `semibold` / 600 | `primaryText` | Agrupaciones principales de un feed |
| Título de modal estándar | 24 / 30 | `bold` / 700 | `primaryText` | Confirmaciones y sheets simples |
| Título de tarjeta | 20 / 26 | `medium` / 500 | `primaryText` | Tarjetas de contenido con espacio amplio |
| Título de tarjeta compacta | 17 / 23 | `bold` / 700 | `primaryText` | Filas compactas de eventos |
| Subtítulo de pantalla | 15 / 22 | `subtitle` / 500 | `secondaryText` | Explicación breve debajo del título |
| Cuerpo | 16 / 24 | `regular` / 400 | `primaryText` | Texto de lectura e instrucciones |
| Cuerpo secundario | 15 / 22 | `regular` / 400 | `secondaryText` | Descripciones auxiliares |
| Label de campo | 14 / 20 | `semibold` / 600 | `primaryText` | Identificación persistente de un input |
| Texto de input | 16 / 24 | `regular` / 400 | `primaryText` | Valor editable; placeholder en `secondaryText` |
| Ayuda o validación | 14 / 20 | `regular` / 400 | `secondaryText` | Ayuda; error en `primaryText` más icono |
| Metadato compacto | 13 / 18 | `regular` / 400 | `secondaryText` | Fecha, lugar, participantes |
| Label de chip | 14 / 20 | `semibold` / 600 | `primaryText` | Filtro o categoría |
| Contador / badge | 12 / 16 | `bold` / 700 | `primaryText` | Cantidades, nunca información principal |
| Enlace / acción textual | 16 / 22 | `semibold` / 600 | `primaryText` | Acción con contexto, subrayado o icono identificable |

Alinear títulos a la izquierda salvo pasos de onboarding explícitamente centrados.

El título de pantalla principal es idéntico en todas las pantallas que lo usan: 34 / 42, `extraBold`, `primaryText`, sin overrides de tamaño, peso ni interlineado por pantalla. Está prohibido definir una variante "compacta" o más chica para una de ellas. Si el título no entra en una línea, la única excepción permitida es que se achique automáticamente (`numberOfLines={1}`, `adjustsFontSizeToFit`, `minimumFontScale={0.75}`), aplicada igual en todas. Resolver el resto de la falta de espacio redistribuyendo acciones de la cabecera. Mantener el escalado de texto y comprobar títulos largos, castellano/inglés y ancho compacto. Limitar líneas únicamente cuando el contenido completo sea accesible en el detalle.

Fuentes actuales: [`Events.tsx`](../screens/Events.tsx), [`Discover.tsx`](../screens/Discover.tsx), [`vibesOnboardingStyles.ts`](../src/screens/Onboarding/vibesOnboardingStyles.ts).

## Botones y acciones

Norma: una acción principal por bloque de decisión. Texto en forma de verbo concreto: “Crear evento”, “Guardar”, “Continuar”. Usar los componentes existentes cuando correspondan; no hay todavía un único componente que implemente todas las variantes.

| Variante | Geometría | Texto: tamaño / línea, familia, peso | Texto e icono | Fondo / borde |
| --- | --- | --- | --- | --- |
| Primario oscuro | Alto mínimo 56, radio `pill`, padding horizontal 20 | 18 / 24, `bold`, 700 | `surface` | `primaryText`, sin borde |
| Primario de acento | Alto mínimo 58, radio `pill`, ancho del bloque | 18 / 24, `bold`, 700 | `primaryText` | `accentMustard`, sin borde |
| Secundario contorneado | Alto mínimo 48, radio `md`, padding horizontal 16 | 16 / 22, `semibold`, 600 | `primaryText` | `surface`, borde 1 de `primaryText` al 12% |
| Secundario de acento (contorno azul) | Alto mínimo 52, radio `pill`, padding horizontal 16 | 16 / 22, `semibold`, 600, centrado | `accentBlue` | `surface`, borde 1,5 de `accentBlue` al 45% |
| Acción de cabecera | Alto mínimo 48, radio 14, padding horizontal 18, gap 8 | 16 / 20, `semibold`, 600 | `primaryText` | `secondaryText` al 4,7% (`0C`) |
| Solo icono | Área mínima 44 × 44; icono 20–24 | Sin texto visual; label accesible obligatorio | `primaryText` | `surface` o superficie suave |
| Volver | 44 × 44, radio 13; chevron 27 | Label accesible “Volver” | `primaryText` | `surface` con `secondaryText` al 4,7% |
| Terciario / omitir | Área táctil mínima 44 de alto | 18 / 24, `regular`, 400 | `secondaryText` | Transparente |
| Autenticación Google | Alto mínimo 54, radio 22, borde 1 | 16 / 22, `medium`, 500 | `primaryText` | `surface` al 92%; borde mostaza al 28% |

Componentes: [`PrimaryButton`](../components/onboarding/PrimaryButton.tsx) para onboarding, [`VibesActionButton`](../components/VibesActionButton.tsx) para start/skip y `variant="outline"` (secundario de acento, usado por la guía de Vibi junto a un primario de acento), [`BackButton`](../components/BackButton.tsx), [`GoogleAuthButton`](../components/GoogleAuthButton.tsx) y [`AppleAuthButton`](../components/AppleAuthButton.tsx). Conservar la implementación específica de autenticación; no sustituir sus comportamientos por un botón genérico.

### Cabeceras de Eventos y Desafíos

Las tabs de Desafíos son Público, Mis desafíos y Por Vibes, con el mismo estilo pill. Cada opción conserva padding horizontal 10 y vertical 8; ajustar el texto a una línea para que Mis desafíos no toque los bordes. Por Vibes es un catálogo de desafíos curados: cada tarjeta usa `ChallengeFeedCard` con la acción Reiniciar, igual que los finalizados.

En los acordeones de Desafíos privados, mantener el título de sección en 25 / 29 SemiBold y mostrar la cantidad a continuación entre paréntesis, en 18 / 29 Regular y `secondaryText`.

Usar botones de solo icono de 44 × 44, radio 14, fondo `secondaryText` al 4,7% y separación 6. Crear usa `add` de 20; historial usa `archive-outline` de 23, ambos en `primaryText`. Eventos muestra **+ → archivo**; Desafíos conserva **+ → inicio → comenzados → archivo**. Mantener labels accesibles específicos (“Crear evento”, “Ver eventos pasados”, etc.).

### Estados de interacción

- **Presionado:** feedback de opacidad; los componentes actuales usan `activeOpacity` entre 0,8 y 0,9. Mantener el patrón del componente reutilizado.
- **Deshabilitado:** bloquear interacción y exponer el estado accesible. Primario de onboarding actual: opacidad 0,42; Google: 0,5. La atenuación nunca es el único mecanismo que deshabilita.
- **Cargando:** conservar tamaño del botón, mostrar `VibesLoader`, impedir envíos repetidos y exponer estado ocupado.
- **Seleccionado:** texto legible, borde o indicador visible, `accessibilityState.selected`; no comunicar selección solo con un cambio sutil de fondo.
- **Destructivo:** acción explícita y confirmación proporcional a la pérdida de datos; usar paleta autorizada, no rojo agregado.

En Editar perfil, “Guardar” mantiene sus dimensiones y su texto durante el envío: el tilde se reemplaza por `VibesLoader`. La pantalla permanece abierta si falla el guardado.

## Campos, búsqueda y selección

- Label persistente sobre el campo; placeholder como ejemplo o ayuda, no como único nombre accesible.
- Norma para campos nuevos: mínimo 48 de alto, padding horizontal 16, vertical 12, radio `md`, fondo `surface`, borde 1 de `primaryText` al 12%. Usar los roles de label, input y ayuda de la tabla tipográfica.
- Focus: borde azul visible; error: icono, texto explicativo y borde coral. Mostrar la validación cerca del campo y conservar el valor ingresado.
- Multilínea: altura adaptable y alineación superior; evitar que teclado o footer oculten el campo activo.
- Búsqueda actual de Eventos: contenedor de 40 de alto; el input termina en 16 / `medium` por un override. No copiar esta altura como estándar de control táctil nuevo.
- Opciones de onboarding actuales: mínimo 64 de alto, radio 18, label 16 / `semibold`, fondo `surface` al 86%, borde mostaza al 22%. Selección: fondo mostaza al 8% y borde mostaza sólido.
- Chips: label 14 / 20 `semibold`; área táctil mínima 44 aunque la cápsula visible sea menor. Mantener seleccionados distinguibles de su fondo.

El selector de fotos de onboarding y Editar perfil es el mismo `ProfilePhotoPicker`: foto principal circular, grilla de hasta seis fotos y menú para ajustar o eliminar. Mostrar el estado de guardado y bloquear cambios mientras se suben las fotos. Las ayudas de onboarding usan cuerpo 14 / 20 y `secondaryText` con un icono azul.

## Layout, superficies e iconografía

| Grupo | Tokens / regla |
| --- | --- |
| Espaciado | `xs` 4, `sm` 8, `md` 16, `lg` 24, `xl` 32, `xxl` 48 |
| Radios | `sm` 8, `md` 16, `lg` 24, `pill` 999 |
| Padding de pantalla nuevo | 24 horizontal; 16 si el ancho compacto lo requiere |
| Tarjeta estándar nueva | Fondo `surface`, radio `md`, padding 16, separación 16; borde `borderSoft` |
| Separación entre secciones | 24 o 32; 8 entre título y descripción |
| Iconos de acción | 20–24; área táctil mínima 44 × 44; excepción BackButton: 27 |
| Sombras | Base `primaryText`, `secondaryText` o acento autorizado, con opacidad; preferir borde suave cuando alcance |

Usar [`ScreenContainer`](../components/ScreenContainer.tsx) en pantallas nuevas. Sus edges por defecto son top/left/right; definir el manejo del borde inferior junto con el tab bar, footer y teclado para evitar dobles insets. Las medidas históricas como `paddingTop: 68` de Eventos no son una norma para pantallas nuevas.

Usar [`Icon`](../components/Icon.tsx) para iconografía existente. Etiquetar acciones de solo icono con `accessibilityLabel` y rol. Evitar texto significativo dentro de imágenes cuando puede renderizarse como texto accesible.

## Modales y movimiento

Usar [`AnimatedSheetModal`](../components/AnimatedSheetModal.tsx) para sheets y modales animados; soporta `placement="bottom"` y `"center"`. Reutilizar sus props para cierre y backdrop.

Los valores actuales de `vibesTheme.motion.modal` son: backdrop `primaryText` al 28%, desplazamiento vertical 320, entrada/salida de backdrop 120/110 ms, entrada/salida de sheet 220/170 ms, demora de entrada 50 ms y opacidad de entrada/salida 190/130 ms. Usar los tokens, no duplicar números en cada pantalla.

Norma: respetar reducción de movimiento en animaciones nuevas; mantener cierre accesible, acceso al teclado y foco coherente. El componente actual no debe interpretarse como garantía de que toda la accesibilidad modal ya esté resuelta.

Los estados de arranque Boot y Startup muestran la animación de marca en Android e iOS, respetando la preferencia de reducción de movimiento. El splash nativo del sistema permanece estático; al ocultarse, continúa la pantalla animada de la app.

## Marca y capturas

- Fuente del logo actual: [`assets/branding/vibes-logo-palette.svg`](../assets/branding/vibes-logo-palette.svg). Esferas coral y mostaza, hoja azul, trazos oscuros. Ver [guía de assets](../assets/branding/README.md).
- Para favicon usar versión legible a 16–32 px, con margen reducido, sin deformar el símbolo y con fondo que conserve contraste. Los assets de la landing viven en su propio repositorio.
- Capturas para la landing: mismo dispositivo y resolución (serie actual: iPhone 17, 1206 × 2622), hora 9:41, batería completa sin carga, datos e imágenes ya cargados, sin teclado, warnings ni overlays temporales.
- Mantener proporción original y mostrar la pantalla completa dentro del marco. No incorporar el marco del Simulator a una captura que luego tendrá marco HTML.
- Validar con el usuario las pantallas elegidas antes de incorporarlas; una instrucción explícita de recapturar y actualizar una serie aprobada autoriza esa actualización.

## Diferencias pendientes conocidas

Esta documentación no modifica la UI ni afirma una migración completa:

- `VibesActionButton.skipButton` tiene padding vertical 6 y no fija un mínimo táctil de 44 en el layout; desde el FTUX tiene `hitSlop` de 8 por lado (área táctil ≈ 50) sin cambiar su tamaño visual. Revisar el layout al modificarlo.
- El título del modal de filtros de Descubrir usa 38 / Bold. Es una variante existente, no el estándar para nuevos sheets simples.
- Eventos y Desafíos usan overrides para el título principal; el estilo base 26 / 32 SemiBold sigue atendiendo vistas históricas. No eliminarlo sin revisar `pastOnly`.
- Tamaños, interlineados y labels todavía están distribuidos en estilos locales. Esta escala es normativa, pero no equivale a un conjunto de componentes o tokens ya implementados.

## Sobre mí

“Sobre mí” reúne los datos pedidos durante el onboarding: Identidad muestra la descripción y las respuestas personales; Intereses reúne prácticas con sus detalles e intereses; Planes incluye motivos para usar Vibes y preguntas sobre planes. Los datos personales y las fotos se administran en Editar perfil. Los accesos “Más opciones de perfil” y “Preferencias” están ocultos por ahora; conservar sus datos guardados.

## Verificación al cambiar interfaz

1. Elegir el rol semántico y componente existente antes de definir estilos nuevos.
2. Revisar estado normal, presionado, deshabilitado, carga, vacío y error según corresponda.
3. Comprobar ancho compacto, escalado de texto, teclado, safe areas y truncamientos. En pantallas hermanas comparar títulos lado a lado.
4. Ejecutar `npm run colors:check` después de cambiar colores, estilos o ilustraciones. El script valida paleta; no reemplaza la revisión de contraste, tipografía o layout.
5. Registrar cualquier excepción nueva en esta guía y mantener sus enlaces a fuentes vigentes.

Los filtros de personas comparten las opciones de las preguntas de perfil y los motivos del onboarding. No ofrecer preferencias antiguas que ya no se solicitan ni duplicar alimentación o tabaco.

## Creación y edición de contenido

Crear/editar eventos y desafíos comparten `src/theme/creationFormStyles.ts`: título secundario 26/32, labels 14/20, campos 16/24 con borde suave y radio 16, botón principal oscuro de 56 y radio pill. El pie forma parte del layout y no se superpone al formulario. Usar ScreenContainer con top/left/right y aplicar el inset inferior una sola vez en el pie. En Android el teclado usa adjustResize; no agregar una segunda compensación de altura mediante KeyboardAvoidingView.

Los compositores de chats directos, eventos y grupos comparten `chatComposerBottomPadding`: safe area inferior una sola vez con teclado cerrado; 8 con teclado abierto. Chats y onboarding usan `KeyboardViewport`: en Android mide el solapamiento real del teclado sobre un contenedor independiente y compensa únicamente el espacio que no resolvió `adjustResize`. Descarta mediciones anteriores al último cambio de layout o cierre del teclado. En iOS se conserva `KeyboardAvoidingView` con padding.

La barra de navegación inferior se apoya en el borde inferior, sin margen externo debajo. Su superficie incluye el safe area inferior una sola vez; los botones quedan por encima del área de gestos. Conservar la geometría compartida en `src/lib/tabBarLayout.ts` para los espacios de contenido y la guía FTUX.

La barra inferior compacta usa 64 de alto base (adaptable al tamaño de texto), 12 de espacio superior y botón seleccionado de 48 que sobresale 6 sobre la superficie. El contenido reserva su altura real más 20 de separación, sin espacio extra específico de iOS.

El padding inferior de la barra respeta el inset completo, con un mínimo de 12, para separar iconos y labels del borde y del área de gestos. Usar `getTabBarBottomPadding` también en la geometría del contenido y FTUX.

## Eventos frecuentes

Crear y editar eventos permite repetición semanal (uno o más días) o mensual, con entre 2 y 52 encuentros. La repetición mensual conserva el día original y usa el último día del mes cuando corresponde. El formulario muestra las primeras tres fechas antes de guardar y aclara que la inscripción y los cupos son compartidos por la serie.

Cada serie ocupa una sola tarjeta en Eventos, con frecuencia y próxima fecha. El filtro “Frecuentes” muestra solo series. El detalle muestra tres encuentros próximos y permite desplegar todas las fechas, incluidas las anteriores. Usar `EventRecurrenceEditor` y `EventOccurrenceList`, con los mismos tokens y roles tipográficos del formulario.

La regla de repetición se guarda como `recurrence` en el primer encuentro de `events.schedule`; `normalizeSchedule` conserva esos metadatos al leer y guardar. Las fechas se generan al guardar la serie; no hay generación indefinida ni nuevas inscripciones por encuentro.

En Home, si la persona que navega no tiene una foto válida, las fotos de perfiles sugeridos, solicitudes y conexiones se muestran desenfocadas (radio 24). Aplicar el desenfoque también a las previsualizaciones durante la carga. Al subir una foto válida se muestran nítidas; los perfiles sin imagen conservan su placeholder.

Descubrir aplica el mismo desenfoque de radio 24 en las burbujas, el historial y el visor de perfiles cuando quien navega no tiene foto válida. Las URLs de preview nunca habilitan fotos nítidas; la autorización depende únicamente de la foto propia. Mantener desenfocadas también la siguiente tarjeta y las fotos de la vista de detalles, y bloquear la galería nítida.

## Conocer gente

Onboarding y Configuración comparten `MeetPeopleChoice`: switch “Conocer gente” y explicación persistente del alcance. Desactivado, el perfil queda fuera de Descubrir, se oculta la pestaña y Home no muestra sugerencias ni solicitudes sociales. Los chats existentes, eventos y grupos siguen disponibles. No depender de los motivos seleccionados para inferir esta preferencia; guardar `user_preferences.meet_people_enabled` explícitamente. Las cuentas existentes mantienen la opción activa hasta desactivarla. La elección es reversible y solo se refleja como guardada tras confirmación del servidor.

La exclusión del servidor se aplica a `get_discovery_candidates`. Las versiones antiguas que consultan `profiles` directamente requieren reglas adicionales de lectura; esas reglas globales no forman parte de la migración aplicada.

Al entrar a Descubrir, cambiar entre perfiles e historial o reintentar, ocultar el resultado anterior hasta que termine la recarga activa. “Reintentar” renueva los perfiles y las URLs de fotos, y reinicia las vistas de imagen. No mostrar la acción “Volver a iniciar” en estos errores. Las respuestas tardías de intentos anteriores no deben liberar el estado de carga del intento actual.


La pestaña Actividades reúne Eventos y Clases con un selector de dos opciones. La selección activa usa fondo primaryText y texto surface; cada opción tiene área táctil mínima de 44. Clases y sus accesos se muestran únicamente cuando el flag Firebase `clases` está activo.

## Imagen para compartir un desafío completado

`ChallengeCompletionShareCard` genera una pieza vertical de 1080 × 1350 con `VibesWordmark` (V mayúscula, punto coral, i mostaza y e azul semillena), círculos de la paleta con opacidad, imagen y título del desafío, “DESAFÍO COMPLETADO”, “¡Lo logré!” y “Un día a la vez. Un cambio para mí.”. No agregar una firma promocional al pie. Usar la imagen original sin regenerarla; si no carga, usar la ilustración de desafío incluida en la app. El lienzo de exportación tiene tipografía fija; la interfaz que lo presenta conserva escalado de accesibilidad. Esperar a que la imagen se muestre antes de capturar y al cierre completo del sheet antes de abrir Compartir.

Las tarjetas del listado de Eventos usan una fila compacta: padding 10, separación 12, foto cuadrada de 88 con radio 12 centrada verticalmente y cuerpo con separación 3. Mantener título 17/23 en una línea, fecha y ubicación en una línea cada una y una última línea combinando frecuencia/horarios y personas. “Para ti” se superpone en la esquina inferior de la foto. El cuerpo no supera el alto de la imagen de 88; la imagen crece proporcionalmente al escalado de texto de accesibilidad. Conservar flecha de acceso al detalle para leer la información completa. “Para ti” usa texto oscuro sobre mostaza.

En Actividades, Crear evento e Historial se ubican junto al título, antes del selector Eventos/Clases. El feed embebido no duplica esa cabecera ni el subtítulo. Eventos muestra primero las inscripciones en “Tus eventos (cantidad)”, luego la recomendación en “Para vos” y finalmente el resto en “Explorá más”; muestra los resultados completos de cada grupo. Los filtros de Fecha, Ubicación y Más filtros preceden a las categorías (Todos primero), con áreas táctiles de al menos 44.

La barra completa de filtros de los listados (búsqueda, fecha, ubicación, otros filtros, categorías y caminos) se oculta al avanzar y reaparece al retroceder o llegar al inicio, con umbral de 28 para evitar saltos por movimientos mínimos. Respeta reducción de movimiento. Los caminos usan DiscoverPathCards y las opciones compartidas de la app. Las categorías y tipos de participación ofrecidos en Eventos se derivan del catálogo completo vigente (del catálogo vencido en Historial), independientemente de los filtros seleccionados.

La barra de filtros se anima con translateY sobre el listado, sin modificar la altura de FlatList durante el gesto. El listado reserva una cabecera de altura fija para su posición inicial. Ignorar el rebote de ambos extremos al detectar el sentido, para evitar alternancias y saltos provocados por cambios de viewport.

## Solicitudes de clases sin pagos

El detalle de clases externas muestra foto, docente, horario, lugar y acordeón “Sobre esta clase”. ClassReservationPanel permite clase suelta o plan mensual, mes y frecuencia; los selectores abren AnimatedSheetModal. El resumen usa fechas calculadas en la zona horaria de la clase, excluyendo las pasadas. Las referencias externas son solicitudes personales pendientes, no se envían al organizador ni confirman cupo. Indicar que la persona debe contactar al organizador. No mostrar checkout ni total mensual. Guardar y cancelar persiste en el servidor; Mis clases incluye las solicitudes pendientes y el historial conserva las canceladas. Las clases propias usan sus encuentros reales; los cursos conservan su inscripción completa.

La cabecera de Actividades usa título compacto 26/32 SemiBold, a pedido del usuario. En Desafíos el título usa 22/28 SemiBold y comparte una sola fila con los cuatro botones de 44, con separación 6. Permitir ajuste del título en ancho compacto sin partir la palabra. No mostrar el subtítulo “Pequeños pasos, en buena compañía”. Los labels de la barra inferior usan 11/14 Regular y conservan una sola línea.

El detalle externo de clase usa layout compacto: padding 16, separación 10, foto de 168 de alto y título 22/28. Notas y fecha de consulta se despliegan con “Sobre esta clase”. El formulario de solicitud usa separación 10, resumen con padding 12 y fechas en grilla; mantiene controles de al menos 44–48 de alto y un único aviso breve sobre contacto y ausencia de cobros.

En el archivo de Desafíos, el control de la derecha pasa a “Volver a desafíos” (arrow-back) y regresa con goBack para conservar los filtros del listado. No duplicar una segunda acción Volver a la izquierda ni mostrar la casita en ese historial.

Las tarjetas compactas de clases mantienen título y horario en una línea y separación 3, para que el cuerpo no supere el alto de la imagen. Omitir el precio cuando no está publicado; no mostrar “Precio a consultar” en el listado. En las referencias externas la imagen acompaña el escalado de fuente.

“Tipo de evento” (categoría) se elige dentro de Más filtros, con opciones presentes en los eventos cargados. Se guarda al Aplicar y se restablece con Limpiar. No mostrar categorías en la barra horizontal; no mostrar los accesos Todos ni Frecuentes.

Camino espiritual se elige únicamente en la barra principal de Eventos. Más filtros no lo duplica ni modifica su selección al aplicar o limpiar.

El detalle de clase muestra ClassLocationMap cuando dispone de dirección concreta (campo dirección del catálogo; en clases propias, ubicación con numeración). No ubicar el pin usando únicamente la ciudad. La vista previa tiene 120 de alto y acción Ver ubicación de al menos 44; abre el mapa externo y conserva la dirección como alternativa si falla la imagen. Reutiliza la configuración de mapas de Eventos.

En el detalle externo de clase, la cabecera muestra el nombre de la clase sobre la foto, entre Volver y Compartir. Omitir “Detalle de clase” y no repetir el nombre debajo de la foto; permitir varias líneas para títulos largos.

Los sheets compartidos de Clases (ui.sheet) deben declarar fondo surface opaco y radios superiores 24. La confirmación de solicitudes respeta el safe area inferior con padding mínimo 24 para que el contenido y las acciones no se superpongan al fondo ni al área de gestos.

En el detalle de clase con mapa, omitir la fila “Presencial”; conservar la modalidad si es online o mixta.

Por el momento, el listado de clases oculta propuestas sin fechas ni horarios publicados: las clases propias requieren encuentros y las referencias externas requieren horario semanal o próxima fecha confirmada.

El detalle de clase permite “Invitar a alguien” usando EventInviteSheet: conexiones, invitación por chat y compartir por enlace. La invitación recibida en chat incluye “Ver clase”, que abre su detalle dentro de Vibes.

Los filtros de Clases ofrecen únicamente prácticas, modalidades, lugares y fechas presentes en propuestas disponibles, sin usar perfiles ficticios ni clases sin horarios. Al guardar una solicitud activa se incorpora a la persona al chat de esa clase (grupo compartido por propuesta), accesible desde “Ver chat de la clase”. Cancelar la última solicitud activa revoca su membresía. Estar en el chat no confirma reserva ni cupo.

El botón + de Clases lleva directamente a Crear clase (LearningActivityEditor). Si un responsable autorizado aún no tiene perfil, primero crea su perfil y luego continúa al formulario. Guardar una clase nueva abre Mi espacio para revisar y publicar el borrador. Conservar las autorizaciones del servidor.

El + de Clases permanece visible para todas las cuentas. Al tocarlo, comprobar la autorización: si falta habilitación de responsable, explicarlo sin ocultar el control ni permitir escrituras no autorizadas. Si falla la consulta, ofrecer Reintentar.

Por el momento, el modal compartido “Invitar a alguien” oculta el acceso “Ir a Discover”. Conserva invitaciones a conexiones y compartir por WhatsApp o enlace; el estado sin conexiones no indica navegar a Discover.

En Nuevas conexiones, el contador de solicitudes se dibuja por encima de todas las fotos apiladas: su zIndex supera el máximo de la pila. Conservar el margen superior y lateral que evita cortar el badge; no bloquear con él el acceso táctil a Solicitudes.

La navegación inferior ocupa todo el ancho de la pantalla, sin márgenes laterales ni ancho máximo. Eventos y Clases tienen accesos independientes; Clases respeta su feature flag. Cada pantalla mantiene su título y acciones propios, sin selector compartido de Actividades. La guía FTUX calcula sus posiciones con los mismos accesos visibles.

Inicio es el primer acceso de la barra inferior, a la izquierda, seguido de Desafíos, Eventos, Clases, Descubrir y Chats. Distribuir los accesos visibles con el mismo ancho y conservar su orden en la guía FTUX.

Los indicadores seleccionados de la barra inferior alternan los acentos por acceso: Inicio coral, Desafíos azul, Eventos coral, Clases mostaza, Descubrir azul y Chats coral. Los iconos sobre estos fondos conservan `primaryText` para legibilidad.

Descubrir no muestra el acceso “Clases y espacios”. Las clases se consultan desde su acceso propio en la navegación inferior.

## Tus Vibes

Inicio muestra el puntaje Vibes alineado a la derecha en la misma fila de la cabecera, como acceso al total y al historial propio. La cabecera conserva avatar y saludo, sin botón de Configuración ni subtítulo de bienvenida, para subir el contenido. Usar cápsula mostaza suave con borde, icono de pulso en círculo mostaza y total destacado, sin chevron ni la palabra “Vibes” visible (conservarla en el label accesible), 17/23 Bold en primaryText; conservar área táctil mínima de 44. Tus Vibes usa ScreenContainer, superficies suaves mostaza/coral, iconos azules y puntajes en primaryText. No usar verde para los incrementos. Mostrar total, aportes y acumulado del mes; estados de carga, error con Reintentar, historial paginado y estado vacío. Cómo funciona abre AnimatedSheetModal. Los Vibes no tienen valor monetario. Los valores se calculan en base de datos a partir de meditación registrada (+10 por día), invitación por chat (+5 por actividad, máximo tres al día UTC), asistencia confirmada a clase (+50 por sesión) y desafío completo (+100). Incluir actividad anterior registrada, sin inventar asistencias a partir de reservas.

El registro de meditación es una declaración de la persona, no una verificación automática de reproducción. Se guarda privado por defecto y el servidor elige el día UTC. El sheet permite 5, 10 o 20 minutos, guiada o en silencio; muestra confirmación, duplicado y error, sin multiplicar el puntaje por duración.

## Comunidades y filtro inicial

El onboarding pregunta “Tus comunidades” y permite elegir varias: El Arte de Vivir, Danzantes, Ashtanga, Hatha, Meditación, Bikram, Músicos, Artistas, Servicio y Otros. Reemplaza la denominación Camino espiritual en perfil y filtros. La selección guardada sirve de filtro inicial en Eventos, Desafíos, Clases, Descubrir y recomendaciones de Vibi. Usar la misma normalización y coincidencia OR en todas las superficies, excluyendo perfiles y contenido sin comunidad asignada cuando hay una selección activa. Sin selección, incluir todos. No inferir pertenencia a partir de descripciones. Conservar el acceso al contenido personal ya adquirido o iniciado. Los filtros de exploración permiten cambiar la selección o elegir Todos; no modificar el perfil al hacerlo. La creación de eventos y desafíos permite asignar comunidades mediante los mismos chips.

En Eventos y Desafíos, mostrar la comunidad seleccionada únicamente en DiscoverPathCards, sin duplicarla con chips de filtros activos. Los filtros activos de comunidad se muestran en Clases y Descubrir mediante ActiveCommunityFilters: un chip por comunidad con “×” y una acción Limpiar. Quitar un chip actualiza inmediatamente los resultados de esa pantalla; Limpiar muestra todas las comunidades. No cambiar las comunidades del perfil al quitar filtros. La fila se oculta cuando no hay selecciones y comparte el comportamiento de la barra de filtros del listado.

En Android, KeyboardViewport calcula el solapamiento con la posición absoluta `pageY` de `measure`, sumada a la altura del viewport. No usar `measureInWindow` para este cálculo: en Fabric puede devolver y=0 dentro del SafeAreaView y dejar el compositor debajo del teclado. Conservar la compensación única de adjustResize y descartar mediciones tardías al cerrar el teclado.

## Bienvenida

Welcome muestra AnimatedBrandLogo de 64 × 64, animado en loop y centrado arriba de todo, sin un wordmark estático adicional, una ilustración de comunidad y el mensaje “Encontrá tu comunidad. Conectá con tu bienestar.”. Crear cuenta e Iniciar sesión reutilizan VibesActionButton, con primario oscuro primaryText y texto surface para Crear cuenta, y secundario de contorno azul para Iniciar sesión. El primario compartido usa texto primaryText 18/24 Bold. Mantener las acciones en el flujo y toda la bienvenida en una pantalla: ilustración flexible sin altura mínima, marca y tipografía más compactas cuando el alto útil es menor a 700. Permitir scroll únicamente como alternativa con escalado de accesibilidad mayor a 1,3.

Inicio no muestra filtros de comunidad ni filtra sus recomendaciones de personas, eventos o desafíos por comunidad. La coincidencia de comunidad tampoco suma prioridad al ordenar personas sugeridas en Inicio; conservar los demás criterios de edad, proximidad y propósitos.

El título Configuracion se mantiene sin acento por pedido del usuario y en una sola línea con ajuste automático al ancho disponible, sin dejar la última letra en un segundo renglón.

Tus Vibes presenta un tablero compacto (total 38/46, ilustración de 64 y estadísticas de 20/26), seguido de Tu actividad. Seguí sumando se ubica al final, debajo del historial y de Ver más actividad, y abre AnimatedSheetModal con las reglas y los puntajes. El botón Registrar mi meditación y la opción de meditación +10 permanecen ocultos por el momento; conservar los registros históricos y las reglas del servidor. Esperar onClosed del sheet antes de abrir el registro. Omitir los bloques promocionales de cabecera y pie en la pantalla principal.

En Inicio, Nuevas conexiones queda cerca de la cabecera: margen inferior del saludo 8 y separación entre título y fotos 4 en ConnectionStrip compacto. Conservar el área táctil del título y el espacio del badge sobre las fotos.

La ilustración de bienvenida lleva tres esferas suaves con opacidad 0,24: mostaza de 42% del alto, coral y azul de 38%. No mostrar aro azul. Cada esfera elige destinos y escalas aleatorios independientes, con transiciones suaves de 3,2 a 5,8 segundos. Al terminar una transición elige otra, sin recorrido fijo ni ida y vuelta repetida. Limitar desplazamiento horizontal al 20% del ancho (máximo 90) y vertical entre -110 y 20. Esperar la carga de la ilustración; cancelar animaciones y temporizadores fuera de foco, en segundo plano o al desmontar. Con reducción de movimiento se muestran estáticas. La ilustración y los botones permanecen estables.

En la bienvenida, “Encontrá tu comunidad.” ocupa una sola línea con ajuste automático de fuente al ancho disponible, y “Conectá con tu bienestar.” ocupa otra línea debajo, también con ajuste automático.

La bienvenida alinea el contenido hacia arriba: sin padding superior extra, ilustración con proporción 1,5 y altura máxima 300 (sin crecer para rellenar la pantalla), margen superior 8 e inferior 4 antes del título. Mantener foto, mensaje y acciones próximos.

DiscoverPathCards usa chips compactos de comunidad: alto mínimo táctil 44, padding horizontal 10 y vertical 6, texto oscuro 13/18 SemiBold en una línea, sin iconos decorativos ni radios de selección vacíos. La selección muestra tilde y borde mostaza sobre fondo mostaza suave. El ancho acompaña el nombre completo y la fila permite desplazamiento horizontal.

Eventos no muestra la fila Todos/Frecuentes en pantalla. La opción Frecuencia (Todos/Frecuentes) se elige dentro de Más filtros, se confirma con Aplicar y se restablece con Limpiar. Mantener búsqueda, Fecha, Ubicación, Más filtros y comunidades.

En la bienvenida, Crear cuenta e Iniciar sesión se apoyan al pie del alto útil mediante marginTop auto, con separación mínima superior 16 y respetando el safe area inferior; la ilustración y el mensaje quedan arriba.

La bienvenida reparte el espacio libre entre logo e ilustración y entre mensaje y botones mediante márgenes automáticos; mantiene foto y título próximos y el logo con padding superior 8.

Inicio de sesión muestra Volver, símbolo centrado, ilustración de dos personas sobre círculo mostaza suave y el título Qué bueno verte de nuevo en 23/29 Bold, sin el subtítulo Volvé a conectar con tu comunidad. Google y Apple conservan sus componentes y comportamiento. Campos con labels Email/Contraseña en caja normal, bordes secundarios suaves, mostrar contraseña accesible, recuperación y crear cuenta en azul. Iniciar sesión usa botón oscuro primaryText con texto surface. Usar KeyboardViewport y scroll para teclado y pantallas pequeñas.

Login mide el alto visible y el formulario real para ajustar la ilustración entre 0 y 170 de alto: priorizar que campos y acciones entren completos, incluso con Apple o un error visible. Cabecera de 56 y logo de 54; conservar scroll como respaldo para teclado y accesibilidad cuando los controles superen el alto útil.

El contenedor de la ilustración de Login permite overflow visible para no cortar la esfera al acercarse al logo; la cabecera permanece por encima con zIndex 1. El círculo de Login comparte useWanderingSphere con la bienvenida: destinos y escalas aleatorios continuos, sin repetir un recorrido fijo, tras cargar la ilustración. Limitar el desplazamiento a 45 horizontal y 30% del alto de imagen (máximo 45) hacia arriba. Respetar reducción de movimiento, foco y segundo plano.

En Login, Iniciar sesión y ¿No tenés cuenta? Crear cuenta forman un pie independiente del formulario, alineado al fondo mediante marginTop auto, dentro del safe area. Medir también el alto del pie al calcular el tamaño de la ilustración.

En Welcome, Crear cuenta e Iniciar sesión tienen idéntico ancho, alto 58, radio pill y texto 18/24 Bold; solo difieren los colores de sus variantes.

Los botones mostaza siempre usan texto e iconos primaryText, también en diálogos, filtros, recuperación, fotos, reportes y confirmaciones. No usar texto surface/blanco sobre mostaza. Mantener texto surface únicamente sobre botones oscuros.

El feature flag Firebase vibes_points_enabled controla la visibilidad del puntaje en Inicio, el acceso Tus Vibes del perfil y la ruta de detalle. Valor local predeterminado false, con actualización en tiempo real igual que Clases. Ocultarlo no elimina el historial ni detiene los créditos del servidor.

Nuevas conexiones no muestra por ahora el botón ni el texto Ocultar. Conservar el resto de accesos y la fila de fotos.

En Chats, ConnectionStrip usa persistent: las nuevas conexiones no caducan por cantidad de sesiones ni por un ocultamiento local previo, y mostrarlas no aumenta el contador de Inicio. Conserva el criterio de conexiones nuevas (activas y cuyo chat aún no se abrió). Inicio mantiene su límite de dos sesiones.

Nuevas conexiones usa presentación comprimida: avatar exterior 54 (48 en Inicio compacto), imagen 48 (42 compacto), separación horizontal 8, nombre a 4 de la foto y margen inferior 12 (8 compacto). Mantener área táctil mínima 44 y no recortar el contador.

En Nuevas conexiones, el título conserva área táctil 44, sin margen inferior de fila y con compensación visual de -8 antes de las fotos. Mantener padding superior 4 para no cortar el badge.

En Inicio, las cabeceras Eventos para vos y Tus desafíos no agregan margen inferior antes de las tarjetas. Conservar el área táctil 44 y la separación entre tarjetas.

La comunidad Meditación reemplaza la denominación Meditación trascendental; normalizar los nombres anteriores y la variante trasendental para conservar las selecciones y asociaciones guardadas.

El botón Filtros de Descubrir comparte el diseño de Solicitudes y Comunidad: contorno secundario suave, superficie clara, radio 21, alto mínimo 48 y texto oscuro SemiBold con icono oscuro de 22. Mantener el contador de filtros activos.

El visor ampliado de fotos se inicializa por perfil y foto solicitada, evitando mostrar primero el índice de una apertura anterior. Desactivar fadeDuration de Android en la imagen ampliada y no remontarla solo por cambiar visible. Mantener AnimatedSheetModal y los gestos de zoom.

El visor de fotos mantiene una interfaz mínima: sin ayuda textual permanente, con cierre y contador discretos. Mostrar navegación inferior solo cuando hay más de una foto; conservar gestos y labels accesibles.

El visor ampliado usa AnimatedSheetModal inline y keepMounted dentro del modal del perfil, evitando apilar otro Modal nativo. Entrada y salida sin desplazamiento ni demora, con fundido corto de 120/100 ms, para evitar destellos y cambios de barras del sistema al abrir una foto.

Al abrir el perfil desde Descubrir, la foto entra a escala 1 sin zoom de 0,86 a 1. La medición inicial de altura se aplica directamente, sin animar el reajuste del viewport durante la entrada. Conservar la transición al desplegar detalles y los gestos del perfil.

En ProfileMediaImage, la miniatura y la imagen final comparten contentFit y esperan las dimensiones cuando hay fondo desenfocado. Evitar mostrar primero una miniatura recortada en cover y luego la foto en contain, que produce un salto breve.

Descubrir hidrata sus filtros guardados una sola vez por cuenta: los refetch posteriores al guardado no deben sobrescribir selecciones locales recientes. Abrir o cerrar Comunidad no borra la selección; únicamente cambiar una opción o Limpiar la modifica.

Los modales compartidos usan hardwareAccelerated en Android para componer fotos y capas animadas. UserProfileSheet mantiene photoHeight como Animated.Value estable por instancia, sin recrearlo cuando cambia la medición del viewport al abrir el modal.

Para fotos con bandas desenfocadas, ProfileMediaImage espera onDisplay del fondo antes de revelar la composición y notificar al perfil. Cargar ambas capas con la misma prioridad para evitar que el fondo llegue después de la foto horizontal. Si falla el fondo, permitir mostrar la foto sobre la superficie de respaldo.

Comunidad es el nuevo nombre de Camino: los datos del perfil siguen en spiritual_path y spiritual_path_details (y sus aliases camelCase), con prioridad sobre campos alternativos communities. Conservar rol, años y notas; no crear un perfil de comunidad separado ni perder selecciones anteriores.
