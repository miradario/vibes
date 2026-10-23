# Daro — creación, edición y chat

Rama: `fix/daro-create-edit-chat-2026-10-20`.

- [Creación de eventos](https://trello.com/c/5Akf3sek): formulario sin tarjeta elevada, campos y tipografía del sistema, cabecera fija, botón oscuro y pie en el layout que no se superpone al formulario.
- [Creación de desafíos](https://trello.com/c/aS6gU9x7): mismo diseño compartido, ScreenContainer, pie visible y espaciado adaptado al teclado.
- [Edición de eventos](https://trello.com/c/MspXuX7H): reconoce portadas predefinidas, no borra ni vuelve a subir una portada sin reemplazo, admite categorías vacías en eventos antiguos, limita la actualización al creador y al tipo evento, abre un formulario nuevo por edición y vuelve al detalle al guardar. La caché del detalle se actualiza con la respuesta.
- [Edición de desafíos](https://trello.com/c/41lmsmUN): separa portada actual de foto nueva, muestra imageUrl cuando no hay image, usa la descripción corta cuando la larga está vacía y abre un formulario nuevo por edición. Se conservan fecha, duración y progreso de los participantes.
- [Espacio inferior del chat](https://trello.com/c/tdD7Eo9k): helper compartido para directos, eventos y grupos; safe area una sola vez, sin padding adicional debajo y sin KeyboardAvoidingView de altura sobre adjustResize en Android.

## Verificación

16 pruebas de edición, clasificación, layout de composer y teclado aprobadas. Control de colores aprobado. TypeScript conserva los 5 errores conocidos en ChallengeTreeProgress, DiscoverCirclesOverlay y OnboardingProgressBar; no agrega errores en los archivos modificados.

La herramienta de UI no encontró la ventana del Simulator (`cgWindowNotFound`), aunque el iPhone figura iniciado. La validación visual y el recorrido completo de crear/guardar en dispositivo quedan pendientes. No se crearon ni modificaron eventos o desafíos reales para probar.

La interpretación de “carga vieja” es el formulario de creación, según el contexto. Las tarjetas de edición no tenían descripción, comentarios ni adjuntos; se solicitó el comportamiento observado y se corrigieron los defectos concretos encontrados en el código.

## Recorrido de revisión

1. Crear evento y desafío: abrir teclado en título y descripción; comprobar que campos y acción principal sean accesibles, también en Android.
2. Editar un evento con portada predefinida o remota y sin categoría: guardar solo un cambio de texto; comprobar que conserva portada, horario y cupos. Repetir con una nueva portada.
3. Editar un desafío existente: comprobar descripción corta/larga, portada y privacidad. Verificar que fecha, duración y progreso no cambian.
4. Abrir el editor de otro contenido: verificar que carga su propio borrador, sin valores del contenido anterior.
5. Chat directo, de evento y de grupo: abrir/cerrar teclado y volver desde segundo plano; el composer debe quedar sobre el teclado o el área segura sin una franja extra.
