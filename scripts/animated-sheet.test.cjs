const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

test('typing does not replay sheet animation; close calls the latest callback once', () => {
  const hooks = [], effects = [], animations = [];
  let index = 0;
  const react = {
    createElement: () => null,
    useRef(value) { const i = index++; return hooks[i] ??= { current: value }; },
    useState(value) { const i = index++; if (!(i in hooks)) hooks[i] = value; return [hooks[i], next => { hooks[i] = next; }]; },
    useEffect(fn, deps) {
      const i = index++, previous = hooks[i];
      if (!previous || deps.some((dep, j) => !Object.is(dep, previous.deps[j]))) {
        effects.push(() => { previous?.cleanup?.(); hooks[i] = { deps, cleanup: fn() }; });
      }
    },
  };
  const native = {
    Animated: {
      Value: class { setValue() {} }, timing: () => ({}),
      parallel: () => {
        const animation = { start(callback) { animation.callback = callback; animations.push(animation); }, stop() {} };
        return animation;
      },
    },
    StyleSheet: { create: styles => styles },
  };
  const output = {};
  const source = ts.transpileModule(fs.readFileSync('components/AnimatedSheetModal.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(source, { exports: output, require: name => {
    if (name === 'react') return react;
    if (name === 'react-native') return native;
    return { vibesTheme: { motion: { modal: { offsetY: 100 } } } };
  }});
  const render = (visible, onClosed) => {
    index = 0;
    output.default({ visible, onClose() {}, onClosed, children: 'field' });
    while (effects.length) effects.shift()();
  };
  render(false, () => {});
  assert.equal(animations.length, 0);
  render(true, () => {});
  for (let i = 0; i < 10; i++) render(true, () => {});
  assert.equal(animations.length, 1, 'only one opening animation across keystrokes and mounted-state render');
  let oldCalls = 0, latestCalls = 0;
  render(false, () => oldCalls++);
  render(false, () => latestCalls++);
  assert.equal(animations.length, 2, 'callback updates do not restart closing');
  animations[1].callback({ finished: true });
  render(false, () => latestCalls++);
  assert.equal(oldCalls, 0);
  assert.equal(latestCalls, 1);
  assert.equal(animations.length, 2);
  render(true, () => {});
  assert.equal(animations.length, 3, 'sheet can reopen normally');
});
