const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/homeActivity.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exportsObject, Set });
const { getNewConnections, getHomeUnreadSummary } = exportsObject;
test('unread total includes private, community, event and challenge groups', () => {
  const result = getHomeUnreadSummary([{ kind: 'direct', unread_count: 2 }, { kind: 'group', unread_count: '3' }, { kind: 'event', unread_count: 4 }, { kind: 'challenge', unread_count: 1 }]);
  assert.equal(result.total, 10); assert.equal(result.direct, 2); assert.equal(result.groups, 8);
});
test('empty, negative and invalid counts do not produce a notification', () => {
  assert.equal(getHomeUnreadSummary([]).total, 0);
  assert.equal(getHomeUnreadSummary([{ kind: 'direct', unread_count: -1 }, { kind: 'group', unread_count: 'NaN' }, { kind: 'unknown', unread_count: 9 }]).total, 0);
});
test('connection remains new until opened even when someone already sent a message', () => {
  const matches = [{ id: 'a', isActive: true, lastMessage: 'Hola' }, { id: 'b', isActive: true, lastMessage: null }, { id: 'c', isActive: false }];
  assert.equal(getNewConnections(matches, []).length, 2);
  const remaining = getNewConnections(matches, ['a', 'a', 'c']);
  assert.equal(remaining.length, 1); assert.equal(remaining[0].id, 'b');
  assert.equal(getNewConnections(matches, ['a', 'b']).length, 0);
});
