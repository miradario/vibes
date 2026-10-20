# Vibes — estándares de seguridad infantil

Revisión: 20 de octubre de 2026. Responsable confirmado por Darío: **Darío Mira**, **soporte@gurudevelopers.dev**.

## Diagnóstico

El Contacto anterior abría `mailto:` o Instagram; no ofrecía un formulario de envío dentro de Vibes. Se agregó un acceso visible desde **Perfil → Ayuda y seguridad infantil**. Permite reportar seguridad infantil, abuso, problemas de soporte y comentarios, sin salir de la app. El formulario muestra la prohibición expresa de EASI y no admite archivos adjuntos. La confirmación se muestra después de que Supabase acepte el reporte; ante un error se conserva el texto. El enlace de política es complementario, no reemplaza el formulario.

URL pública comprobada con HTTP 200 y contenido de Vibes el 20/10/2026:

https://vibes.gurudevelopers.dev/seguridad-infantil

`esvibes.com` no resolvió por DNS durante la comprobación; no usar esa URL en la declaración hasta verificar su funcionamiento.

## Campos para Play Console

- Aplicación: **Vibes**.
- Estándares publicados: **https://vibes.gurudevelopers.dev/seguridad-infantil**.
- Contacto de seguridad infantil: **Darío Mira**.
- Correo: **soporte@gurudevelopers.dev**.
- Mecanismo interno: **Perfil → Ayuda y seguridad infantil → Seguridad infantil → completar el detalle → Enviar reporte**.
- El responsable debe confirmar en Play Console la existencia del mecanismo y las declaraciones sobre respuesta a material de abuso sexual infantil y cumplimiento legal. Verificar primero que el build enviado a revisión incluya este formulario. No declarar que el build 55 ya lo incluye.

Texto descriptivo para revisión (usar cuando el nuevo build esté disponible):

> Vibes permite enviar reportes sin salir de la aplicación desde Perfil → Ayuda y seguridad infantil. La categoría Seguridad infantil permite comunicar preocupaciones relacionadas con explotación y abuso sexual infantil, grooming y material de abuso sexual infantil. El reporte se recibe de forma privada en nuestro sistema de soporte. Nuestros estándares publicados están disponibles en https://vibes.gurudevelopers.dev/seguridad-infantil. El responsable designado es Darío Mira, soporte@gurudevelopers.dev.

## Recepción y revisión

Migración aplicada al proyecto `mhmpjezgdvnqyqsnabuq`: `in_app_safety_feedback`. Los reportes llegan a **public.safety_feedback**, no al correo automáticamente. Únicamente el equipo autorizado con acceso administrativo/servidor puede leerlos o actualizar su estado. No otorgar lectura a usuarios de la app ni publicar credenciales de servicio.

El responsable debe revisar la cola, priorizar seguridad infantil, actuar conforme a los estándares publicados y las leyes aplicables, retirar contenido cuando corresponda y escalar a las autoridades competentes. No dar por resuelta una denuncia por el simple hecho de recibirla.

Consulta de revisión desde SQL Editor con acceso administrativo:

```sql
select id, reporter_id, category, details, context, created_at, status
from public.safety_feedback
where status in ('new', 'reviewing')
order by (category = 'child_safety') desc, created_at asc
limit 100;
```

Actualizar `status` a `reviewing` al tomar un caso y a `resolved` con `reviewed_at = now()` solo cuando se hayan realizado las acciones correspondientes. El estado no es editable desde la app.

## Verificación realizada

- UI abierta en el simulador desde Perfil, sin abrir correo ni navegador para reportar.
- Pruebas de validación y límites de texto.
- Prueba de base de datos en transacción revertida: inserción propia permitida; suplantación, lectura, actualización y borrado desde clientes bloqueados; categoría inválida y texto vacío rechazados; inserción anónima rechazada.
- No se dejó un reporte ficticio en la cola.
- Revisión de advisors: sin hallazgos para la nueva tabla.
- Queda publicar un build con el cambio y presentar la declaración en Play Console. Ninguna declaración fue enviada automáticamente.

Fuentes: [Preguntas frecuentes de Google Play](https://support.google.com/googleplay/android-developer/answer/14747720?hl=es), [Protección infantil](https://support.google.com/googleplay/android-developer/answer/9878809?hl=es).
