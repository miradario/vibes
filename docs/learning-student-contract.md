# Alumno móvil y contrato de vibes-web

Fuente: `vibes-web`, commit `7ad7f8c`, `lib/portal/studio.ts` y `supabase/migrations/20261103180442_studio_management.sql`. La documentación de referencia está en `vibes-web/docs/portal-studio.md`.

## Activación

La agenda del portal (`portal_student`) se activa con el flag remoto `clases` (Remote Config, `false` por defecto); ya no existe `EXPO_PUBLIC_PORTAL_STUDIO_ENABLED`. En desarrollo, `EXPO_PUBLIC_FORCE_CLASES=true` lo fuerza (solo `__DEV__`). El kill switch del servidor (`private.learning_settings.enabled`) sigue mandando: si está apagado, el RPC devuelve `LEARNING_DISABLED` y la app muestra un aviso. Las inscripciones viejas (`learning_enrollments`) quedan solo como historial.

La clave pública de Supabase y la sesión actual se usan igual que en el resto de la app; no se incorporan secretos del portal.

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

## Sesiones (turnos con profesionales)

Flag remoto `sesiones` (`false` por defecto; `EXPO_PUBLIC_FORCE_SESIONES=true` solo en `__DEV__`). La pestaña se llama "Clases", "Sesiones" o "Actividades" según los flags y tiene Explorar y Mis reservas.

- Profesionales: `learning_profiles` publicados y aprobados (aunque no tengan disponibilidad), con filtro por especialidad.
- Reserva: `portal_scheduler('get' | 'reserve' | 'cancel')`. Dentro de la disponibilidad queda confirmada; fuera ("Consultar por horarios fuera de turno") queda pendiente del facilitador y el pago se coordina con él.
- Precio y forma de pago (decisión del 17/11/2026): el facilitador fija en el portal un precio y una o varias formas de pago por servicio (`mercadopago`, `cash`, `transfer`). La app los lee con `portal_student_sessions('pricing', organizer)` y el alumno elige al reservar con `portal_student_sessions('book', availability, {starts_at, duration, payment_method})`. Mercado Pago solo aparece si el facilitador tiene la cuenta conectada.
  - Mercado Pago: la reserva queda `pending` y el horario se guarda 15 minutos (`hold_expires_at`). La app abre el checkout enseguida (`openAuthSessionAsync`; el portal vuelve a `com.gurudevelopers.vibes://session/<id>` con `return_to: "app"`), muestra la cuenta regresiva y consulta cada 5 s. Cuando el webhook acredita el pago, la sesión se confirma sola. Si no se acredita a tiempo, el horario se libera exactamente en `hold_expires_at` y llega la push `appointment_released` ("Se liberó el horario", preferencia de sesiones). Sin gracia: un pago acreditado después no recupera la reserva. La plata va a la cuenta de Mercado Pago del facilitador (OAuth del portal).
  - Solicitudes fuera de turno de un servicio con precio: el alumno puede elegir la forma de pago con la solicitud. Al aprobarla el facilitador, se crea el pedido con el precio del servicio y se paga como siempre (Mercado Pago desde la sesión, o efectivo o transferencia al facilitador). Mientras no pagó puede cambiar la forma de pago (`set_payment_method`).
  - Efectivo o transferencia: queda confirmada al reservar; en la app no se cobra. Se muestran las indicaciones del facilitador (alias, CBU).
  - Sin precio cargado o sin el backend nuevo: igual que antes, "A coordinar con el facilitador".
  - Cancelar después de pagar: no hay reintegro automático; se arregla con el facilitador (la app lo avisa). Un pago acreditado después de liberar el horario se muestra como "Cancelada · pago a resolver". Una retención liberada sin pago se muestra como "Liberada · sin pago", con "Reservar de nuevo".
- Confirmación: `pending` espera a quien no creó la sesión. No vence. El alumno puede cancelar hasta que empieza.
- Pago de sesiones agendadas por el facilitador: si cargó monto (`appointment_orders`), una vez confirmada se muestra el total y "Pagar" abre `/api/portal/appointment-checkout` (Bearer de Supabase) con expo-web-browser. El portal crea la preferencia con la cuenta conectada del facilitador.
- Pendiente de backend (borradores en `turnos-analysis/proposed-migrations/`, no aplicados): `portal_student_sessions` (list / accept / decline / contact / pricing / book), trigger de pendiente para alumnos con cuenta, trigger de push, `user_preferences.notification_sessions`, precios por servicio (`private.appointment_service_pricing`), retención de 15 minutos y confirmación por pago, y `portal_session_payments` para el portal. Mientras no existan, la app lista desde `portal_scheduler`, deshabilita "Confirmar" y "Rechazar" equivale a cancelar.
- Push: tipos `appointment_invited | appointment_confirmed | appointment_updated | appointment_cancelled` con `sessionId`; abren `SessionDetail` (`session/:id`).
