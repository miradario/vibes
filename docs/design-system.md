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

Las tabs de Desafíos son Público, Privado y Por Vibes, con el mismo estilo pill. Por Vibes es un catálogo de desafíos curados: cada tarjeta usa `ChallengeFeedCard` con la acción Reiniciar, igual que los finalizados.

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

- `VibesActionButton.startText` usa actualmente 21 / 24 Regular y `surface` sobre mostaza. Contradice la norma de contraste; al intervenir ese botón, migrar a texto oscuro y al rol de primario de acento.
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

El padding inferior de la barra descuenta 12 del inset (mínimo 0), considerando el espacio interno bajo los labels. Esto baja toda la barra 12 en iPhone con indicador de inicio; usar `getTabBarBottomPadding` también en la geometría del contenido y FTUX.

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

La cabecera de Actividades usa título compacto 26/32 SemiBold, a pedido del usuario. En Desafíos el título usa 22/28 SemiBold y comparte una sola fila con los cuatro botones de 44, con separación 6. Permitir ajuste del título en ancho compacto sin partir la palabra. No mostrar el subtítulo “Pequeños pasos, en buena compañía”. Los labels de la barra inferior conservan una sola línea.

El detalle externo de clase usa layout compacto: padding 16, separación 10, foto de 168 de alto y título 22/28. Notas y fecha de consulta se despliegan con “Sobre esta clase”. El formulario de solicitud usa separación 10, resumen con padding 12 y fechas en grilla; mantiene controles de al menos 44–48 de alto y un único aviso breve sobre contacto y ausencia de cobros.

En el archivo de Desafíos, el control de la derecha pasa a “Volver a desafíos” (arrow-back) y regresa con goBack para conservar los filtros del listado. No duplicar una segunda acción Volver a la izquierda ni mostrar la casita en ese historial.

Las tarjetas compactas de clases mantienen título y horario en una línea y separación 3, para que el cuerpo no supere el alto de la imagen. Omitir el precio cuando no está publicado; no mostrar “Precio a consultar” en el listado. En las referencias externas la imagen acompaña el escalado de fuente.

“Tipo de evento” (categoría) se elige dentro de Más filtros, con opciones presentes en los eventos cargados. Se guarda al Aplicar y se restablece con Limpiar. No mostrar categorías en la barra horizontal; conservar allí Todos y Frecuentes.

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
