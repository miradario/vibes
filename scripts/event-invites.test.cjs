const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const socialShare = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/socialShare.ts', 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText, {exports: socialShare, require: () => ({Share: {}})});
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
