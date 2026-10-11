// Real PostgreSQL integration test. Dependencies are isolated from the app.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
const modules =
  process.env.LEARNING_TEST_MODULES ?? "/tmp/vibes-learning-tests/node_modules";
const { default: EmbeddedPostgres } = await import(
  pathToFileURL(path.join(modules, "embedded-postgres/dist/index.js"))
);
const cluster = new EmbeddedPostgres({
  databaseDir: `/tmp/vibes-learning-pg-${randomUUID()}`,
  port: 55483,
  user: "postgres",
  password: randomUUID(),
  persistent: false,
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {},
  onError: () => {},
});
const connections = [];
let admin;
let passed = 0;
const check = (name) => {
  console.log(`PASS ${name}`);
  passed++;
};
const uid = {
  owner: randomUUID(),
  student: randomUUID(),
  other: randomUUID(),
  outsider: randomUUID(),
};
async function actor(id, role = "authenticated") {
  const client = cluster.getPgClient("postgres", "127.0.0.1");
  await client.connect();
  connections.push(client);
  await client.query(`set role ${role}`);
  await client.query("select set_config('request.jwt.claim.sub',$1,false)", [
    id ?? "",
  ]);
  return client;
}
async function rpc(client, name, args = []) {
  const r = await client.query(
    `select public.learning_${name}(${args
      .map((_, i) => `$${i + 1}`)
      .join(",")}) result`,
    args
  );
  return r.rows[0].result;
}
async function denied(client, name, args, code) {
  await assert.rejects(
    () => rpc(client, name, args),
    (e) => e.message.includes(code)
  );
}
try {
  await cluster.initialise();
  await cluster.start();
  admin = cluster.getPgClient("postgres", "127.0.0.1");
  await admin.connect();
  await admin.query(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;create table public.profiles(id uuid primary key references auth.users(id),display_name text,is_active boolean default true,deleted_at timestamptz,is_teacher boolean default false);`
  );
  const migrations = await fs.readdir("supabase/migrations");
  const migration = migrations.find((f) =>
    f.endsWith("_profesores_lugares.sql")
  );
  assert.ok(migration);
  await admin.query(
    await fs.readFile(`supabase/migrations/${migration}`, "utf8")
  );
  for (const [name, id] of Object.entries(uid)) {
    await admin.query("insert into auth.users values($1)", [id]);
    await admin.query(
      "insert into public.profiles(id,display_name) values($1,$2)",
      [id, `FICTICIO ${name}`]
    );
  }
  const owner = await actor(uid.owner),
    student = await actor(uid.student),
    other = await actor(uid.other),
    outsider = await actor(uid.outsider),
    anon = await actor(null, "anon");
  await denied(
    owner,
    "save_profile",
    [null, { kind: "teacher", name: "FICTICIO Profe", modality: "online" }],
    "LEARNING_DISABLED"
  );
  await admin.query("update private.learning_settings set enabled=true");
  await admin.query("insert into private.learning_operators values($1)", [
    uid.owner,
  ]);
  const profile = {
    kind: "teacher",
    name: "FICTICIO Profe",
    description: "Datos de prueba",
    specialties: ["Yoga"],
    modality: "online",
    published: true,
  };
  await denied(outsider, "save_profile", [null, profile], "FORBIDDEN");
  // The existing self-editable profile field never grants this feature's privileges.
  await admin.query("update public.profiles set is_teacher=true where id=$1", [
    uid.outsider,
  ]);
  await denied(outsider, "save_profile", [null, profile], "FORBIDDEN");
  await assert.rejects(
    () =>
      outsider.query("insert into private.learning_operators values($1)", [
        uid.outsider,
      ]),
    /permission denied/
  );
  await assert.rejects(
    () =>
      outsider.query("insert into private.learning_managers values($1,$2)", [
        randomUUID(),
        uid.outsider,
      ]),
    /permission denied/
  );
  check("feature gate and no self-assigned privileges");
  const teacher = await rpc(owner, "save_profile", [null, profile]);
  const place = await rpc(owner, "save_profile", [
    null,
    {
      ...profile,
      kind: "place",
      name: "FICTICIO Casa",
      modality: "in_person",
      location: "Buenos Aires",
    },
  ]);
  await rpc(owner, "link_profiles", [teacher, place, true]);
  await denied(outsider, "link_profiles", [teacher, place, false], "FORBIDDEN");
  const t2 = await rpc(owner, "save_profile", [
    null,
    { ...profile, name: "FICTICIO Profe 2" },
  ]);
  const p2 = await rpc(owner, "save_profile", [
    null,
    { ...profile, kind: "place", name: "FICTICIO Casa 2", location: "CABA" },
  ]);
  await rpc(owner, "link_profiles", [teacher, p2, true]);
  await rpc(owner, "link_profiles", [t2, place, true]);
  assert.equal(
    (await student.query("select * from learning_teacher_places")).rows.length,
    3
  );
  check("many-to-many teacher/place relationships");
  const start = new Date(Date.now() + 86400000).toISOString(),
    end = new Date(Date.now() + 90000000).toISOString();
  const input = {
    organizer_id: teacher,
    teacher_ids: [teacher],
    place_id: place,
    kind: "class",
    title: "FICTICIO Clase gratis",
    description: "Prueba",
    modality: "in_person",
    location: "Buenos Aires",
    timezone: "America/Argentina/Buenos_Aires",
    capacity: 1,
    price: 0,
    currency: "ARS",
    sessions: [{ title: "Encuentro 1", starts_at: start, ends_at: end }],
  };
  const activity = await rpc(owner, "save_activity", [null, input]);
  assert.equal(
    (
      await student.query("select * from learning_activities where id=$1", [
        activity,
      ])
    ).rows.length,
    0
  );
  await denied(outsider, "save_activity", [activity, input], "FORBIDDEN");
  await denied(outsider, "set_status", [activity, "published"], "FORBIDDEN");
  await assert.rejects(
    () =>
      outsider.query(
        "update learning_activities set capacity=999 where id=$1",
        [activity]
      ),
    /permission denied/
  );
  await denied(anon, "enroll", [activity], "permission denied");
  await denied(student, "enroll", [activity], "NOT_PUBLISHED");
  await rpc(owner, "set_status", [activity, "published"]);
  check("draft isolation, publication and denied unauthorized writes");
  // Hold an actual transaction row lock. Two separate connections then request the last seat.
  await admin.query("begin");
  await admin.query(
    "select id from learning_activities where id=$1 for update",
    [activity]
  );
  const requests = [
    rpc(student, "enroll", [activity]),
    rpc(other, "enroll", [activity]),
  ];
  await new Promise((r) => setTimeout(r, 100));
  await admin.query("commit");
  const results = await Promise.allSettled(requests);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.match(
    results.find((r) => r.status === "rejected").reason.message,
    /FULL_CAPACITY/
  );
  const winner = results[0].status === "fulfilled" ? student : other,
    loser = winner === student ? other : student;
  const enrollment = results.find((r) => r.status === "fulfilled").value;
  assert.equal(await rpc(winner, "enroll", [activity]), enrollment);
  assert.equal(
    (
      await admin.query(
        "select reserved_count from learning_activities where id=$1",
        [activity]
      )
    ).rows[0].reserved_count,
    1
  );
  assert.equal(
    (
      await admin.query(
        "select count(*)::int n from learning_enrollments where activity_id=$1",
        [activity]
      )
    ).rows[0].n,
    1
  );
  check("true simultaneous last-seat contention and duplicate idempotency");
  await denied(loser, "roster", [activity], "FORBIDDEN");
  assert.equal(
    (await loser.query("select * from learning_enrollments")).rows.length,
    0
  );
  assert.equal(
    (await owner.query("select * from learning_enrollments")).rows.length,
    0
  );
  const roster = await rpc(owner, "roster", [activity]);
  assert.equal(roster.length, 1);
  assert.deepEqual(Object.keys(roster[0]).sort(), [
    "attendance",
    "id",
    "name",
    "status",
  ]);
  check("private enrollment RLS and minimal authorized roster");
  await rpc(winner, "cancel_enrollment", [activity]);
  await rpc(winner, "cancel_enrollment", [activity]);
  assert.equal(
    (
      await admin.query(
        "select reserved_count from learning_activities where id=$1",
        [activity]
      )
    ).rows[0].reserved_count,
    0
  );
  await rpc(loser, "enroll", [activity]);
  check("cancellation releases seat exactly once");
  const paid = await rpc(owner, "save_activity", [
    null,
    { ...input, title: "FICTICIO Pago", price: 8000 },
  ]);
  await rpc(owner, "set_status", [paid, "published"]);
  await denied(student, "enroll", [paid], "PAYMENT_UNAVAILABLE");
  assert.equal(
    (
      await admin.query(
        "select count(*)::int n from learning_enrollments where activity_id=$1",
        [paid]
      )
    ).rows[0].n,
    0
  );
  check("paid reservations blocked, no fabricated payment state");
  await denied(
    owner,
    "save_activity",
    [activity, { ...input, capacity: 0 }],
    "CAPACITY_BELOW_ENROLLED"
  );
  await denied(
    owner,
    "save_activity",
    [activity, { ...input, price: 10 }],
    "ENROLLED_DETAILS_LOCKED"
  );
  await denied(owner, "set_status", [activity, "draft"], "INVALID_TRANSITION");
  await denied(
    owner,
    "set_status",
    [activity, "completed"],
    "ACTIVITY_NOT_ENDED"
  );
  await rpc(owner, "set_status", [activity, "cancelled"]);
  assert.equal(
    (
      await admin.query(
        "select status from learning_enrollments where activity_id=$1",
        [activity]
      )
    ).rows.every((e) => e.status === "cancelled"),
    true
  );
  await denied(
    owner,
    "set_status",
    [activity, "published"],
    "INVALID_TRANSITION"
  );
  await denied(student, "enroll", [activity], "NOT_PUBLISHED");
  check("state transitions and activity cancellation propagate to enrollments");
  const courseInput = {
    ...input,
    kind: "course",
    capacity: 4,
    title: "FICTICIO Curso",
    sessions: [
      ...input.sessions,
      {
        title: "Encuentro 2",
        starts_at: new Date(Date.now() + 172800000).toISOString(),
        ends_at: new Date(Date.now() + 176400000).toISOString(),
      },
    ],
  };
  await denied(
    owner,
    "save_activity",
    [null, { ...courseInput, sessions: input.sessions }],
    "INVALID_SESSIONS"
  );
  const course = await rpc(owner, "save_activity", [null, courseInput]);
  await rpc(owner, "set_status", [course, "published"]);
  const courseEnrollment = await rpc(student, "enroll", [course]);
  const courseSessions = (
    await student.query(
      "select * from learning_sessions where activity_id=$1 order by starts_at",
      [course]
    )
  ).rows;
  assert.equal(courseSessions.length, 2);
  await denied(
    owner,
    "record_attendance",
    [courseSessions[0].id, courseEnrollment, true],
    "ATTENDANCE_NOT_STARTED"
  );
  await denied(
    outsider,
    "record_attendance",
    [courseSessions[0].id, courseEnrollment, true],
    "FORBIDDEN"
  );
  await admin.query(
    "update learning_sessions set starts_at=now()-interval '1 hour',ends_at=now()-interval '1 minute' where id=$1",
    [courseSessions[0].id]
  );
  await rpc(owner, "record_attendance", [
    courseSessions[0].id,
    courseEnrollment,
    true,
  ]);
  assert.equal(
    (await rpc(owner, "roster", [course]))[0].attendance[0].present,
    true
  );
  await rpc(owner, "record_attendance", [
    courseSessions[0].id,
    courseEnrollment,
    false,
  ]);
  assert.equal((await rpc(owner, "roster", [course]))[0].attendance.length, 1);
  assert.equal(
    (await student.query("select * from learning_attendance")).rows.length,
    1
  );
  assert.equal(
    (await outsider.query("select * from learning_attendance")).rows.length,
    0
  );
  await denied(
    owner,
    "record_attendance",
    [courseSessions[0].id, enrollment, true],
    "INVALID_ENROLLMENT"
  );
  await denied(student, "cancel_enrollment", [course], "CANCELLATION_CLOSED");
  check(
    "multi-session course enrollment and per-meeting attendance end to end"
  );
  await admin.query(
    "update learning_sessions set starts_at=starts_at-interval '10 days',ends_at=ends_at-interval '10 days' where activity_id=$1",
    [course]
  );
  await rpc(owner, "set_status", [course, "completed"]);
  check("course completion only after all meetings");
  await admin.query("update private.learning_settings set enabled=false");
  assert.equal(
    (await student.query("select * from learning_activities")).rows.length,
    0
  );
  await denied(student, "enroll", [paid], "LEARNING_DISABLED");
  check("server kill switch hides data and blocks mutations");
  assert.equal(
    (
      await admin.query(
        "select count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') and relname like 'learning_%' and relkind='r' and not relrowsecurity"
      )
    ).rows[0].n,
    0
  );
  check("RLS enabled on every new table");
  console.log(`${passed} integration scenarios passed`);
} finally {
  for (const client of connections) await client.end().catch(() => {});
  if (admin) await admin.end().catch(() => {});
  await cluster.stop().catch(() => {});
}
