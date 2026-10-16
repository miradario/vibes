const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function mount(platform, initialHeight = 800, initialY = 0) {
  const slots = [], effects = [], listeners = {};
  let cursor = 0, height = initialHeight, y = initialY;
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useRef: value => { const i = cursor++; return slots[i] ??= { current: value }; },
    useState: value => { const i = cursor++; slots[i] ??= { value }; return [slots[i].value, next => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next; }]; },
    useCallback: fn => fn, useEffect: fn => effects.push(fn),
  }; React.default = React;
  const imports = {
    react: React,
    'react-native': { View: 'View', Platform: { OS: platform }, Keyboard: {
      metrics: () => null, dismiss() {},
      addListener: (name, fn) => { listeners[name] = fn; return { remove: () => delete listeners[name] }; },
    } },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 24, bottom: 20 }) },
    './AnimatedSheetModal': { default: 'Sheet' },
  };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('components/KeyboardSheetModal.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText;
  new Function('require', 'module', 'exports', 'requestAnimationFrame', code)(name => imports[name], module, module.exports, fn => fn());
  function render(visible = true) {
    cursor = 0;
    const tree = module.exports.default({ visible, onClose() {} });
    const viewport = tree.props.children[0];
    viewport.props.ref.current = { measureInWindow: fn => fn(0, y, 400, height) };
    return tree;
  }
  render(); const cleanups = effects.splice(0).map(fn => fn());
  return {
    show: top => listeners[platform === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow']({ endCoordinates: { screenY: top } }),
    hide: () => listeners[platform === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'](),
    overlap: () => slots[2].value,
    resize: nextHeight => { height = nextHeight; render().props.children[0].props.onLayout(); },
    close: () => { cleanups.forEach(fn => fn?.()); effects.length = 0; render(false); effects.splice(0).forEach(fn => fn()); },
  };
}
test('Android measures the modal window even when the underlying activity has resized', () => {
  const sheet = mount('android');
  sheet.show(500); assert.equal(sheet.overlap(), 300);
  sheet.resize(500); assert.equal(sheet.overlap(), 0);
  sheet.resize(800); assert.equal(sheet.overlap(), 300);
  sheet.hide(); assert.equal(sheet.overlap(), 0);
});
test('iOS tracks keyboard frame changes and accounts for the modal origin', () => {
  const sheet = mount('ios', 780, 20);
  sheet.show(500); assert.equal(sheet.overlap(), 300);
  sheet.show(450); assert.equal(sheet.overlap(), 350);
  sheet.show(800); assert.equal(sheet.overlap(), 0);
});
test('closing the modal clears keyboard space and removes listeners', () => {
  const sheet = mount('android'); sheet.show(500);
  sheet.close(); assert.equal(sheet.overlap(), 0);
});
