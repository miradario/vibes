const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function fixture(os, inline = false) {
  const slots = [], effects = [], animations = [];
  let cursor = 0, closed = 0;
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useRef: value => { const i = cursor++; return slots[i] ??= { current: value }; },
    useState: value => { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], next => { slots[i] = next; }]; },
    useEffect: (effect, deps) => {
      const i = cursor++, previous = slots[i];
      if (!previous || deps.some((value, index) => value !== previous[index])) effects.push(effect);
      slots[i] = deps;
    },
  };
  react.default = react;
  class Value { constructor(value) { this.value = value; } setValue(value) { this.value = value; } }
  const native = {
    Platform: { OS: os }, Modal: 'Modal', KeyboardAvoidingView: 'KeyboardAvoidingView', TouchableOpacity: 'TouchableOpacity',
    StyleSheet: { create: styles => styles, absoluteFillObject: {} },
    Animated: { Value, View: 'Animated.View', timing: () => ({}), parallel: () => ({ start: cb => { if (cb) animations.push(cb); }, stop() {} }) },
  };
  const api = {};
  const code = ts.transpileModule(fs.readFileSync('components/AnimatedSheetModal.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText;
  vm.runInNewContext(code, { exports: api, require: name => name === 'react' ? react : name === 'react-native' ? native : { vibesTheme: { colors: {}, motion: { modal: {} } } } });
  return {
    render(visible) { cursor = 0; const tree = api.default({ visible, inline, onClose() {}, onClosed() { closed++; } }); while (effects.length) effects.shift()(); return tree; },
    finish() { animations.shift()({ finished: true }); },
    count: () => closed,
  };
}
test('Android notifies after the closing render removes the modal', () => {
  const f = fixture('android'); f.render(true); f.render(false); f.finish();
  assert.equal(f.count(), 0);
  assert.equal(f.render(false), null);
  assert.equal(f.count(), 1);
  f.render(false); assert.equal(f.count(), 1);
});
test('iOS waits for native dismissal before launching the next photo window', () => {
  const f = fixture('ios'); f.render(true); f.render(false); f.finish();
  const tree = f.render(false);
  assert.equal(tree.props.visible, false); assert.equal(f.count(), 0);
  tree.props.onDismiss(); assert.equal(f.count(), 1);
  tree.props.onDismiss(); assert.equal(f.count(), 1);
});
test('inline sheets notify after removal on iOS without requiring a native dismissal', () => {
  const f = fixture('ios', true); f.render(true); f.render(false); f.finish();
  assert.equal(f.render(false), null); assert.equal(f.count(), 1);
});
test('an initially hidden sheet does not notify a close', () => {
  const f = fixture('ios'); const tree = f.render(false); tree.props.onDismiss(); assert.equal(f.count(), 0);
});
