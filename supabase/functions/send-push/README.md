# send-push

Edge Function para enviar notificaciones push via Firebase Cloud Messaging cuando Supabase recibe webhooks de `messages`, `event_messages` y `matches`.

## Secrets requeridos

Opcion 1: un solo secret JSON.

- `FIREBASE_SERVICE_ACCOUNT_JSON`

Opcion 2: secrets separados.

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

Ademas, la function usa los secrets estandar de Supabase:

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
- Hoy solo despacha tokens con `provider = 'fcm'`.
- Los tokens invalidos que respondan `400` o `404` se desactivan.
- La navegacion cliente actual abre siempre `Messages` al tocar la notificacion.
