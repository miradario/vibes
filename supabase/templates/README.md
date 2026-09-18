# Correos de Vibes

Plantillas activas en Mindora Vibes (`mhmpjezgdvnqyqsnabuq`):

- `magic_link.html`: verificación no bloqueante. Conserva `RedirectTo` y `TokenHash` para `verify-email-ownership`.
- `recovery.html`: recuperación. Conserva `ConfirmationURL` para el flujo de Supabase Auth.

Logo existente de la bienvenida: `assets/images/challenges/vibesLogo.png`, publicado en el bucket público `event-assets`, ruta `branding/vibes-email-logo-v1.png`. No borrar ese objeto mientras las plantillas lo utilicen. El texto Vibes permanece visible aunque el cliente de correo bloquee imágenes.

Diseño con tablas, estilos inline, fuentes del sistema, botones dorados y adaptación a pantallas pequeñas. Revisado en Chromium a 390 px y escritorio; el aspecto puede variar entre clientes de correo.

Para actualizar, usar estas secciones en una configuración de despliegue y revisar `supabase config diff` antes de `config push`:

```toml
[auth.email.template.magic_link]
subject = "Verificá tu email en Vibes"
content_path = "./supabase/templates/magic_link.html"

[auth.email.template.recovery]
subject = "Restablecé tu contraseña de Vibes"
content_path = "./supabase/templates/recovery.html"
```

Este cambio personaliza asunto y contenido. No cambia la dirección de envío ni configura un dominio/SMTP propio.
