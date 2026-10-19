const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const moduleUnderTest = { exports: {} };
new Function('module', 'exports', ts.transpileModule(
  fs.readFileSync('src/lib/revealFocusedInput.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText)(moduleUnderTest, moduleUnderTest.exports);
const { revealFocusedInput } = moduleUnderTest.exports;

test('reveals a field after the keyboard shrinks the viewport, without moving an already visible field', () => {
  const calls = [];
  let height = 800;
  const input = { isFocused: () => true, measureInWindow: cb => cb(0, 600, 300, 56) };
  const scroll = { getNativeScrollRef: () => ({ measureInWindow: cb => cb(0, 40, 400, height) }), scrollTo: x => calls.push(x) };
  const focused = { current: input };
  revealFocusedInput(input, scroll, { current: 100 }, focused);
  assert.equal(calls.length, 0);
  height = 400;
  revealFocusedInput(input, scroll, { current: 100 }, focused);
  assert.deepEqual(calls, [{ y: 332, animated: false }]);
});

test('ignores late measurements when focus changes or the keyboard is dismissed', () => {
  let finish;
  let isFocused = true;
  const calls = [];
  const input = { isFocused: () => isFocused, measureInWindow: cb => { finish = cb; } };
  const scroll = { getNativeScrollRef: () => ({ measureInWindow: cb => cb(0, 0, 400, 300) }), scrollTo: x => calls.push(x) };
  const focused = { current: input };
  revealFocusedInput(input, scroll, { current: 0 }, focused);
  focused.current = null;
  finish(0, 600, 300, 56);
  focused.current = input;
  revealFocusedInput(input, scroll, { current: 0 }, focused);
  isFocused = false;
  finish(0, 600, 300, 56);
  assert.deepEqual(calls, []);
});
