# Alumno móvil y contrato de vibes-web

Fuente: `vibes-web`, commit `7ad7f8c`, `lib/portal/studio.ts` y `supabase/migrations/20261103180442_studio_management.sql`. La documentación de referencia está en `vibes-web/docs/portal-studio.md`.

## Activación

`EXPO_PUBLIC_PORTAL_STUDIO_ENABLED=false` por defecto. El flujo anterior sigue disponible. Activar únicamente después de desplegar y verificar la migración del portal en un entorno autorizado; esta entrega móvil no ejecuta migraciones remotas. El 3/11 se verificó mediante metadata que `public.portal_student(text,uuid,jsonb)` todavía no estaba desplegada.

El flag Clases sigue siendo necesario. La clave pública de Supabase y la sesión actual se usan igual que en el resto de la app; no se incorporan secretos del portal.

## Contrato utilizado

`portal_student({p_action,p_id,p_data})`:

- `get`: `p_id:null`, `p_data:{}`. Lee activities, sessions, packs, orders, bookings, contacts, routines y legacy_enrollments.
- `book`: `p_id` es el ID del **encuentro**, `p_data:{waitlist:boolean}`. La espera requiere selección explícita. La app vuelve a leer el estado; nunca confirma una reserva de forma optimista.
- `cancel`: `p_id` es el ID de la **reserva**. El servidor decide devolución y promoción de la espera. La UI respeta cancellation_hours; el servidor mantiene la autoridad.
- `contact`: `p_id` es el ID del **organizador**; teléfono y consentimiento independiente por estudio.

Los tipos y el adaptador están en `src/learning/studioStudent.ts`; queries por cuenta e invalidaciones en `studioStudentQueries.ts`. No se accede directamente a tablas privadas. Las mutaciones no se reintentan automáticamente. No se convierte ninguna inscripción previa en reserva por encuentro ni se descuentan créditos por esa conversión.

## Alumno

Reservar por día/estudio, reservas y espera, historial/asistencia, saldo y packs acreditados con vencimiento, rutinas y consentimiento de WhatsApp. Reservar respeta la selección vigente de profesores del catálogo móvil. Las reservas previas se conservan, aunque su profesor no esté en esa selección. Las inscripciones y solicitudes anteriores tienen un acceso separado.

Compras y cobros móviles siguen apagados por decisión del usuario: no se invoca `order`, checkout ni proveedores de pago. Se muestran créditos ya acreditados por el estudio. Los packs vencidos, pendientes o reintegrados no suman al saldo disponible.

## Verificación

`node --test scripts/studio-student.test.cjs scripts/learning-student-agenda.test.cjs` valida parámetros RPC, estados, saldo, plazos y compatibilidad. La prueba integral contra el backend nuevo depende de su despliegue; no se simulan créditos ni reservas dentro de la app.
