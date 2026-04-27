begin;

/*
  Demo seed for testing discover/profile/preferences.

  Default scope:
  - Updates only users in auth.users whose email looks like demo/test/qa/fake/seed/sample.

  If you want to seed every current user instead:
  - Replace the WHERE clause inside target_users with `true`.

  This seed:
  - Upserts a complete row in public.profiles
  - Upserts a complete row in public.user_preferences
  - Does not create auth users
  - Is deterministic, so it can be re-run safely
*/

with target_users as (
  select
    u.id,
    row_number() over (order by u.created_at, u.id) as rn
  from auth.users u
  where coalesce(u.email, '') ~* '(demo|test|qa|fake|seed|sample)'
),
profile_seed as (
  select
    tu.id,
    tu.rn,
    (array[
      'Sofia Luna',
      'Mateo Sol',
      'Valentina Mar',
      'Bruno Cielo',
      'Emma Rio',
      'Luca Monte',
      'Camila Aura',
      'Tomas Zen',
      'Julieta Sur',
      'Benjamin Veda',
      'Martina Om',
      'Franco Prana'
    ])[((tu.rn - 1) % 12) + 1] as display_name,
    (
      current_date
      - make_interval(
          years => 24 + ((tu.rn - 1) % 10),
          months => (tu.rn % 11),
          days => ((tu.rn * 3) % 27)
        )
    )::date as birth_date,
    (array[1, 2, 1, 2, 3, 1, 2, 3, 1, 2, 1, 3])[((tu.rn - 1) % 12) + 1] as gender_id,
    case (tu.rn % 5)
      when 0 then array['Todos']::text[]
      when 1 then array['Mujeres']::text[]
      when 2 then array['Hombres']::text[]
      when 3 then array['Mujeres', 'Hombres']::text[]
      else array['Todos']::text[]
    end as orientation,
    case (tu.rn % 3)
      when 0 then 1
      when 1 then 2
      else 3
    end as intent_id,
    (array[
      'Argentina',
      'Argentina',
      'Argentina',
      'Uruguay',
      'Chile',
      'Brasil',
      'Argentina',
      'Mexico',
      'España',
      'Colombia',
      'Peru',
      'Argentina'
    ])[((tu.rn - 1) % 12) + 1] as country,
    (array[
      'Buenos Aires',
      'Cordoba',
      'Mendoza',
      'Montevideo',
      'Santiago',
      'Florianopolis',
      'Rosario',
      'Ciudad de Mexico',
      'Barcelona',
      'Bogota',
      'Lima',
      'Mar del Plata'
    ])[((tu.rn - 1) % 12) + 1] as city,
    (array[
      'Palermo',
      'Nueva Cordoba',
      'Chacras de Coria',
      'Pocitos',
      'Providencia',
      'Lagoa da Conceicao',
      'Pichincha',
      'Roma Norte',
      'Gracia',
      'Chapinero',
      'Miraflores',
      'Guemes'
    ])[((tu.rn - 1) % 12) + 1] as neighborhood,
    (array[
      -34.5889,
      -31.4201,
      -32.8895,
      -34.9060,
      -33.4372,
      -27.5969,
      -32.9442,
      19.4126,
      41.4036,
      4.6486,
      -12.1211,
      -38.0055
    ])[((tu.rn - 1) % 12) + 1] as latitude,
    (array[
      -58.4300,
      -64.1888,
      -68.8795,
      -56.1360,
      -70.6506,
      -48.5480,
      -60.6505,
      -99.1710,
      2.1744,
      -74.0853,
      -77.0300,
      -57.5426
    ])[((tu.rn - 1) % 12) + 1] as longitude
  from target_users tu
),
upsert_profiles as (
  insert into public.profiles (
    id,
    display_name,
    birth_date,
    gender_id,
    orientation,
    intent_id,
    country,
    city,
    neighborhood,
    location_label,
    latitude,
    longitude,
    is_active
  )
  select
    ps.id,
    ps.display_name,
    ps.birth_date,
    ps.gender_id,
    ps.orientation,
    ps.intent_id,
    ps.country,
    ps.city,
    ps.neighborhood,
    concat_ws(', ', ps.neighborhood, ps.city, ps.country) as location_label,
    ps.latitude,
    ps.longitude,
    true
  from profile_seed ps
  on conflict (id) do update
  set
    display_name = excluded.display_name,
    birth_date = excluded.birth_date,
    gender_id = excluded.gender_id,
    orientation = excluded.orientation,
    intent_id = excluded.intent_id,
    country = excluded.country,
    city = excluded.city,
    neighborhood = excluded.neighborhood,
    location_label = excluded.location_label,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    is_active = true
  returning id
)
insert into public.user_preferences (
  user_id,
  spiritual_path,
  spiritual_path_details,
  vegetarian,
  about_me,
  smoking,
  other_tags,
  open_to,
  languages,
  zodiac,
  education,
  family_plan,
  vaccine,
  personality,
  communication_style,
  love_style,
  pets,
  discover_age_min,
  discover_age_max,
  discover_gender_id,
  discover_distance_min_km,
  discover_distance_max_km,
  discover_smoking,
  location
)
select
  ps.id as user_id,
  case (ps.rn % 6)
    when 0 then array['Meditación', 'Yoga']::text[]
    when 1 then array['Ashtanga', 'Reiki']::text[]
    when 2 then array['El Arte de Vivir', 'Meditación']::text[]
    when 3 then array['Astrología', 'Tantra']::text[]
    when 4 then array['Kundalini', 'Hatha Yoga']::text[]
    else array['Yoga', 'Otro']::text[]
  end as spiritual_path,
  case (ps.rn % 6)
    when 0 then jsonb_build_object(
      'Meditación', jsonb_build_object('role', 'Alumno', 'years', '6', 'notes', 'Practica vipassana y respiracion consciente'),
      'Yoga', jsonb_build_object('role', 'Instructor', 'years', '4', 'notes', 'Da clases grupales al amanecer')
    )
    when 1 then jsonb_build_object(
      'Ashtanga', jsonb_build_object('role', 'Alumno', 'years', '5', 'notes', 'Le gusta entrenar con disciplina y foco'),
      'Reiki', jsonb_build_object('role', 'Alumno', 'years', '2', 'notes', 'Lo usa para bajar revoluciones')
    )
    when 2 then jsonb_build_object(
      'El Arte de Vivir', jsonb_build_object('role', 'Alumno', 'years', '3', 'notes', 'Hace sudarshan kriya varias veces por semana'),
      'Meditación', jsonb_build_object('role', 'Alumno', 'years', '7', 'notes', 'Busca calma y claridad mental')
    )
    when 3 then jsonb_build_object(
      'Astrología', jsonb_build_object('role', 'Alumno', 'years', '8', 'notes', 'Lee cartas natales para amigos'),
      'Tantra', jsonb_build_object('role', 'Alumno', 'years', '2', 'notes', 'Le interesan vinculos mas conscientes')
    )
    when 4 then jsonb_build_object(
      'Kundalini', jsonb_build_object('role', 'Alumno', 'years', '4', 'notes', 'Le gustan las practicas energizantes'),
      'Hatha Yoga', jsonb_build_object('role', 'Instructor', 'years', '6', 'notes', 'Da clases suaves para principiantes')
    )
    else jsonb_build_object(
      'Yoga', jsonb_build_object('role', 'Alumno', 'years', '5', 'notes', 'Practica por bienestar general'),
      'Otro', jsonb_build_object('role', 'Alumno', 'years', '1', 'notes', 'Explora sound healing y breathwork')
    )
  end as spiritual_path_details,
  (array['Sí', 'No', 'Pescetariano', 'Vegano'])[((ps.rn - 1) % 4) + 1] as vegetarian,
  (array[
    'Ama los planes tranquilos, el movimiento consciente y las conversaciones profundas.',
    'Disfruta cocinar saludable, salir a caminar y compartir rituales simples.',
    'Busca vinculos con presencia, humor y apertura emocional.',
    'Le gusta mezclar espiritualidad, arte y naturaleza en su vida diaria.',
    'Valora la autenticidad, la curiosidad y las personas con energia serena.',
    'Prefiere conexiones lentas, honestas y con buena comunicacion.'
  ])[((ps.rn - 1) % 6) + 1] as about_me,
  (array['No', 'A veces', 'No', 'Sí'])[((ps.rn - 1) % 4) + 1] as smoking,
  case (ps.rn % 6)
    when 0 then array['Viajes', 'Arte', 'Naturaleza']::text[]
    when 1 then array['Meditación', 'Cocina', 'Senderismo']::text[]
    when 2 then array['Lectura', 'Música', 'Perros']::text[]
    when 3 then array['Astrología', 'Cacao', 'Playa']::text[]
    when 4 then array['Montaña', 'Yoga', 'Fotografía']::text[]
    else array['Breathwork', 'Cine', 'Animales']::text[]
  end as other_tags,
  case (ps.rn % 4)
    when 0 then array['Todos']::text[]
    when 1 then array['Mujeres']::text[]
    when 2 then array['Hombres']::text[]
    else array['Mujeres', 'Hombres']::text[]
  end as open_to,
  case (ps.rn % 5)
    when 0 then array['Español', 'Inglés']::text[]
    when 1 then array['Español', 'Portugués']::text[]
    when 2 then array['Español', 'Francés']::text[]
    when 3 then array['Español', 'Italiano']::text[]
    else array['Español', 'Inglés', 'Portugués']::text[]
  end as languages,
  (array[
    'Aries',
    'Tauro',
    'Géminis',
    'Cáncer',
    'Leo',
    'Virgo',
    'Libra',
    'Escorpio',
    'Sagitario',
    'Capricornio',
    'Acuario',
    'Piscis'
  ])[((ps.rn - 1) % 12) + 1] as zodiac,
  (array['Universidad', 'Posgrado', 'Técnico', 'Secundaria'])[((ps.rn - 1) % 4) + 1] as education,
  (array['Tal vez', 'Quiero hijos', 'No quiero', 'Ya tengo'])[((ps.rn - 1) % 4) + 1] as family_plan,
  (array['Sí', 'Prefiero no decir', 'Sí', 'No'])[((ps.rn - 1) % 4) + 1] as vaccine,
  (array['Ambivertido', 'Introvertido', 'Extrovertido'])[((ps.rn - 1) % 3) + 1] as personality,
  (array['Calmado', 'Profundo', 'Directo', 'Humor'])[((ps.rn - 1) % 4) + 1] as communication_style,
  (array[
    'Tiempo de calidad',
    'Palabras de afirmación',
    'Actos de servicio',
    'Contacto físico',
    'Regalos'
  ])[((ps.rn - 1) % 5) + 1] as love_style,
  (array['Me encantan', 'Tengo', 'No tengo', 'Me encantan'])[((ps.rn - 1) % 4) + 1] as pets,
  24 + ((ps.rn - 1) % 6) as discover_age_min,
  34 + ((ps.rn - 1) % 8) as discover_age_max,
  case (ps.rn % 4)
    when 0 then 3
    when 1 then 1
    when 2 then 2
    else 3
  end as discover_gender_id,
  0 as discover_distance_min_km,
  (array[15, 30, 60, 100, 250])[((ps.rn - 1) % 5) + 1] as discover_distance_max_km,
  (array['No', 'A veces', 'Sí'])[((ps.rn - 1) % 3) + 1] as discover_smoking,
  concat_ws(', ', ps.neighborhood, ps.city, ps.country) as location
from profile_seed ps
join upsert_profiles up on up.id = ps.id
on conflict (user_id) do update
set
  spiritual_path = excluded.spiritual_path,
  spiritual_path_details = excluded.spiritual_path_details,
  vegetarian = excluded.vegetarian,
  about_me = excluded.about_me,
  smoking = excluded.smoking,
  other_tags = excluded.other_tags,
  open_to = excluded.open_to,
  languages = excluded.languages,
  zodiac = excluded.zodiac,
  education = excluded.education,
  family_plan = excluded.family_plan,
  vaccine = excluded.vaccine,
  personality = excluded.personality,
  communication_style = excluded.communication_style,
  love_style = excluded.love_style,
  pets = excluded.pets,
  discover_age_min = excluded.discover_age_min,
  discover_age_max = excluded.discover_age_max,
  discover_gender_id = excluded.discover_gender_id,
  discover_distance_min_km = excluded.discover_distance_min_km,
  discover_distance_max_km = excluded.discover_distance_max_km,
  discover_smoking = excluded.discover_smoking,
  location = excluded.location,
  updated_at = now();

commit;
