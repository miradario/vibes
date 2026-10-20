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
| Título de pantalla principal | **34 / 42** | `extraBold` / 800 | `primaryText` | Eventos, Desafíos, Descubrir; mismo estilo en las tres |
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

Alinear títulos a la izquierda salvo pasos de onboarding explícitamente centrados. Resolver falta de espacio redistribuyendo acciones o permitiendo líneas; no reducir arbitrariamente el tamaño de una pantalla hermana. Mantener el escalado de texto y comprobar títulos largos, castellano/inglés y ancho compacto. Limitar líneas únicamente cuando el contenido completo sea accesible en el detalle.

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
