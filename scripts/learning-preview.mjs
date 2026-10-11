// Isolated development preview: real migration/RLS/RPCs + the actual RN screens.
// No connection to production. No alternative auth path is added to the app.
import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
const modules =
  process.env.LEARNING_TEST_MODULES ?? "/tmp/vibes-learning-tests/node_modules";
const { default: EmbeddedPostgres } = await import(
  pathToFileURL(path.join(modules, "embedded-postgres/dist/index.js"))
);
const esbuild = await import(
  pathToFileURL(path.join(modules, "esbuild/lib/main.js"))
);
const pg = new EmbeddedPostgres({
  databaseDir: `/tmp/vibes-learning-preview-${randomUUID()}`,
  port: 55484,
  user: "postgres",
  password: randomUUID(),
  persistent: false,
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {},
  onError: () => {},
});
await pg.initialise();
await pg.start();
const admin = pg.getPgClient("postgres", "127.0.0.1");
await admin.connect();
const users = Object.fromEntries(
  ["owner", "student", "other", "outsider"].map((name) => [name, randomUUID()])
);
await admin.query(
  `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;create table public.profiles(id uuid primary key references auth.users(id),display_name text,is_active boolean default true,deleted_at timestamptz,is_teacher boolean default false);`
);
await admin.query(
  await fs.readFile(
    "supabase/migrations/20261011162146_profesores_lugares.sql",
    "utf8"
  )
);
for (const [name, id] of Object.entries(users)) {
  await admin.query("insert into auth.users values($1)", [id]);
  await admin.query("insert into profiles(id,display_name) values($1,$2)", [
    id,
    `FICTICIO ${
      name === "owner"
        ? "Responsable"
        : name === "student"
        ? "Ana López"
        : name === "other"
        ? "Martín Pérez"
        : "Invitado"
    }`,
  ]);
}
await admin.query("update private.learning_settings set enabled=true");
await admin.query("insert into private.learning_operators values($1)", [
  users.owner,
]);
const procedures = {
  learning_access: [],
  learning_save_profile: ["p_id", "p_data"],
  learning_link_profiles: ["p_teacher", "p_place", "p_link"],
  learning_save_activity: ["p_id", "p_data"],
  learning_set_status: ["p_id", "p_status"],
  learning_enroll: ["p_id"],
  learning_cancel_enrollment: ["p_id"],
  learning_roster: ["p_id"],
  learning_record_attendance: ["p_session", "p_enrollment", "p_present"],
};
async function asActor(who, fn) {
  if (!users[who]) throw Error("Identidad de prueba inválida");
  const c = pg.getPgClient("postgres", "127.0.0.1");
  await c.connect();
  try {
    await c.query("set role authenticated");
    await c.query("select set_config('request.jwt.claim.sub',$1,false)", [
      users[who],
    ]);
    return await fn(c);
  } finally {
    await c.end();
  }
}
async function rpc(who, name, args) {
  if (!Object.hasOwn(procedures, name)) throw Error("RPC inválido");
  return asActor(
    who,
    async (c) =>
      (
        await c.query(
          `select public.${name}(${procedures[name]
            .map((_, i) => `$${i + 1}`)
            .join(",")}) result`,
          procedures[name].map((k) => args?.[k] ?? null)
        )
      ).rows[0].result
  );
}
const teacher = await rpc("owner", "learning_save_profile", {
  p_id: null,
  p_data: {
    kind: "teacher",
    name: "FICTICIO · Lucía Fernández",
    description:
      "Un espacio para respirar, moverte y conectar con vos. Perfil ficticio para desarrollo.",
    specialties: ["Yoga", "Meditación"],
    image_url:
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600",
    cover_url:
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1000",
    location: "Palermo · Buenos Aires",
    modality: "mixed",
    published: true,
  },
});
const place = await rpc("owner", "learning_save_profile", {
  p_id: null,
  p_data: {
    kind: "place",
    name: "FICTICIO · Casa Calma",
    description: "Lugar ficticio para probar clases y cursos de bienestar.",
    specialties: ["Yoga", "Meditación", "Respiración"],
    image_url:
      "https://images.unsplash.com/photo-1545389336-cf090694435e?w=800",
    location: "Palermo · Buenos Aires",
    modality: "in_person",
    published: true,
  },
});
await rpc("owner", "learning_link_profiles", {
  p_teacher: teacher,
  p_place: place,
  p_link: true,
});
const next = new Date(Date.now() + 86400000);
next.setSeconds(0, 0);
const meeting = (days, title) => ({
  title,
  starts_at: new Date(next.getTime() + days * 86400000).toISOString(),
  ends_at: new Date(next.getTime() + days * 86400000 + 3600000).toISOString(),
});
const base = {
  organizer_id: teacher,
  teacher_ids: [teacher],
  place_id: place,
  modality: "in_person",
  location: "Casa Calma · Palermo",
  timezone: "America/Argentina/Buenos_Aires",
  capacity: 12,
  price: 0,
  currency: "ARS",
  description:
    "Datos ficticios. Una práctica suave para soltar tensiones y empezar el día con energía.",
  image_url:
    "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=900",
};
for (const input of [
  {
    ...base,
    kind: "class",
    title: "FICTICIO · Yoga para empezar",
    sessions: [meeting(0, "Práctica de yoga")],
  },
  {
    ...base,
    kind: "course",
    title: "FICTICIO · Respirar y conectar",
    sessions: [
      meeting(1, "Respiración consciente"),
      meeting(2, "Meditación guiada"),
    ],
  },
  {
    ...base,
    kind: "class",
    title: "FICTICIO · Clase paga",
    price: 8000,
    sessions: [meeting(3, "Encuentro pago")],
  },
]) {
  const id = await rpc("owner", "learning_save_activity", {
    p_id: null,
    p_data: input,
  });
  await rpc("owner", "learning_set_status", {
    p_id: id,
    p_status: "published",
  });
}
const runtime = path.resolve("scripts/learning-preview/runtime.tsx");
const bundle = await esbuild.build({
  entryPoints: ["scripts/learning-preview/entry.tsx"],
  bundle: true,
  write: false,
  platform: "browser",
  resolveExtensions: [
    ".web.tsx",
    ".web.ts",
    ".web.jsx",
    ".web.js",
    ".tsx",
    ".ts",
    ".jsx",
    ".js",
    ".json",
  ],
  format: "iife",
  jsx: "automatic",
  define: {
    __DEV__: "true",
    "process.env.EXPO_PUBLIC_LEARNING_ENABLED": '"true"',
    "process.env.NODE_ENV": '"development"',
  },
  loader: { ".png": "dataurl", ".jpg": "dataurl", ".ttf": "dataurl" },
  alias: { "react-native": "react-native-web" },
  plugins: [
    {
      name: "development-only-adapters",
      setup(build) {
        build.onResolve({filter:/^lucide-react-native$/},()=>({path:path.resolve("scripts/learning-preview/icons.mjs")}));
        build.onResolve(
          {
            filter:
              /^(?:@react-navigation\/native|expo-image-picker)$|(?:auth\.queries|lib\/supabase|lib\/supabaseStorage)$/,
          },
          () => ({ path: runtime })
        );
      },
    },
  ],
});
const js = bundle.outputFiles[0].contents;
const allowedTables = new Set([
  "learning_profiles",
  "learning_activities",
  "learning_sessions",
  "learning_teacher_places",
  "learning_enrollments",
]);
const html =
  '<!doctype html><html><meta name="viewport" content="width=device-width, initial-scale=1"><title>Vibes · Clases y espacios · Prototipo local</title><style>html,body,#root{margin:0;min-height:100%;background:#FEFEFD}button{cursor:pointer}*{box-sizing:border-box}</style><div id="root"></div><script src="/app.js"></script></html>';
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    if (url.pathname === "/app.js") {
      res.setHeader("Content-Type", "application/javascript");
      return res.end(js);
    }
    if (!url.pathname.startsWith("/api/")) {
      res.setHeader("Content-Type", "text/html");
      return res.end(html);
    }
    res.setHeader("Content-Type", "application/json");
    if (url.pathname === "/api/users") return res.end(JSON.stringify(users));
    if (url.pathname === "/api/table") {
      const table = url.searchParams.get("table");
      if (!allowedTables.has(table)) throw Error("Tabla inválida");
      const rows = await asActor(
        url.searchParams.get("actor"),
        async (c) => (await c.query(`select * from public.${table}`)).rows
      );
      return res.end(JSON.stringify(rows));
    }
    if (req.method !== "POST" || req.headers["x-learning-preview"] !== "1")
      throw Error("Solo pruebas locales");
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 65536) throw Error("Solicitud demasiado grande");
    }
    const data = JSON.parse(body);
    if (url.pathname === "/api/rpc")
      return res.end(
        JSON.stringify(await rpc(data.actor, data.name, data.args))
      );
    if (url.pathname === "/api/clock") {
      if (data.actor !== "owner")
        throw Error("Solo el responsable de prueba puede adelantar el reloj");
      await admin.query(
        "update learning_sessions s set starts_at=now()-interval '1 minute',ends_at=now()+interval '59 minutes' where s.id in (select distinct on(activity_id) id from learning_sessions order by activity_id,starts_at) and exists(select 1 from learning_enrollments e where e.activity_id=s.activity_id and e.status='confirmed')"
      );
      return res.end("{}");
    }
    throw Error("Ruta inválida");
  } catch (e) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: e.message }));
  }
});
server.listen(8775, "127.0.0.1", () =>
  console.log("Prototipo local con datos ficticios: http://127.0.0.1:8775")
);
async function stop() {
  server.close();
  await admin.end();
  await pg.stop();
  process.exit(0);
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
