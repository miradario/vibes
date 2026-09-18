# Onboarding — decisiones del 18/09/2026

Origen: https://trello.com/b/pDTKaro7/vibes-todo-board, lista Onboarding - Daro (16 tarjetas).

## Decisiones acordadas

- Tres pasos de preguntas opcionales, con Omitir por paso y Omitir todas para saltar el bloque conservando lo ya respondido.
- Género: Hombre, Mujer, Otro, selección única y opcional.
- Qué buscás: selección múltiple.
- Todos pueden completar y editar las respuestas desde Perfil; Home invita a quienes tienen respuestas pendientes.
- Respuestas visibles en perfil, salvo disponibilidad horaria y estado de ánimo, que son privados.
- Estado de ánimo: varias emociones, incluidas Triste, Ansioso, Cansado, Frustrado. Reinicia cuando se entra en un día local diferente; editable durante el día.
- Contraseña: mínimo ocho caracteres y una mayúscula; misma regla al restablecerla. Recuperación desde Login.
- Correo: pedido original de envío desde Supabase, verificación sin bloquear el acceso y estado/reenvío en Cuenta. Se mantiene el requisito original mediante Magic Link de Supabase y una función que registra propiedad real del correo.
- Video integrado al fondo de la app; una reproducción y último fotograma visible.
- Pantalla final: Comenzá el viaje por Vibes; sin subtítulo; botón Entrar a Vibes.
- Prácticas: tocar selecciona; Agregar detalles abre datos opcionales. Corregir traducción de nombres personalizados y modal/teclado.
- Quitar Edad confirmada, conservar fecha y validación de mayores de 18 años.
- Registro sin imagen; términos debajo de contraseña y encima de Crear cuenta; quitar Un espacio para volver a vos; centrar progreso.

## Datos y despliegue

La migración `20260918190000_onboarding_answers_and_private_state.sql` agrega `user_preferences.profile_answers` y `private_user_state`. La tabla privada tiene RLS de propietario para todas las operaciones; no se mezcla con las consultas públicas de candidatos. Aplicar la migración antes de distribuir esta versión.

No se ocultan errores de persistencia de las preguntas: si falta la migración, se muestra error y se conserva el formulario.

Acceso administrativo habilitado. Proyecto confirmado contra la configuración de la app: Mindora Vibes (`mhmpjezgdvnqyqsnabuq`). La tabla privada y `profile_answers` ya existían al conectar; se verificó su esquema y RLS. Se aplicó la migración de identidad pendiente (género, altura y qué buscás) y se restringieron los privilegios de la tabla privada a CRUD para authenticated, quitando TRUNCATE/REFERENCES/TRIGGER heredados por defecto.

## Verificación

- `node --test scripts/onboarding.test.cjs`: 12 pruebas aprobadas; contraseña, email, separación pública/privada, guardado, género, día local y validación de identidad/token en la función de correo.
- `npx expo export --platform android --output-dir /tmp/vibes-onboarding-export`: bundle Android generado.
- `npx tsc --noEmit`: persisten errores preexistentes; comparación contra HEAD sin nuevos diagnósticos de frontend. Las funciones Deno se excluyen del proyecto TypeScript de React Native y se verifican por separado.
- `npx deno check --no-config supabase/functions/verify-email-ownership/index.ts`: aprobado.

## Resultado de QA local

- Compilación nativa Android exitosa en Pixel_8_Pro_API_36; Samsung físico no conectado durante estas pruebas.
- Registro revisado sin imagen, con política de contraseña y términos en el orden acordado.
- Modal probado con teclado numérico completo: campo de años y botón Listo visibles por encima del teclado; contenido desplazable.
- Práctica personalizada Futbol revisada: se muestra el nombre, sin clave de traducción; Agregar detalles separado de seleccionar.
- Género: al tocar Hombre y después Mujer quedó únicamente Mujer seleccionada; Amistad y Citas permanecieron seleccionadas simultáneamente.
- Omitir todas llevó directamente a la pantalla final.
- Se retiró el enlace temporal de QA y se restauró el paso inicial del onboarding.
- TypeScript comparado contra HEAD en una copia temporal: cero diagnósticos nuevos de frontend.
- Videos derivados reproducibles con `bash scripts/prepare_onboarding_videos.sh`, fondo blanco igual al de esas pantallas y metadatos BT.709. No son videos con canal alfa; el fondo se integra por composición.
- Prueba remota `scripts/onboarding-rls.test.sql` aprobada: persistencia de perfil, rechazo de datos privados en respuestas públicas, CRUD del propietario, aislamiento entre usuarios, bloqueo anónimo y ausencia de TRUNCATE. Fixtures descartados con ROLLBACK.
- Función `verify-email-ownership` desplegada; rechaza cuerpo nulo, token malformado y token inválido con HTTP 400.
- Configurados redirect de verificación, plantilla Magic Link y longitud mínima 8. Las demás opciones de Auth se conservaron.
- Supabase aceptó el envío de verificación y recuperación al correo de prueba autorizado. Pendiente confirmar recepción y apertura en el dispositivo.

## Pendiente para cerrar las 16 tarjetas

1. Confirmar recepción real y apertura del enlace de verificación en la app; comprobar marca en Perfil → Cuenta.
2. Confirmar recuperación de contraseña y completar las pruebas de enlace utilizado/vencido y apertura en frío.

Backend y configuración desplegados. Las tarjetas de Trello no se movieron a Done porque falta esa validación de extremo a extremo en el dispositivo.
