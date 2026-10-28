const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync('src/lib/connectionStripVisibility.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const m = {}; new Function('exports', code)(m);
const a = { id: 'a', createdAt: '2026-10-01T00:00:00Z' }, b = { id: 'b', createdAt: '2026-10-20T00:00:00Z' };
test('a connection disappears after being seen twice', () => {
 let st = m.emptyConnectionStripState();
 assert.deepEqual(m.filterNewConnections([a, b], st), [a, b]);
 st = m.recordConnectionViews(st, ['a']);
 assert.deepEqual(m.filterNewConnections([a, b], st), [a, b]);
 st = m.recordConnectionViews(st, ['a']);
 assert.deepEqual(m.filterNewConnections([a, b], st, new Set(['a'])), [a, b], 'stays during the second view');
 assert.deepEqual(m.filterNewConnections([a, b], st), [b]);
});
test('repeated views within one session count once (hidden from the 3rd app open)', () => {
 let st = m.emptyConnectionStripState();
 const session = new Set();
 const view = () => { const fresh = m.filterNewConnections([a], st, session).map(x => x.id).filter(id => !session.has(id)); fresh.forEach(id => session.add(id)); st = m.recordConnectionViews(st, fresh); };
 view(); view(); view(); // Home, Mensajes, Home again
 assert.equal(st.views.a, 1);
 session.clear(); view(); view();
 assert.equal(st.views.a, 2);
 assert.deepEqual(m.filterNewConnections([a], st, session), [a], 'still visible in session 2');
 session.clear();
 assert.deepEqual(m.filterNewConnections([a], st, session), [], 'hidden in session 3');
});
test('dismiss hides everything until something newer appears', () => {
 const st = m.dismissConnectionStrip(m.emptyConnectionStripState(), Date.parse('2026-10-25T00:00:00Z'));
 assert.deepEqual(m.filterNewConnections([a, b], st), []);
 assert.deepEqual(m.filterRequestsAfterDismiss([a], st), []);
 const c = { id: 'c', createdAt: '2026-10-26T00:00:00Z' };
 assert.deepEqual(m.filterNewConnections([a, b, c], st), [c]);
});
test('parse tolerates garbage', () => {
 assert.deepEqual(m.parseConnectionStripState('nope'), { views: {}, dismissedAt: null });
 assert.deepEqual(m.parseConnectionStripState('{"views":{"a":2,"b":"x"},"dismissedAt":5}'), { views: { a: 2 }, dismissedAt: 5 });
});
