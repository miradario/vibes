// Opt-in integration test against the selected Supabase project. Creates and removes only its own fixtures.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const env = Object.fromEntries(fs.readFileSync('.env','utf8').split('\n').filter(line => /^[A-Z_]+=/.test(line)).map(line => { const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1).replace(/^["']|["']$/g,'')]; }));
const keys = JSON.parse(fs.readFileSync(process.env.VIBES_TEST_KEYS_FILE,'utf8'));
const service = keys.find(key => key.name === 'service_role').api_key;
const options = {auth:{persistSession:false,autoRefreshToken:false},global:{fetch: async (input, init) => { const url=String(input); console.log('Checking', init?.method ?? 'GET', new URL(url).pathname); return fetch(input,{...init,signal:AbortSignal.timeout(20000)}); }}};
const admin = createClient(env.EXPO_PUBLIC_SUPABASE_URL, service, options);
const bucket = 'challenge-day-media';
const users=[]; const clients=[]; const paths=[]; let challenge;
const ok = result => { if(result.error) throw new Error(result.error.message); return result.data; };
(async () => {
 try {
  for (const name of ['owner','member','outsider']) {
   const email = `vibes-day-test-${name}-${randomUUID()}@example.invalid`; const password=randomUUID()+randomUUID();
   const created = ok(await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{display_name:'Prueba temporal de días'}}));
   users.push(created.user.id); fs.writeFileSync('/tmp/vibes-day-test-fixtures.json',JSON.stringify({users,challenge,paths}),{mode:0o600});
   const client=createClient(env.EXPO_PUBLIC_SUPABASE_URL,env.EXPO_PUBLIC_SUPABASE_ANON_KEY,options);
   ok(await client.auth.signInWithPassword({email,password})); clients.push(client);
  }
  const [owner,member,outsider]=clients;
  challenge=ok(await admin.from('challenges').insert({title:'Prueba temporal de contenido de días',visibility:'private',duration_days:2,created_by:users[0]}).select('id').single()).id; fs.writeFileSync('/tmp/vibes-day-test-fixtures.json',JSON.stringify({users,challenge,paths}),{mode:0o600});
  ok(await admin.from('challenge_participants').insert({challenge_id:challenge,user_id:users[1]}));
  const save=(client,attachments,revision,title='Día de prueba')=>client.rpc('save_challenge_day',{target_challenge:challenge,target_day:1,new_title:title,new_description:'Consigna de prueba',new_attachments:attachments,expected_revision:revision});
  const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
  const wav=Buffer.alloc(44+44100); wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(22050,24);wav.writeUInt32LE(44100,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(44100,40);
  const attachments=[];
  for(const [type,mime,ext,bytes] of [['photo','image/png','png',image],['audio','audio/wav','wav',wav]]) {
   const id=randomUUID();const path=`${challenge}/1/${users[0]}/${id}.${ext}`;paths.push(path);
   ok(await owner.storage.from(bucket).upload(path,bytes,{contentType:mime}));
   assert.ok((await outsider.storage.from(bucket).createSignedUrl(path,60)).error,'outsider must not read uploaded object');
   assert.ok((await member.storage.from(bucket).createSignedUrl(path,60)).error,'member must not see unpublished draft');
   attachments.push({id,type,name:`Prueba.${ext}`,mime,size:bytes.length,path});
  }
  attachments.push({id:randomUUID(),type:'link',name:'YouTube',url:'https://www.youtube.com/watch?v=M7lc1UVf-VE'});
  const saved=ok(await save(owner,attachments,0));assert.equal(saved.revision,1);
  const read=ok(await member.from('challenge_days').select('*').eq('challenge_id',challenge));assert.equal(read[0].attachments.length,3);
  for(const item of attachments.filter(a=>a.path)) {
   const signed=ok(await member.storage.from(bucket).createSignedUrl(item.path,60));
   const response=await fetch(signed.signedUrl);assert.equal(response.status,200);assert.equal((await response.arrayBuffer()).byteLength,item.size);
  }
  const denied=await save(member,[],1);assert.ok(denied.error);
  assert.equal(ok(await outsider.from('challenge_days').select('*').eq('challenge_id',challenge)).length,0);
  assert.ok((await outsider.storage.from(bucket).upload(`${challenge}/1/${users[2]}/${randomUUID()}.png`,image,{contentType:'image/png'})).error);
  // Referenced media cannot be deleted through the user Storage API.
  await owner.storage.from(bucket).remove([paths[0]]);
  assert.ok(ok(await member.storage.from(bucket).createSignedUrl(paths[0],60)).signedUrl);
  assert.ok((await save(owner,attachments,0)).error,'stale revision must fail');
  const reordered=ok(await save(owner,[attachments[2],attachments[1]],1));assert.equal(reordered.attachments[0].type,'link');
  ok(await owner.storage.from(bucket).remove([paths[0]]));assert.ok((await owner.storage.from(bucket).createSignedUrl(paths[0],60)).error);
  console.log('PASS: authenticated photo/audio uploads, persisted ordering, signed downloads, draft isolation, creator-only save, stale revisions, referenced-file protection and attachment removal');
 } finally {
  if(paths.length) ok(await admin.storage.from(bucket).remove(paths));
  if(challenge) ok(await admin.from('challenges').delete().eq('id',challenge));
  for(const id of users) ok(await admin.auth.admin.deleteUser(id));
  for(const client of clients) await client.auth.signOut({scope:'local'});
  console.log('Temporary test accounts, challenge and media cleaned up.');
 }
})().catch(error=>{ console.error(error.message);process.exitCode=1; });
