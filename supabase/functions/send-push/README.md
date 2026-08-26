# send-push

Edge Function para enviar notificaciones push cuando Supabase recibe webhooks de `messages`, `event_messages` y `matches`.

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
- La navegacion cliente actual abre siempre `Messages` al tocar la notificacion.
