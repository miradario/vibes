# Sesión Trello — 6 de octubre de 2026

Alcance confirmado por el usuario después de entrevista de a una pregunta.

- Card 01: recordatorio de desafío abre su detalle; mensajes de chat conservan su destino.
- Card 02: acceso sin sesión descartado; ya estaba implementado.
- Card 03: nacionalidad opcional en Editar perfil, debajo de Ubicación; un país mediante selector con búsqueda. Etiqueta propia pública. Filtro de personas por varios países (OR), combinado con los demás filtros (AND).
- Card 04: compartir descartado; ya estaba implementado.
- Card 05: retirar sección inferior de Eventos pasados; conservar acceso de archivo del encabezado.
- Card 06: racha por días consecutivos del desafío, corte a medianoche local, hoy pendiente no interrumpe la racha. Conservar resultado al cierre y mejor secuencia histórica. Fechas antiguas UTC conservadas; nuevos check-ins locales.
- Card 07: Configuración y Editar perfil usan familia del título de Eventos/Desafíos. Notificaciones más grueso y oscuro, con jerarquía secundaria.

## Verificación

- 43 pruebas pasan con `node --test scripts/trello-streak.test.cjs scripts/reminder-navigation.test.cjs scripts/nationality.test.cjs scripts/discover-answer-filters.test.cjs scripts/profile-location.test.cjs scripts/profile-age-visibility.test.cjs scripts/challenge-edit.test.cjs scripts/event-classification.test.cjs scripts/notification-settings.test.cjs`.
- Regresiones reproducidas antes del fix: racha retenía 7 tras un día omitido; recordatorio caía a Tab si no resolvía el feed; navegación no esperaba Startup.
- `npm run colors:check`: pasa.
- `npx tsc --noEmit`: 13 errores ya presentes en HEAD; comparación con copia aislada del código previo, sin errores nuevos. Afectan tipos de Reanimated, navegación e ilustraciones.
- `npx expo export --platform android --output-dir /tmp/vibes-trello-android-export --max-workers 2`: bundle Hermes exportado.
- Migración `20261006181241_profile_nationality.sql` aplicada al proyecto configurado Mindora Vibes. Columna nullable con catálogo ISO; políticas existentes conservadas. Restricción real probada en tabla temporal dentro de transacción revertida: AR, UY y null aceptados, ZZ rechazado. Sin cambios en perfiles reales durante la prueba.
- Advisors de Supabase: mismos avisos antes/después de la migración; no se alteraron funciones ni políticas ajenas al alcance.
- Browser integrado: página carga; marcar una casilla cambia 0/20 a 1/20 y persiste al recargar; filtro Chequeados funciona. Se restauraron las casillas a desmarcadas.

## Revisión manual

Abrir `dist/index.html` a través del servidor local: http://127.0.0.1:8765/.

Para volver a iniciarlo desde el repositorio:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory artifacts/trello-2026-10-06/dist
```

La página incluye 20 criterios, notas por card y persistencia local por sesión. Las casillas son aceptación del usuario, no resultados automáticos.

Pendiente en dispositivo: push real, navegación al tocarlo, interacción y presentación nativa. No se generó ni instaló un APK/IPA; la exportación valida el bundle JavaScript/Hermes.

El cambio preexistente en `ios/Podfile.lock` se preservó.

## Ajuste posterior — selector de nacionalidad

Se retiró el texto aclaratorio del campo. La lista con búsqueda ahora abre un modal centrado con `AnimatedSheetModal`, cierre por X/fondo y adaptación al teclado. En selección múltiple incluye Listo. Se conserva el comportamiento inferior predeterminado de los demás modales. Pruebas de nacionalidad y paleta pasan; sin nuevos errores TypeScript. Se reinició únicamente el criterio visual afectado del checklist mediante una nueva clave.

## Ajuste posterior — visibilidad de nacionalidad

A pedido del usuario, se retiró la etiqueta de nacionalidad del perfil propio y del visor público. Se conservan el campo editable, su valor guardado y el filtro. Esta decisión reemplaza la visibilidad pública acordada inicialmente. Se actualizó el criterio correspondiente del checklist.
