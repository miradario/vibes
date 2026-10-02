# send-push

Edge Function para enviar notificaciones push cuando Supabase recibe webhooks de `messages`, `event_messages`, `matches` y `swipes`.

## Autenticación del webhook

La función se despliega con `--no-verify-jwt` porque utiliza una credencial dedicada, no un JWT de usuario. **Siempre** valida `Authorization: Bearer <PUSH_WEBHOOK_SECRET>` antes de procesar el payload. Una credencial ausente o incorrecta devuelve 401.

El mismo secreto aleatorio (mínimo 32 caracteres) debe existir en los secretos de Edge como `PUSH_WEBHOOK_SECRET` y en Vault como `push_webhook_secret`. `private.notify_send_push()` lo lee de Vault; nunca se guarda en el código ni en el cliente. Al rotarlo, actualizar ambas ubicaciones. La migración `authenticated_push_and_connection_requests` conecta los cuatro disparadores.

Para `swipes`, se envía “X quiere conectar con vos” al insertar un like o cambiar una decisión anterior a like. Repetir like no genera otra push. Se respetan bloqueos, perfiles activos y preferencias de notificaciones. El payload incluye `type: connection_request`; la app abre Descubrir → Recibidos. Las notificaciones de match siguen siendo un evento separado.

Pruebas: `node --test scripts/push-webhook.test.cjs`.

- Android: Firebase Cloud Messaging (`provider = 'fcm'`)
- iOS: Apple Push Notification service directo (`provider = 'apns'`)

## Secrets requeridos

### Firebase para Android

Opcion 1: un solo secret JSON.

- `FIREBASE_SERVICE_ACCOUNT_JSON`

Opcion 2: secrets separados.

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

### APNs para iOS

- `APNS_AUTH_KEY`
- `APNS_KEY_ID`
- `APNS_TEAM_ID`
- `APNS_BUNDLE_ID`
- `APNS_ENV`

Valores esperados:

- `APNS_ENV=production` para TestFlight/App Store
- `APNS_ENV=sandbox` para builds internas que registren tokens sandbox

`APNS_AUTH_KEY` debe contener el contenido completo del archivo `.p8`.

### Supabase

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Payload esperado

Pensado para Database Webhooks de Supabase con `INSERT`.

Ejemplo:

```json
{
  "type": "INSERT",
  "table": "messages",
  "schema": "public",
  "record": {
    "id": "message-id",
    "match_id": "match-id",
    "sender_id": "user-id",
    "text": "hola"
  }
}
```

Tambien acepta `new` en lugar de `record`.

## Tablas soportadas

- `messages`
- `event_messages`
- `matches`

## Notas

- Solo envia a tokens activos en `push_tokens`.
- El provider se decide por fila en `push_tokens`.
- Tokens FCM con respuesta `400` o `404` se desactivan.
- Tokens APNs con `BadDeviceToken`, `Unregistered` o `DeviceTokenNotForTopic` se desactivan.
- Al tocar una push de mensaje directo se abre el chat; una solicitud de conexión abre Descubrir → Recibidos.


## Preferencias y recordatorios

Configuración guarda cada interruptor inmediatamente en `user_preferences`. Las
seis columnas `notification_*` son independientes del interruptor general
`notifications_enabled`; desactivar el general conserva las categorías. El envío
filtra ambas preferencias antes de buscar tokens. Los tokens se conservan al
apagar las notificaciones: el servidor decide si enviar, evitando carreras entre
la desactivación de todos los dispositivos y el registro del dispositivo actual.

`event_reminder_timing` admite `24h`, `1h` o `both` (predeterminado). El cron
`vibes-notification-reminders` revisa cada minuto los eventos con participación
vigente y los desafíos pendientes. Cada usuario puede elegir la hora local de su
recordatorio diario de desafíos; la zona horaria se sincroniza desde el teléfono.
El aviso solo se genera durante los días activos del desafío y si todavía no hay
un check-in registrado para ese día local. Los desafíos usan el inicio ISO
guardado en `[[starts_at:…]]` y `duration_days`; fechas ausentes o inválidas no
generan avisos.

Los avisos tienen una ventana de 15 minutos, para no recuperar notificaciones
viejas después de una interrupción. No se avisa por un horario anterior a la
inscripción. Se vuelve a validar participación, preferencias, fecha, actividad
del perfil y progreso justo antes de enviar. Eliminar un evento lo excluye.

La cola es exclusiva del servidor y deduplica usuario/actividad/fecha/anticipación.
Registra los dispositivos entregados para omitirlos en reintentos parciales;
realiza hasta tres intentos separados por al menos dos minutos. Como cualquier
entrega externa sin idempotencia del proveedor, una interrupción entre el envío
y su registro podría producir un duplicado. Los registros caducados se limpian
luego de 30 días. No hay garantía de recepción por el sistema operativo.

### Orden de despliegue

1. Aplicar `notification_preferences_and_reminders` (deja el cron desactivado).
2. Desplegar `send-push` con `index.ts`, `webhook.ts`, `preferences.ts` y `deno.json`.
   Mantener `--no-verify-jwt`: el handler valida el secreto dedicado del webhook.
3. Aplicar `fix_notification_reminder_dispatch`, `activate_notification_reminders`
   y `daily_challenge_reminders`; verificar `cron.job_run_details`.
4. Distribuir la app actualizada.

Validación local: `node --test scripts/notification-settings.test.cjs scripts/push-webhook.test.cjs`.
Validación SQL: `scripts/notification-reminders.test.sql` usa fixtures dentro de
una transacción que se revierte; prueba también el despachador. `pg_net` solo
procesa solicitudes tras un commit, por lo que esta prueba no envía notificaciones.
