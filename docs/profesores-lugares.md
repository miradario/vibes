# Profesores, lugares, clases y cursos

Branch: `feat/profesores-lugares`.

La app reutiliza Supabase Auth, el cliente Supabase existente, React Query, el stack de navegación, `ScreenContainer`, `AnimatedSheetModal`, `VibesActionButton`, Typography y los tokens de Vibes. La entrada **Clases y espacios** está en Descubrir; desde allí se accede a **Mis clases y cursos** y **Mi espacio**. No se agrega una pestaña principal ni otro sistema de autenticación.

## Probar ahora con datos ficticios

Desde la raíz del proyecto:

```sh
npm install --prefix /tmp/vibes-learning-tests --save-exact embedded-postgres@18.4.0-beta.17 pg@8.16.3 esbuild@0.25.12
node scripts/learning-preview.mjs
```

Abrir <http://127.0.0.1:8775>. La vista usa **las pantallas reales** de la sección, la migración y las funciones SQL reales en un PostgreSQL temporal. Todo está rotulado **FICTICIO**, el servidor escucha únicamente en loopback y no se conecta a producción. Los botones de identidad son adaptadores exclusivos del entorno de prueba; no existen en la app. Fotos de ejemplo públicas, no perfiles reales. Al detener el script se elimina únicamente su base temporal.

1. Elegir **Responsable**, entrar en **Mi espacio** y **Crear clase o curso**.
2. Elegir el perfil responsable y al menos un profesor. Completar título, descripción, cupos, modalidad, ubicación si corresponde y precio `0`.
3. Completar el encuentro: título, fecha futura `AAAA-MM-DD HH:mm` y duración en minutos. La hora se interpreta en la zona IANA elegida, independientemente de la zona del teléfono.
4. Guardar el borrador. Desde **Mi espacio**, tocar **Publicar** y confirmar.
5. Cambiar a **Alumno**, entrar en **Actividades**, abrir la clase y confirmar **Inscribirme gratis**. Comprobar la inscripción en **Mis clases y cursos → Próximas**.
6. Cambiar a **Responsable**. El botón de desarrollo **Comenzar encuentro (prueba)** adelanta solamente los primeros encuentros con alumnos de esta base ficticia. Permite probar asistencia sin esperar al día siguiente.
7. **Mi espacio → Alumnos y asistencia**: elegir el encuentro y marcar presente/ausente. La confirmación aparece después de guardar en la base.

También se pueden crear/editar perfiles y vincular profesores con lugares administrados por la misma cuenta. Para un curso, elegir **Curso**, completar al menos dos encuentros y usar **Agregar encuentro**. La inscripción comprende el curso entero.

## Configurar la app real en un entorno de desarrollo

Migración: `supabase/migrations/20261011162146_profesores_lugares.sql`. Es aditiva y fue ejecutada en PostgreSQL aislado. **Aplicada al proyecto remoto Mindora Vibes (`mhmpjezgdvnqyqsnabuq`) el 12/10/2026 con autorización explícita. El interruptor del servidor está habilitado; el cliente sigue limitado a desarrollo.** No modifica `events`, `event_participants`, `profiles` ni los flujos actuales de autenticación.

Aplicar el archivo completo en un Supabase de desarrollo/staging con las tablas actuales de Vibes. La CLI creó el archivo mediante `supabase migration new profesores_lugares`. Verificar el historial del entorno antes de usar `db push`: no enviar indiscriminadamente las otras migraciones locales pendientes a producción.

Luego, desde SQL Editor como administrador de ese entorno:

```sql
-- UUID de una cuenta existente y activa de Supabase Auth/Vibes.
insert into private.learning_operators(user_id)
values ('<UUID_DEL_RESPONSABLE>'::uuid)
on conflict do nothing;

-- La migración mantiene este interruptor apagado por defecto.
update private.learning_settings set enabled = true where id;
```

Usar en el cliente la URL y clave pública del entorno de staging, con las mismas variables existentes `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Nunca usar una clave `service_role`, clave de Mercado Pago ni contraseña de la base en la app.

Arrancar Metro con:

```sh
EXPO_PUBLIC_LEARNING_ENABLED=true npx expo start --clear
```

En desarrollo, el catálogo incluye dos profesores de solo lectura rotulados **EJEMPLO**: Lucía Fernández y Tomás Ruiz. Se agregan únicamente en el cliente con `__DEV__`, no se guardan en Supabase ni permiten inscripciones reales. El preview aislado también incluye dos profesores ficticios.

Se requieren **ambas** condiciones: flag local y flag del servidor. El flag local está limitado a `__DEV__`; los builds de release permanecen deshabilitados aunque la variable se configure en `true`. Con el flag apagado no se realizan consultas de esta sección y no aparece su entrada en Descubrir.

**Responsable real:** iniciar sesión con la cuenta autorizada, crear/publicar un perfil, crear una clase gratuita y publicarla. **Alumno real:** usar otra cuenta existente, explorar e inscribirse. La asistencia se habilita al comenzar el encuentro; el control de reloj ficticio solo existe en el preview local.

Para que otro responsable gestione un perfil existente, un administrador confiable puede otorgar la relación explícita:

```sql
insert into private.learning_managers(profile_id,user_id)
values ('<UUID_DEL_PERFIL>'::uuid,'<UUID_DE_LA_CUENTA>'::uuid)
on conflict do nothing;
```

La app no puede insertar/editar operadores ni responsables. `profiles.is_teacher`, `user_metadata` y los campos editables del perfil **no otorgan privilegios**. Vincular un profesor y un lugar de distintos responsables requiere consentimiento/autorización administrativa; el prototipo no incluye un flujo de invitación/aprobación entre responsables.

Para apagar el servidor:

```sql
update private.learning_settings set enabled = false where id;
```

## Modelo y garantías

- `learning_profiles`: profesores/lugares, foto, portada, especialidades, modalidad y ubicación. Las cuentas responsables se vinculan en `private.learning_managers`; no se publican sus UUID ni sus permisos.
- `learning_teacher_places`: relación muchos a muchos.
- `learning_activities`: clase/curso, profesores, lugar, cupos, precio total/moneda y estados borrador/publicada/cancelada/finalizada.
- `learning_sessions`: fechas, duración y programa por encuentro. Clase: un encuentro. Curso: al menos dos, sin superposición. Zona IANA validada en PostgreSQL.
- `learning_enrollments`: una inscripción por actividad y cuenta. Solo el alumno puede leer directamente sus filas. Los responsables acceden al listado mediante un RPC autorizado que entrega únicamente ID de inscripción, nombre, estado y asistencia; sin email, teléfono, ubicación del alumno ni UUID de cuenta.
- `learning_attendance`: asistencia por encuentro e inscripción, con referencias compuestas que impiden mezclar actividades.
- RLS en todas las tablas, permisos explícitos y escrituras directas revocadas a clientes. Wrappers públicos `SECURITY INVOKER`; funciones privadas con permisos/actor validados y `search_path` vacío.
- Reserva, cancelación, reducción de cupos, cambio de estado y asistencia bloquean la misma fila de actividad. Unicidad por alumno y reserva idempotente: tocar dos veces no consume dos cupos. Dos usuarios disputando el último cupo no pueden superar la capacidad.
- La inscripción/cancelación del alumno cierra al comenzar el primer encuentro. Cancelar una actividad cancela todas sus inscripciones y libera el contador; no se puede republicar. Finalizar requiere que termine el último encuentro.
- Después de la primera inscripción se conservan precio, modalidad, lugar, profesores y programa; el responsable puede ajustar título, descripción, imagen y cupos sin bajarlos por debajo del total confirmado.
- Actividades pagas visibles, pero `learning_enroll` rechaza cualquier precio mayor a cero. No se genera reserva paga ni un estado de pago exitoso. Mercado Pago está pendiente.
- Imágenes: selector existente de Expo y helper de Supabase Storage existente, bucket `event-assets`, carpeta inicial del UUID de la cuenta, siguiendo sus políticas actuales. Los archivos son públicos. El preview local permite URL HTTPS y no simula subidas.

## Validación realizada

```sh
node --test scripts/learning-utils.test.cjs
node scripts/learning-db.test.mjs
npm run colors:check
npx tsc --noEmit
npx expo export --platform android --platform ios --output-dir /tmp/vibes-learning-native-export --max-workers 2
```

- Cinco pruebas de utilidades: flag de desarrollo/release, zonas IANA independientes del dispositivo, fechas inválidas/DST, filtros por encuentros de cursos, precio y errores de pago.
- Doce escenarios de PostgreSQL real aislado: flag, privilegios, relaciones, borradores/publicación, carreras reales por último cupo con conexiones distintas, reserva duplicada, RLS/listado mínimo, cancelación, pagos bloqueados, transiciones, curso/asistencia, finalización e interruptor del servidor.
- Recorrido visual local: responsable creó y publicó **FICTICIO · Clase de prueba integral** (un cupo), alumno confirmó reserva y la vio en próximas, responsable vio **FICTICIO Ana López** y guardó **Presente**.
- Exportación de los bundles de Android e iOS correcta. Paleta correcta.
- TypeScript global conserva errores anteriores en `ChallengeTreeProgress`, `DiscoverCirclesOverlay` y `OnboardingProgressBar`; no se agregaron errores en esta sección.

## Pendiente antes de publicar la sección en las tiendas

Prueba en Android e iOS físicos con el Supabase de staging, sesión real y selector/subida de imágenes; ejecutar asesores de Supabase después de aplicar la migración en ese entorno. El análisis remoto leído corresponde al esquema previo; no valida una migración que aún no está aplicada allí.

Mercado Pago, onboarding/aprobación de responsables, consentimiento entre profesores/lugares de diferentes responsables, notificaciones, calendario nativo y enlaces privados de videollamada no están implementados. Las fechas del editor usan campos con formato explícito, y el listado de esta primera versión carga hasta 500 perfiles/actividades: paginación y búsqueda en servidor quedan para una oferta mayor. No se agregaron datos ficticios a producción ni se publicó una nueva versión en las tiendas.
