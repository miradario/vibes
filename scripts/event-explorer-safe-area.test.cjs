const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');

// Render the actual sheet boundary without mounting its data-driven children.
function render(os, insets, mode) {
  const token = new Proxy(function () {}, { get: () => token, apply: () => token });
  const exports = {};
  const react = { createElement: (type, props, ...children) => ({ type, props, children }) };
  const code = ts.transpileModule(fs.readFileSync('components/EventExplorerSheet.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { exports, require: name => {
    if (name === 'react') return react;
    if (name === '../src/theme/tokens') return new Proxy({}, { get: (_, key) => key === 'spacing' ? { 4: 16 } : token });
    if (name === 'react-native') return { Platform: { OS: os }, StyleSheet: { create: x => x }, useWindowDimensions: () => ({ height: 852 }) };
    if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => insets };
    return token;
  }});
  return exports.default({ mode, events: [], mapEvents: [], joinedEventIds: new Set(), loading: false }).children[0];
}
for (const mode of ['calendar', 'map']) {
  for (const insets of [{ top: 59, bottom: 34, left: 0, right: 0 }, { top: 0, bottom: 21, left: 59, right: 59 }]) {
    test(`${mode}: iOS protects all edges when native modal insets are zero (${insets.top})`, () => {
      const screen = render('ios', insets, mode);
      const style = Object.assign({}, ...[screen.props.style].flat());
      assert.equal(style.paddingTop, insets.top);
      assert.equal(style.paddingBottom, insets.bottom);
      assert.ok(style.paddingLeft >= insets.left);
      assert.ok(style.paddingRight >= insets.right);
      assert.equal(screen.props.edges.length, 0, 'do not apply native insets twice');
    });
  }
  test(`${mode}: Android retains native safe area`, () => {
    const screen = render('android', { top: 24, bottom: 24, left: 0, right: 0 }, mode);
    assert.deepEqual(Array.from(screen.props.edges), ['top', 'bottom', 'left', 'right']);
  });
}
