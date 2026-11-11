# Recursos generales de un desafío

## Acceso

El creador carga los recursos desde **Crear / Editar desafío**, en el bloque **Recursos** que aparece debajo de la descripción. Hasta que el desafío no está guardado, el bloque solo indica que hay que guardarlo primero para adjuntar archivos. Después se reutiliza el mismo editor de adjuntos de los días (foto, audio y link, hasta 20), sin título ni consigna.

En el detalle, la sección **Recursos** se muestra debajo de la descripción y solo para el creador y quienes ya participan. No se muestra a quienes todavía no se unieron, aunque el desafío sea público o de amigos.

## Persistencia y copia

- La tabla `challenge_resources` guarda los adjuntos y una revisión por desafío. No se usó una columna en `challenges` para no exponer el contenido a lecturas de descubrimiento o invitaciones pendientes.
- El RPC `save_challenge_resources` verifica al creador, límites y referencias reales de Storage.
- Los archivos viven en el bucket privado `challenge-day-media`, con rutas `{challengeId}/resources/{userId}/{attachmentId}.{ext}`. El creador puede ver subidas pendientes; los participantes solo los adjuntos publicados.
- Al reiniciar o copiar un desafío (incluido Por Vibes), el SQL copia los links. Las fotos y los audios los copia después la app a rutas del nuevo desafío y los republica. Quien no participa del original no puede leer `challenge_resources`; usa el RPC `list_challenge_resource_media_for_copy` y una lectura de Storage limitada a los archivos ya publicados, solo si creó la copia y podría reiniciar el original.

## Configuración

Aplicar `supabase/migrations/20261110200000_challenge_resources.sql` al entorno correspondiente. No aplicar en producción sin confirmación explícita.
