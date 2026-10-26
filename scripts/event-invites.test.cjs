const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const socialShare = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/socialShare.ts', 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText, {exports: socialShare, require: () => ({Share: {share: async (payload) => payload}})});
const api = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/eventInvites.ts', 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText, {exports: api, require: () => socialShare});
const id = '1278758f-8641-4c36-b2d2-6c7d5bb47ae9';

test('event invitation includes title, date and a link that opens the same event', () => {
 const body = api.buildEventInvitation({id, type: 'event', title: 'Encuentro al aire libre', date: 'Domingo a las 10'});
 assert.ok(body.includes('Encuentro al aire libre'));
 assert.ok(body.includes('Domingo a las 10'));
 assert.equal(api.getInvitedEventId(body), id);
});
test('missing date does not leak null or undefined into the invitation', () => {
 const body = api.buildEventInvitation({id, type: 'event', title: 'Encuentro'});
 assert.ok(!body.includes('undefined') && !body.includes('null'));
 assert.equal(body.split('\n').length, 2);
});
test('invalid event and challenge cannot create event invitations', () => {
 assert.throws(() => api.buildEventInvitation({type: 'event', title: 'Sin guardar'}));
 assert.throws(() => api.buildEventInvitation({id, type: 'challenge', title: 'Desafío'}));
});
test('ordinary chat, external domains and malformed links do not create event buttons', () => {
 for (const body of ['Hola', `https://another.example/event/${id}`, `https://vibes.gurudevelopers.dev.evil/event/${id}`, 'https://vibes.gurudevelopers.dev/event/invalid', `https://vibes.gurudevelopers.dev/challenge/${id}`, `https://vibes.gurudevelopers.dev/event/${id}extra`]) assert.equal(api.getInvitedEventId(body), null);
});

// Android shares message text; the URL field alone is insufficient there.
test('external invitation includes the event URL in message text for Android', async () => {
 const shared = await socialShare.shareEventInvite({id, type: 'event', title: 'Encuentro', date: 'Domingo'});
 assert.ok(shared.message.includes(`https://vibes.gurudevelopers.dev/event/${id}`));
 assert.equal(api.getInvitedEventId(shared.message), id);
});

test('challenge invitations open the matching challenge instead of an event', () => {
 const body = api.buildChallengeInvitation({id, type: 'challenge', title: 'Una pausa', durationDays: 7});
 assert.ok(body.includes('Una pausa'));
 assert.ok(body.includes('7 días'));
 assert.equal(api.getInvitedChallengeId(body), id);
 assert.equal(api.getInvitedEventId(body), null);
 assert.throws(() => api.buildChallengeInvitation({id, type: 'event'}));
 assert.throws(() => api.buildChallengeInvitation({type: 'challenge'}));
});
test('challenge invitation parser rejects external domains and malformed IDs', () => {
 for (const body of ['Hola', `https://another.example/challenge/${id}`, `https://vibes.gurudevelopers.dev.evil/challenge/${id}`, `https://vibes.gurudevelopers.dev/challenge/${id}extra`, `https://vibes.gurudevelopers.dev/event/${id}`]) assert.equal(api.getInvitedChallengeId(body), null);
});

test('challenge chat hides the URL but retains the destination for its button', () => {
 const body = api.buildChallengeInvitation({id, type: 'challenge', title: 'Una pausa'});
 assert.ok(api.getInvitationDisplayText(body).includes('Una pausa'));
 assert.ok(!api.getInvitationDisplayText(body).includes('https://'));
 assert.equal(api.getInvitedChallengeId(body), id);
 assert.equal(api.getInvitationDisplayText('Hola https://another.example'), 'Hola https://another.example');
 assert.equal(api.getInvitationDisplayText(`https://vibes.gurudevelopers.dev/challenge/${id}`), '');
});

test('class invitation opens the same class and hides its internal destination in chat',()=>{
 const body=api.buildClassInvitation({id:'clase_001',title:'Yoga',date:'Lunes 09:00',url:'https://example.org/clases'});
 assert.equal(api.getInvitedClassId(body),'clase_001');
 assert.ok(body.includes('Te invito a "Yoga"')); assert.ok(body.includes('Lunes 09:00'));
 assert.ok(!api.getInvitationDisplayText(body).includes('com.gurudevelopers.vibes://'));
});
test('class invitation parser rejects another scheme and oversized ids',()=>{
 assert.equal(api.getInvitedClassId('https://evil.example/class/clase_001'),null);
 assert.equal(api.getInvitedClassId('com.gurudevelopers.vibes://class/'+ 'a'.repeat(81)),null);
});
