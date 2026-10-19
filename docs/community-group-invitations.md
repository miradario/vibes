# Invitaciones a grupos

Las nuevas incorporaciones requieren que el destinatario acepte. Las membresías
anteriores se conservan. La migración también protege a los clientes anteriores:
`create_community_group` conserva su firma, pero crea invitaciones en vez de agregar
miembros automáticamente. Esos clientes necesitan actualizarse para responder.

Migración: `supabase/migrations/20261012212622_community_group_invitations.sql`.
Aplicada en el entorno de Vibes el 12 de octubre de 2026.

## Probar

1. Con dos cuentas conectadas, crear un grupo desde Chats y elegir la otra cuenta.
2. El creador puede abrir su grupo; la otra cuenta ve una invitación en Chats →
   Grupos. El contador de esa pestaña incluye las invitaciones pendientes.
3. Antes de aceptar, el destinatario no puede leer miembros, mensajes ni fotos
   privadas del grupo, ni enviar mensajes.
4. Aceptar abre el chat. Rechazar quita la invitación sin agregar a la persona.
5. Repetir con otra invitación para probar ambas decisiones.

Las invitaciones se actualizan por Realtime y consulta periódica. No se agregaron
notificaciones push. Solo se invita a conexiones activas al crear el grupo; no se
agregó una nueva acción para invitar a grupos existentes.

## Permisos y validación

La tabla de invitaciones permite consultar únicamente las propias. Sin escrituras
directas del cliente: las funciones privadas validan el usuario de la sesión y
bloquean el grupo y la invitación antes de resolver. Las funciones públicas son
`SECURITY INVOKER`; las privadas elevan permisos únicamente para esas operaciones,
con `search_path` vacío y sin ejecución anónima. Las respuestas repetidas son
idempotentes; una decisión contraria a la ya tomada se rechaza. Repetir una
aceptación después de salir no vuelve a agregar al usuario.

Prueba aislada (PostgreSQL temporal, sin datos ni conexión de producción):

```sh
NODE_PATH=/tmp/vibes-learning-tests/node_modules node scripts/community-invitations-db.test.cjs
```

El directorio indicado debe contener `pg@8.16.3` y
`embedded-postgres@18.4.0-beta.17`. Son herramientas de prueba externas; no se
agregaron dependencias a la app.

Diez escenarios verificados: preservación de grupos existentes, creación con
invitaciones deduplicadas, aislamiento antes de aceptar, autorización del
destinatario, bloqueo de escrituras y llamadas anónimas, aceptación concurrente,
rechazo idempotente, carrera aceptar/rechazar, conexiones inválidas e invitación
ya aceptada tras abandonar el grupo. La paleta pasa la validación.
La comprobación global de TypeScript conserva errores previos ajenos a estos
archivos. Pendiente probar la interfaz con dos cuentas en dispositivos reales y
distribuir un nuevo build que incluya estas pantallas.
