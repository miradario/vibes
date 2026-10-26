const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function harness() {
  const source = ts.createSourceFile('screen.tsx', fs.readFileSync('screens/ChallengeDetailScreen.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const handlers = [];
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ['handleCompletionShare', 'handleCompletionShareClosed'].includes(node.name.getText(source))) handlers.push(`const ${node.getText(source)};`);
    ts.forEachChild(node, visit);
  }
  visit(source);
  const calls = [];
  const context = { event: { id: 'test' }, challenge: { title: 'Test' }, isSharing: false,
    pendingCompletionShare: { current: false }, completionImageReady: true,
    completionCardRef: { current: {} }, completionImageUri: { current: null },
    captureRef: async () => { calls.push(['capture']); return 'file:///completion.png'; },
    releaseCapture: uri => calls.push(['release', uri]),
    setCompletionShareVisible: value => calls.push(['visible', value]),
    setIsSharing: value => calls.push(['sharing', value]),
    shareChallengeCompletion: async (...args) => calls.push(['native-share', ...args]),
    t: key => key, Alert: { alert: () => calls.push(['error']) } };
  vm.createContext(context);
  vm.runInContext(ts.transpileModule(handlers.join('\n') + '\nglobalThis.press = handleCompletionShare; globalThis.closed = typeof handleCompletionShareClosed === "undefined" ? () => {} : handleCompletionShareClosed;', { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context);
  return { context, calls };
}

test('completion sharing waits for modal dismissal and opens exactly once', async () => {
  const { context, calls } = harness();
  await context.press();
  await context.press();
  assert.equal(calls.filter(call => call[0] === 'native-share').length, 0, 'native share must wait for dismissal');
  await context.closed();
  await context.closed();
  assert.equal(calls.filter(call => call[0] === 'native-share').length, 1);
  assert.equal(calls.find(call => call[0] === 'native-share')[3], 'file:///completion.png');
  assert.equal(calls.filter(call => call[0] === 'capture').length, 1);
  assert.equal(calls.filter(call => call[0] === 'release').length, 1);
});
test('dismissing without pressing Share does not open native sharing', async () => {
  const { context, calls } = harness();
  await context.closed();
  assert.equal(calls.length, 0);
});

test('capture failure keeps the preview open and allows retry', async () => {
  const { context, calls } = harness();
  context.captureRef = async () => { throw new Error('capture failed'); };
  await context.press();
  assert.equal(context.pendingCompletionShare.current, false);
  assert.ok(calls.some(call => call[0] === 'error'));
  assert.ok(!calls.some(call => call[0] === 'visible' || call[0] === 'native-share'));
});
test('sharing waits for the challenge image to display', async () => {
  const { context, calls } = harness();
  context.completionImageReady = false;
  await context.press();
  assert.equal(calls.length, 0);
});
