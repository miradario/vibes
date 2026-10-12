// Disposable PostgreSQL integration suite. No production connection or fixtures.
// NODE_PATH=<directory containing pg and embedded-postgres> node scripts/community-invitations-db.test.cjs
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const EmbeddedPostgres = require('embedded-postgres').default;
const { Client } = require('pg');

async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibes-invitations-db-'));
  const port = 55487;
  const db = new EmbeddedPostgres({ databaseDir: dir, user: 'postgres', password: 'local-test', port, persistent: false });
  let admin;
  const clients = [];
  const users = [1,2,3,4].map(n => `eb210000-0000-4000-8000-00000000000${n}`);
  let checks = 0;
  const check = (name, fn) => Promise.resolve().then(fn).then(() => { checks++; console.log(`PASS ${name}`); });
  const actor = async (id, role = 'authenticated') => {
    const client = new Client({ host: '127.0.0.1', port, user: 'postgres', password: 'local-test', database: 'postgres' });
    await client.connect(); clients.push(client);
    await client.query(`set role ${role}`);
    if (id) await client.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    return client;
  };
  try {
    await db.initialise(); await db.start();
    admin = db.getPgClient(); await admin.connect();
    await admin.query(`
      create role authenticated; create role anon; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated,anon;
      grant execute on function auth.uid() to authenticated,anon;
      create table public.matches(user1_id uuid,user2_id uuid,is_active boolean default true);
      create publication supabase_realtime;
    `);
    await admin.query('insert into auth.users select unnest($1::uuid[])', [users]);
    await admin.query('insert into matches(user1_id,user2_id) values($1,$2),($1,$3)', users.slice(0,3));
    await admin.query(fs.readFileSync('supabase/migrations/20260915120000_create_community_groups.sql','utf8'));
    await admin.query(`alter table community_group_members add column joined_at timestamptz not null default now();
      alter table community_group_messages add column message_kind text not null default 'message';`);
    // Already-existing groups and memberships must survive the new migration.
    const existing = (await admin.query("insert into community_groups(name,created_by) values('Existing',$1) returning id", [users[0]])).rows[0].id;
    await admin.query('insert into community_group_members values($1,$2,now()),($1,$3,now())', [existing,users[0],users[1]]);
    await admin.query(fs.readFileSync('supabase/migrations/20261012212622_community_group_invitations.sql','utf8'));
    const owner = await actor(users[0]); const invited = await actor(users[1]);
    const other = await actor(users[2]); const outsider = await actor(users[3]); const anon = await actor(null,'anon');
    await check('existing members preserved', async () => assert.equal((await invited.query('select * from community_groups where id=$1',[existing])).rowCount,1));
    const group = (await owner.query("select create_community_group('QA invitations','Test',$1::uuid[]) as id", [[users[1],users[1],users[2]]])).rows[0].id;
    const inviteId = (await invited.query('select id from community_group_invitations where group_id=$1',[group])).rows[0].id;
    const otherId = (await other.query('select id from community_group_invitations where group_id=$1',[group])).rows[0].id;
    await owner.query("insert into community_group_messages(group_id,sender_id,body) values($1,$2,'Before acceptance')",[group,users[0]]);
    await check('creation adds only owner and deduplicates invitees', async () => {
      assert.equal((await admin.query('select * from community_group_members where group_id=$1',[group])).rowCount,1);
      assert.equal((await admin.query('select * from community_group_invitations where group_id=$1',[group])).rowCount,2);
    });
    await check('pending invite sees neither group, members nor messages', async () => {
      for (const table of ['community_groups','community_group_members','community_group_messages']) {
        const column = table==='community_groups'?'id':'group_id';
        assert.equal((await invited.query(`select * from ${table} where ${column}=$1`,[group])).rowCount,0);
      }
      await assert.rejects(invited.query("insert into community_group_messages(group_id,sender_id,body) values($1,$2,'Unauthorized')",[group,users[1]]));
    });
    await check('outsider cannot see or answer invitations', async () => {
      assert.equal((await outsider.query('select * from community_group_invitations')).rowCount,0);
      await assert.rejects(outsider.query('select respond_community_group_invitation($1,true)',[inviteId]));
      await assert.rejects(owner.query('select respond_community_group_invitation($1,true)',[inviteId]));
    });
    await check('direct client writes and anonymous RPCs forbidden', async () => {
      await assert.rejects(invited.query("update community_group_invitations set status='accepted' where id=$1",[inviteId]));
      await assert.rejects(invited.query('delete from community_group_invitations where id=$1',[inviteId]));
      await assert.rejects(invited.query('insert into community_group_members(group_id,user_id) values($1,$2)',[group,users[1]]));
      await assert.rejects(invited.query("insert into community_group_invitations(group_id,invitee_id,invited_by,group_name,group_description) values($1,$2,$3,'Forged','')",[group,users[1],users[0]]));
      await assert.rejects(anon.query('select * from community_group_invitations'));
      await assert.rejects(anon.query('select respond_community_group_invitation($1,true)',[inviteId]));
      await assert.rejects(anon.query("select create_community_group('Forged','',$1::uuid[])",[[users[1]]]));
    });
    await check('concurrent acceptance creates exactly one membership', async () => {
      const concurrent = await actor(users[1]);
      await Promise.all([invited,concurrent].map(c => c.query('select respond_community_group_invitation($1,true)',[inviteId])));
      assert.equal((await admin.query('select * from community_group_members where group_id=$1 and user_id=$2',[group,users[1]])).rowCount,1);
      assert.equal((await invited.query('select * from community_group_messages where group_id=$1',[group])).rowCount,1);
      await invited.query("insert into community_group_messages(group_id,sender_id,body) values($1,$2,'Accepted member')",[group,users[1]]);
    });
    await check('decline is idempotent and never grants access', async () => {
      await other.query('select respond_community_group_invitation($1,false)',[otherId]);
      await other.query('select respond_community_group_invitation($1,false)',[otherId]);
      assert.equal((await other.query('select * from community_group_messages where group_id=$1',[group])).rowCount,0);
      await assert.rejects(other.query('select respond_community_group_invitation($1,true)',[otherId]));
    });
    await check('accept and decline race resolves to a single decision', async () => {
      const raceGroup = (await owner.query("select create_community_group('Race','',$1::uuid[]) as id",[[users[1]]])).rows[0].id;
      const raceId = (await invited.query('select id from community_group_invitations where group_id=$1',[raceGroup])).rows[0].id;
      const concurrent = await actor(users[1]);
      const results = await Promise.allSettled([invited.query('select respond_community_group_invitation($1,true)',[raceId]),concurrent.query('select respond_community_group_invitation($1,false)',[raceId])]);
      assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
      const status = (await admin.query('select status from community_group_invitations where id=$1',[raceId])).rows[0].status;
      assert.equal((await admin.query('select * from community_group_members where group_id=$1 and user_id=$2',[raceGroup,users[1]])).rowCount,status==='accepted'?1:0);
    });
    await check('cannot invite nonconnections or inactive connections', async () => {
      await assert.rejects(owner.query("select create_community_group('Invalid','',$1::uuid[])",[[users[3]]]));
      await admin.query('update matches set is_active=false where user2_id=$1',[users[2]]);
      await assert.rejects(owner.query("select create_community_group('Inactive','',$1::uuid[])",[[users[2]]]));
    });
    await check('replaying accepted invitation after leaving does not rejoin', async () => {
      await admin.query('delete from community_group_members where group_id=$1 and user_id=$2',[group,users[1]]);
      await invited.query('select respond_community_group_invitation($1,true)',[inviteId]);
      assert.equal((await invited.query('select * from community_groups where id=$1',[group])).rowCount,0);
    });
    console.log(`${checks} PostgreSQL integration checks passed`);
  } finally {
    await Promise.all(clients.map(c=>c.end()));
    if (admin) await admin.end();
    await db.stop();
    fs.rmSync(dir,{recursive:true,force:true});
  }
}
main().catch(error => { console.error(error); process.exitCode=1; });
