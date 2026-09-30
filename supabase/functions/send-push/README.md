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
