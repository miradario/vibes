# Verificación de email sin bloquear el acceso

El proyecto usa `mailer_autoconfirm: true` (consultado el 18/09/2026). Se mantiene esa configuración: la sesión por contraseña funciona antes de verificar el correo. **No usar `email_confirmed_at` como prueba de propiedad**, porque Supabase lo completa automáticamente.

## Flujo

1. Después de crear la cuenta, la app solicita `signInWithOtp` con `shouldCreateUser: false`. Supabase envía el correo sin invalidar la sesión actual. Si el envío falla, se puede reenviar en Perfil → Editar perfil → Email.
2. La plantilla **Magic Link** usa el enlace HTTPS `https://mhmpjezgdvnqyqsnabuq.supabase.co/functions/v1/open-email-verification?token_hash={{ .TokenHash }}`. El puente responde 302 hacia `com.gurudevelopers.vibes://verify-email` con el token hash y `type=email`; no consume el token. Esto evita usar un esquema de app directamente en el botón del cliente de correo.
3. La app entrega ese token a esta función. La función llama a `auth.verifyOtp` exclusivamente con `type: email`; no confía en email, user ID ni flags enviados por el cliente.
4. Solo después de validar el token de un solo uso, guarda `vibes_verified_email` y `vibes_email_verified_at` en `app_metadata` (solo modificable por backend administrativo).
5. La app conserva la sesión devuelta y consulta el usuario de nuevo. Si cambia su email, la marca antigua no valida la nueva dirección.

## Despliegue

Desplegado el 18/09/2026 en Mindora Vibes (`mhmpjezgdvnqyqsnabuq`). Redirect, plantilla Magic Link y longitud mínima 8 configurados. Se verificó la persistencia y el aislamiento RLS; pendiente recepción/apertura de correos en el dispositivo. Pasos reproducibles:

- Aplicar `supabase/migrations/20260918190000_onboarding_answers_and_private_state.sql` al proyecto correcto para preguntas y ánimo privado.
- Desplegar esta función:

```sh
npx supabase functions deploy verify-email-ownership --project-ref YOUR_PROJECT_REF --no-verify-jwt
npx supabase functions deploy open-email-verification --project-ref YOUR_PROJECT_REF --no-verify-jwt
```

`--no-verify-jwt` es intencional: el enlace puede abrirse sin sesión. La credencial es el token de email, que valida Supabase Auth. Las variables SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY están disponibles en las funciones alojadas; la clave de servicio nunca va al cliente.

- Agregar `com.gurudevelopers.vibes://verify-email` a Authentication → URL Configuration → Redirect URLs.
- Editar la plantilla **Magic Link** (no la de recuperación) para enviar:

```html
<h2>Verificá tu email en Vibes</h2>
<p>Podés seguir usando Vibes mientras verificás tu correo.</p>
<p><a href="https://mhmpjezgdvnqyqsnabuq.supabase.co/functions/v1/open-email-verification?token_hash={{ .TokenHash }}">Verificar mi email</a></p>
<p>Si no solicitaste este correo, podés ignorarlo.</p>
```

Este flujo usa el token hash directamente; no depende del PKCE verifier de un dispositivo, por lo que puede abrirse en otra instalación de la app. El dispositivo que abre el enlace inicia sesión como la cuenta verificada, igual que un Magic Link convencional.

- Mantener el envío configurado en Supabase y comprobar con una cuenta de prueba autorizada: envío inicial, reenvío, enlace vencido, enlace reutilizado, cambio de email, app cerrada y app abierta durante el onboarding.
- Mantener la plantilla y el redirect de recuperación existentes (`com.gurudevelopers.vibes://reset-password`) y comprobar su envío por separado.
- Configurar longitud mínima 8 en Supabase Auth; la app también exige al menos una mayúscula tanto al registrarse como al restablecer contraseña.

Se enviaron solicitudes de verificación y recuperación al correo autorizado; ambas fueron aceptadas por Supabase. La recepción real y la navegación desde los enlaces requieren la comprobación del usuario.

Referencias: https://supabase.com/docs/guides/auth/auth-email-passwordless y https://supabase.com/docs/guides/auth/general-configuration

## Corrección del botón del correo · 21/09/2026

Puente HTTPS desplegado y plantilla Magic Link actualizada con Management API (solo `mailer_templates_magic_link_content`). Comprobados GET/HEAD 302 con token ficticio, entrada inválida 400, destino fijo, conservación del token y ausencia de consumo por escáneres. Android resuelve la ruta a Vibes. Los correos anteriores conservan su URL anterior; reenviar para probar la plantilla nueva. Supabase aceptó un envío nuevo a la cuenta de prueba autorizada; pendiente confirmar el toque en el cliente de correo real. La app permite reintentar fallos de transporte y consultar de nuevo el estado en Editar perfil.
