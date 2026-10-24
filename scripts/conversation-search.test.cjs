const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const moduleUnderTest = { exports: {} };
const code = ts.transpileModule(fs.readFileSync('src/lib/conversationSearch.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
new Function('module', 'exports', code)(moduleUnderTest, moduleUnderTest.exports);
const { matchesConversationSearch: matches } = moduleUnderTest.exports;
test('empty search keeps conversations with missing previews', () => {
  assert.equal(matches('  ', 'Ana', null), true);
});
test('search ignores case and accents and matches all words', () => {
  assert.equal(matches('JOSE perez', 'José Pérez'), true);
  assert.equal(matches('jose ana', 'José Pérez'), false);
});
test('search covers the last message and group titles', () => {
  assert.equal(matches('mañana', 'Ana', 'Nos vemos mañana'), true);
  assert.equal(matches('meditacion', 'Grupo de meditación'), true);
  assert.equal(matches('yoga', 'Grupo de meditación', null), false);
});
