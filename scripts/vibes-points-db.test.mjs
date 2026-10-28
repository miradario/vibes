import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
// Same isolated PostgreSQL dependency directory as learning-db.test.mjs.
const modules =
  process.env.LEARNING_TEST_MODULES ?? "/tmp/vibes-learning-tests/node_modules";
const { default: EmbeddedPostgres } = await import(
  pathToFileURL(path.join(modules, "embedded-postgres/dist/index.js"))
);
const cluster = new EmbeddedPostgres({
  databaseDir: `/tmp/vibes-points-${randomUUID()}`,
  port: 55486,
  user: "postgres",
  password: randomUUID(),
  persistent: false,
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {},
  onError: () => {},
});
const clients = [];
let admin;
let passed = 0;
const u = randomUUID(),
  other = randomUUID(),
  event = randomUUID(),
  challenge = randomUUID(),
  activity = randomUUID(),
  session = randomUUID(),
  enrollment = randomUUID(),
  match = randomUUID();
const check = async (name, fn) => {
  await fn();
  console.log("PASS", name);
  passed++;
};
async function actor(id) {
  const c = cluster.getPgClient("postgres", "127.0.0.1");
  await c.connect();
  clients.push(c);
  await c.query("set role authenticated");
  await c.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  return c;
}
try {
  await cluster.initialise();
  await cluster.start();
  admin = cluster.getPgClient("postgres", "127.0.0.1");
  await admin.connect();
  await admin.query(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;
 create table meditation_presence(id uuid default gen_random_uuid(),user_id uuid,presence_date date,duration_minutes integer,meditation_type text,visibility text,created_at timestamptz default now());
 create table events(id uuid primary key,title text,type text);
 create table challenges(id uuid primary key,title text,duration_days integer,visibility text,created_by uuid);
 create table challenge_participants(user_id uuid,challenge_id uuid);
 create table challenge_checkins(user_id uuid,challenge_id uuid,checkin_date date,created_at timestamptz default now());
 create table matches(id uuid primary key,user1_id uuid,user2_id uuid);
 create table messages(id uuid default gen_random_uuid(),match_id uuid,sender_id uuid,text text,created_at timestamptz default now());
 create table learning_activities(id uuid primary key,title text,status text);
 create table learning_enrollments(id uuid primary key,activity_id uuid,user_id uuid);
 create table learning_sessions(id uuid primary key,activity_id uuid,starts_at timestamptz);
 create table learning_attendance(session_id uuid,enrollment_id uuid,activity_id uuid,present boolean,recorded_at timestamptz default now());`);
  await admin.query("insert into auth.users values($1),($2)", [u, other]);
  await admin.query("insert into events values($1,'Encuentro','event')", [
    event,
  ]);
  await admin.query("insert into challenges values($1,'Pausa',2,'public',$2)", [
    challenge,
    u,
  ]);
  await admin.query("insert into challenge_participants values($1,$2)", [
    u,
    challenge,
  ]);
  await admin.query(
    "insert into challenge_checkins values($1,$2,current_date-2,now()-interval '2 days'),($1,$2,current_date-1,now()-interval '1 day')",
    [u, challenge]
  );
  await admin.query(
    "insert into meditation_presence(user_id,presence_date,duration_minutes,created_at) values($1,current_date-1,10,now()-interval '1 day')",
    [u]
  );
  await admin.query("insert into matches values($1,$2,$3)", [match, u, other]);
  await admin.query(
    "insert into messages(match_id,sender_id,text,created_at) values($1,$2,$3,now()-interval '1 day')",
    [match, u, `Te invito https://vibes.gurudevelopers.dev/event/${event}`]
  );
  await admin.query(
    "insert into learning_activities values($1,'Yoga','published')",
    [activity]
  );
  await admin.query("insert into learning_enrollments values($1,$2,$3)", [
    enrollment,
    activity,
    u,
  ]);
  await admin.query(
    "insert into learning_sessions values($1,$2,now()-interval '1 day')",
    [session, activity]
  );
  await admin.query(
    "insert into learning_attendance(session_id,enrollment_id,activity_id,present) values($1,$2,$3,true)",
    [session, enrollment, activity]
  );
  await admin.query(
    "create unique index meditation_one_day on meditation_presence(user_id,presence_date);grant select,insert on meditation_presence to authenticated"
  );
  const filename = (await fs.readdir("supabase/migrations")).find((f) =>
    f.endsWith("_vibes_points.sql")
  );
  await admin.query(
    await fs.readFile(`supabase/migrations/${filename}`, "utf8")
  );
  const owner = await actor(u),
    stranger = await actor(other);
  const total = async (c = owner) =>
    Number(
      (
        await c.query(
          "select * from my_vibes_summary(date_trunc('month',now()),date_trunc('month',now())+interval '1 month')"
        )
      ).rows[0].total
    );
  await check("historical actions award their original points once", async () =>
    assert.equal(await total(), 165)
  );
  await check("another user cannot read my history or summary", async () => {
    assert.equal(
      (await stranger.query("select * from vibes_ledger")).rowCount,
      0
    );
    assert.equal(await total(stranger), 0);
  });
  await check("clients cannot forge, modify or delete points", async () => {
    for (const sql of [
      "insert into vibes_ledger(user_id) values($1)",
      "update vibes_ledger set points=1000 where user_id=$1",
      "delete from vibes_ledger where user_id=$1",
    ])
      await assert.rejects(owner.query(sql, [u]));
    await assert.rejects(
      owner.query(
        "select private.vibes_credit($1,'share','fake','fake',now())",
        [u]
      )
    );
  });
  await check(
    "replayed historical actions and shares do not award twice",
    async () => {
      await admin.query(
        "select private.vibes_completed_challenge($1,$2,now())",
        [u, challenge]
      );
      await admin.query(
        "insert into messages(match_id,sender_id,text) values($1,$2,$3)",
        [match, u, `https://vibes.gurudevelopers.dev/event/${event}`]
      );
      assert.equal(await total(), 165);
    }
  );
  await check(
    "meditation awards once and updates cannot farm points",
    async () => {
      await admin.query(
        "insert into meditation_presence(user_id,presence_date,duration_minutes) values($1,current_date,10)",
        [u]
      );
      await admin.query(
        "update meditation_presence set duration_minutes=20 where user_id=$1",
        [u]
      );
      assert.equal(await total(), 175);
    }
  );
  await check(
    "future and backdated meditation inserts do not award",
    async () => {
      await admin.query(
        "insert into meditation_presence(user_id,presence_date,duration_minutes) values($1,current_date+4,10),($1,current_date-40,10)",
        [u]
      );
      assert.equal(await total(), 175);
    }
  );
  await check(
    "ordinary messages, invalid links and forged senders do not award",
    async () => {
      for (const body of [
        "Hola",
        `https://evil.test/event/${event}`,
        `https://vibes.gurudevelopers.dev/event/${event}extra`,
        `https://vibes.gurudevelopers.dev/event/${randomUUID()}`,
      ])
        await admin.query(
          "insert into messages(match_id,sender_id,text) values($1,$2,$3)",
          [match, u, body]
        );
      await admin.query(
        "insert into messages(match_id,sender_id,text) values($1,$2,$3)",
        [match, randomUUID(), `https://vibes.gurudevelopers.dev/event/${event}`]
      );
      assert.equal(await total(), 175);
    }
  );
  await check("concurrent shares stop at three per UTC day", async () => {
    const links = [];
    for (let i = 0; i < 5; i++) {
      const id = randomUUID();
      await admin.query(
        "insert into events values($1,'Otra actividad','event')",
        [id]
      );
      links.push(`https://vibes.gurudevelopers.dev/event/${id}`);
    }
    const connections = [];
    for (let i = 0; i < 5; i++) {
      const c = cluster.getPgClient("postgres", "127.0.0.1");
      await c.connect();
      connections.push(c);
    }
    try {
      await Promise.all(
        connections.map((c, i) =>
          c.query(
            "insert into messages(match_id,sender_id,text) values($1,$2,$3)",
            [match, u, links[i]]
          )
        )
      );
    } finally {
      await Promise.all(connections.map((c) => c.end()));
    }
    assert.equal(await total(), 190);
  });
  await check(
    "attendance correction removes points and restore awards only once",
    async () => {
      await admin.query(
        "update learning_attendance set present=false where session_id=$1",
        [session]
      );
      assert.equal(await total(), 140);
      await admin.query(
        "update learning_attendance set present=true where session_id=$1",
        [session]
      );
      await admin.query(
        "update learning_attendance set present=true where session_id=$1",
        [session]
      );
      assert.equal(await total(), 190);
    }
  );
  await check(
    "challenge requires all distinct days and future days do not count",
    async () => {
      const c = randomUUID();
      await admin.query(
        "insert into challenges values($1,'Nuevo',2,'public',$2)",
        [c, u]
      );
      await admin.query("insert into challenge_participants values($1,$2)", [
        u,
        c,
      ]);
      await admin.query(
        "insert into challenge_checkins(user_id,challenge_id,checkin_date) values($1,$2,current_date),($1,$2,current_date+10)",
        [u, c]
      );
      assert.equal(await total(), 190);
      await admin.query(
        "insert into challenge_checkins(user_id,challenge_id,checkin_date) values($1,$2,current_date-1)",
        [u, c]
      );
      assert.equal(await total(), 290);
    }
  );
  await check(
    "summary month boundaries and contribution count are computed on server",
    async () => {
      const s = (
        await owner.query(
          "select * from my_vibes_summary(now()+interval '1 month',now()+interval '2 months')"
        )
      ).rows[0];
      assert.equal(Number(s.total), 290);
      assert.equal(Number(s.this_month), 0);
      assert.equal(Number(s.contributions), 9);
    }
  );
  await check(
    "registration RPC uses the signed-in user and is idempotent",
    async () => {
      const r = await stranger.query(
        "select register_vibes_meditation(10,'silent') as inserted"
      );
      assert.equal(r.rows[0].inserted, true);
      assert.equal(await total(stranger), 10);
      assert.equal(
        (
          await stranger.query(
            "select register_vibes_meditation(20,'guided') as inserted"
          )
        ).rows[0].inserted,
        false
      );
      assert.equal(await total(stranger), 10);
      await assert.rejects(
        stranger.query("select register_vibes_meditation(999,'silent')")
      );
    }
  );
  await admin.query(
    "create table private.learning_external_schedule(id text primary key,title text);insert into private.learning_external_schedule values('clase_001','Yoga del catálogo')"
  );
  const externalMigration = (await fs.readdir("supabase/migrations")).find(
    (f) => f.endsWith("_vibes_external_class_shares.sql")
  );
  await admin.query(
    await fs.readFile(`supabase/migrations/${externalMigration}`, "utf8")
  );
  await check(
    "existing external classes award share points but invented classes do not",
    async () => {
      await admin.query(
        "insert into messages(match_id,sender_id,text) values($1,$2,$3)",
        [match, other, "com.gurudevelopers.vibes://class/clase_001"]
      );
      assert.equal(await total(stranger), 15);
      await admin.query(
        "insert into messages(match_id,sender_id,text) values($1,$2,$3)",
        [match, other, "com.gurudevelopers.vibes://class/clase_inventada"]
      );
      assert.equal(await total(stranger), 15);
    }
  );
  await check(
    "missing authentication cannot register meditation or read another balance",
    async () => {
      const guest = await actor("");
      await assert.rejects(
        guest.query("select register_vibes_meditation(10,'silent')")
      );
      assert.equal(await total(guest), 0);
    }
  );
  console.log(`${passed} database checks passed`);
} finally {
  await Promise.all(clients.map((c) => c.end()));
  await admin?.end();
  await cluster.stop();
}
