# Contenido de cada día de un desafío

## Acceso

El creador carga el contenido desde **Crear desafío**. Al crear se guarda primero el desafío para obtener su ID y la pantalla queda en modo edición con el bloque **Contenido del desafío**: elegir día y tocar **Personalizar día**. Al editar un desafío existente, el mismo bloque aparece debajo de los datos generales. Solo el creador da de alta o edita imágenes, audios y enlaces. Los participantes no editan ni ven ese bloque en el detalle; ven el contenido del día al deslizar para completar el check-in y confirman desde ese visor. No había versiones por participante en el proyecto y no se introdujo un diario personal.

El editor permite título, consigna, cámara, selección múltiple de fotos, audio grabado o archivos, enlaces, reordenamiento y eliminación. Las fotos se amplían, los audios tienen reproducción/pausa y saltos de 15 segundos, y los enlaces se abren desde una tarjeta. Cambiar de día, editar o salir de la pantalla desmonta los reproductores.

## Persistencia y recuperación

- `challenge_days` almacena título, descripción, adjuntos ordenados y revisión por desafío/día. Los desafíos anteriores siguen funcionando sin filas nuevas.
- El RPC `save_challenge_day` verifica al creador, límites y referencias reales de Storage; guarda todo atómicamente. El control de revisión impide sobrescrituras silenciosas.
- Supabase Storage conserva archivos inmutables en el bucket privado `challenge-day-media`. El creador puede ver sus subidas pendientes; los participantes solo los adjuntos publicados. Las URLs firmadas de reproducción duran una hora.
- El borrador se conserva por usuario/desafío/día en AsyncStorage. Los archivos se copian a documentos de la app en iOS/Android y a IndexedDB en web. Cerrar el editor conserva el borrador; “Descartar borrador” lo elimina.
- Una subida fallida no publica cambios parciales. Reintentar reutiliza las subidas confirmadas y comprueba rutas estables para recuperar respuestas perdidas. Se muestra el porcentaje por archivo y el error correspondiente.
- Al guardar o descartar se limpian los archivos locales y se intenta eliminar adjuntos remotos descartados. Si se desinstala la app, se borra su almacenamiento local o se interrumpe la limpieza, pueden quedar objetos remotos sin referencia. Una limpieza administrativa futura debe excluir tanto los adjuntos publicados como las subidas recientes; no borrar archivos únicamente por antigüedad.
- No se modifican check-ins, rachas, duración ni progreso.

## Límites y plataformas

20 adjuntos por día; título de 160 caracteres; consigna de 10.000 caracteres. Fotos de hasta 10 MB y audios de hasta 25 MB. Las fotos seleccionadas se convierten a JPEG antes de subirlas. Se aceptan MP3, M4A, AAC, WAV, OGG y WebM; los códecs admitidos para reproducir archivos importados dependen del sistema. Los fallos de decodificación muestran un mensaje y reintento. Las grabaciones nuevas son AAC/M4A en dispositivos y WAV mono en web para facilitar su reproducción en las otras plataformas, con límite de cinco minutos.

Los permisos de cámara y micrófono se solicitan exclusivamente al usar esas funciones. En web, grabación y cámara requieren un contexto seguro (HTTPS o localhost) y permisos del navegador.

## YouTube

Se reconocen enlaces watch, youtu.be, Shorts, embed y live de dominios de YouTube explícitamente permitidos. Se valida un ID de 11 caracteres antes de generar HTML. No se interpolan URLs ingresadas por el usuario en scripts. Se usa la [IFrame Player API oficial](https://developers.google.com/youtube/iframe_api_reference), sin autoplay, con error/timeout y “Abrir en YouTube”. Web usa iframe; iOS/Android usan react-native-webview. La identificación del cliente nativo usa `https://com.gurudevelopers.vibes` como base/origin según las [reglas de identidad del reproductor](https://developers.google.com/youtube/terms/required-minimum-functionality#embedded-player-api-client-identity). Si cambia el identificador de la aplicación, revisar esa constante. No se necesita una API key de YouTube.

## Configuración y despliegue

1. Aplicar `supabase/migrations/20260926120000_challenge_day_content.sql` al entorno correspondiente. Fue aplicada y registrada en el proyecto Mindora Vibes (`mhmpjezgdvnqyqsnabuq`) durante esta implementación.
2. Instalar dependencias: `expo-document-picker`, `expo-image-manipulator` y `react-native-webview`, en versiones compatibles con Expo SDK 54. Ambos lockfiles están actualizados.
3. Ejecutar `npx pod-install ios` y generar nuevos binarios nativos: estas dependencias no se pueden distribuir solamente mediante una actualización JavaScript a un binario anterior. El permiso de micrófono está declarado en app.json y en el Info.plist nativo.
4. Mantener las variables existentes `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`. No se agregaron secretos del servidor a la app.

## Verificación

- `node --test scripts/challenge-day-content.test.cjs scripts/challenge-edit.test.cjs`: URLs, validación, orden, persistencia de referencias y compatibilidad de edición.
- `scripts/challenge-day-permissions.test.sql`: permisos de creador/participante/ajeno, revisiones y límites. Crea fixtures dentro de una transacción y termina con rollback. Ejecutar en un entorno de prueba con permisos administrativos.
- `scripts/challenge-day-storage.test.cjs`: prueba opt-in de almacenamiento real. Requiere `VIBES_TEST_KEYS_FILE` apuntando a un archivo local protegido con la salida JSON de las API keys del proyecto y el `.env` del mismo proyecto. Crea cuentas/desafío/archivos propios temporales y los elimina al finalizar. Nunca usar claves administrativas en el cliente ni guardar ese archivo en Git.
- Verificados mediante la API real: subida de imagen y audio, guardado, lectura por participante, descarga firmada con los bytes correctos, aislamiento del borrador, rechazo de edición por participante, rechazo de revisión antigua, protección de archivos referenciados y eliminación de adjuntos retirados. Fixtures eliminados.
- En iOS se verificó visualmente el flujo de creador: borrador recuperado, imagen, audio grabado, link de YouTube, reordenamiento, guardado, visor publicado, reproducción de audio y foto ampliada. También se verificó que el fixture temporal quedara guardado en backend y luego se eliminara.
- Compilaciones nativas Android e iOS completadas e instaladas en Pixel 8 Pro API 36 e iPhone 17 Pro. Exportación web completada. Web arranca correctamente en localhost después del parche de compatibilidad de navegación. Paleta verificada.
- TypeScript global mantiene errores preexistentes en ilustraciones y otros archivos ajenos; no se detectaron errores en los archivos de esta funcionalidad.
- Queda pendiente una pasada visual final del flujo de participante en Android y web autenticada; la seguridad de permisos y lectura se verificó por pruebas SQL/API.
