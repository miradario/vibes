# Perfil y preferencias configuración — Daro

Implementación local de las 12 tarjetas de la lista de Vibes. No se modificó su estado en Trello; falta revisión visual en dispositivo por permisos de Computer Use.

| Tarjeta | Resultado |
| --- | --- |
| 274 | Quitado selector de idioma de la aplicación en Editar perfil. Los idiomas que habla la persona siguen siendo una respuesta del onboarding. |
| 275 | Perfil muestra el nombre completo guardado, sin abreviar el apellido. |
| 276 | Las prácticas muestran sus datos guardados (rol, años, notas) y una acción Editar. |
| 277 | Edición de perfil, preferencias y respuestas con KeyboardAvoidingView y desplazamiento con teclado. Prácticas conserva KeyboardSheetModal/AnimatedSheetModal. |
| 278 | “Me trae a Vibes” tiene sección propia y usa open_to, como el onboarding. |
| 279 | Sección “Qué busco en Vibes”, independiente de motivaciones; “Otros” deja de ser título genérico y los tags existentes se conservan en “Intereses adicionales”. Edad no aparece en estos editores; no se alteró la validación de mayoría de edad del onboarding. |
| 280 | Identidad usa Hombre, Mujer, Otro, selección única opcional, compartiendo opciones del onboarding. |
| 281 | Ubicación se edita únicamente en Editar perfil. Se eliminó el formulario duplicado de Preferencias y la segunda presentación del valor GPS. |
| 283 | Encabezado Configuración permite dos líneas y usa tamaño/interlineado más apropiados para Android. |
| 284 | Acción existente de eliminar cuenta trasladada a Configuración, con confirmación y enlace al flujo de solicitud existente. |
| 290 | Porcentaje de 18 campos públicos opcionales: nombre, una foto, ubicación, presentación, motivaciones, prácticas y 12 respuestas públicas del onboarding. Disponibilidad privada y ánimo no cuentan. Acceso al siguiente dato faltante. |
| 291 | Todas las respuestas del onboarding se organizan en solapas Identidad, Intereses y Planes. Preferencias ofrece acceso que guarda primero sus cambios. |

## Persistencia

- `looking_for` guarda qué busca la persona; `open_to` conserva motivaciones. Antes Preferencias sobrescribía ambas con el mismo dato.
- Las columnas canónicas de género, idiomas, personalidad y búsqueda prevalecen sobre copias antiguas en `profile_answers`, incluso al borrar una respuesta.
- Se conservan disponibilidad privada, fotos y datos adicionales existentes.
- Sin migraciones ni cambios de esquema.

## Validación

- 19 pruebas Node aprobadas (perfil/preferencias, onboarding y comunidad).
- Exportación Expo Android e iOS aprobada.
- TypeScript mantiene los 14 errores preexistentes; sin diagnósticos nuevos en los archivos modificados.
- Pendiente prueba visual: teclado abierto, encabezado Android con fuentes ampliadas, navegación de solapas y guardado en dispositivo.
